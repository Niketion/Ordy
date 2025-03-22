import * as MediaLibrary from 'expo-media-library';
import { PhotoData, ScanResult, PhotoType, ScanStats } from '../types';
import { findSimilarPhotos, createScanResult, updateSimilarityStats } from './similarityUtils';
import { MAX_PARALLEL_OPERATIONS } from '../constants/scanConfig';
import { assetToPhotoData } from '../services/mediaService';
import { calculateImageHash, analyzeImageColors } from '../services/photoAnalysisService';

export class BatchProcessor {
    private imageHashCache: Map<string, string>;
    private colorAnalysisCache: Map<string, {
        type: PhotoType;
        dominantColor: string;
        dominantPercent: number;
    }>;
    private processedSimilarPairs: Set<string>;
    private isScanningRef: React.MutableRefObject<boolean>;
    
    constructor(
        imageHashCache: Map<string, string>,
        colorAnalysisCache: Map<string, {
            type: PhotoType;
            dominantColor: string;
            dominantPercent: number;
        }>,
        processedSimilarPairs: Set<string>,
        isScanningRef: React.MutableRefObject<boolean>
    ) {
        this.imageHashCache = imageHashCache;
        this.colorAnalysisCache = colorAnalysisCache;
        this.processedSimilarPairs = processedSimilarPairs;
        this.isScanningRef = isScanningRef;
    }
    
    public async analyzePhoto(asset: MediaLibrary.Asset) {
        try {
            if (!this.isScanningRef.current) return null;
            
            const photoData = await assetToPhotoData(asset);
            
            const [colorAnalysis, hash] = await Promise.all([
                this.colorAnalysisCache.has(photoData.id) 
                    ? Promise.resolve(this.colorAnalysisCache.get(photoData.id)!)
                    : analyzeImageColors(photoData.uri).then(result => {
                            this.colorAnalysisCache.set(photoData.id, result);
                            return result;
                        }),
                
                this.imageHashCache.has(photoData.id)
                    ? Promise.resolve(this.imageHashCache.get(photoData.id)!)
                    : calculateImageHash(photoData.uri).then(result => {
                            this.imageHashCache.set(photoData.id, result);
                            return result;
                        })
            ]);
            
            return { photoData, colorAnalysis, hash };
        } catch (error) {
            console.error('Errore nell\'analisi della foto:', error);
            return null;
        }
    }
    
    public async parallelLimit<T>(
        tasks: (() => Promise<T>)[],
        limit: number = MAX_PARALLEL_OPERATIONS
    ): Promise<T[]> {
        const results: T[] = [];
        let index = 0;
        
        const executor = async (): Promise<void> => {
            while (index < tasks.length) {
                const currentIndex = index++;
                if (!this.isScanningRef.current) break;
                
                try {
                    const result = await tasks[currentIndex]();
                    results[currentIndex] = result;
                } catch (error) {
                    console.error(`Task ${currentIndex} failed:`, error);
                }
            }
        };
        
        const executors = Array(Math.min(limit, tasks.length))
            .fill(0)
            .map(() => executor());
        
        await Promise.all(executors);
        
        return results;
    }
    
    public async processBatch(
        batchAssets: MediaLibrary.Asset[],
        currentStats: ScanStats,
        processedCount: number
    ): Promise<{
        batchResults: ScanResult[];
        updatedStats: ScanStats;
    }> {
        try {
            console.log(`Elaborazione batch di ${batchAssets.length} foto in parallelo...`);
            
            const analysisTasks = batchAssets.map(asset => () => this.analyzePhoto(asset));
            const analysisResults = await this.parallelLimit(analysisTasks);
            
            const validResults = analysisResults.filter(result => result !== null);
            
            let newStats = { ...currentStats };
            newStats.totalProcessed = processedCount + validResults.length;
            
            for (const result of validResults) {
                if (!result) continue;
                
                const { colorAnalysis } = result;
                
                if (colorAnalysis.type === PhotoType.MONOCHROME) {
                    newStats.monochromeCount++;
                }
            }
            
            const similarityTasks = validResults.map(result => async () => {
                if (!result || !this.isScanningRef.current) return null;
                
                const { photoData, colorAnalysis, hash } = result;
                
                const { similarPhotos, highestSimilarity, isDuplicate } = await findSimilarPhotos(
                    photoData.id,
                    hash,
                    this.imageHashCache,
                    this.processedSimilarPairs
                );
                
                return {
                    photoData,
                    colorAnalysis,
                    similarPhotos,
                    highestSimilarity,
                    isDuplicate
                };
            });
            
            const similarityResults = await this.parallelLimit(
                similarityTasks, 
                Math.max(2, MAX_PARALLEL_OPERATIONS / 2)
            );
            
            const batchResults: ScanResult[] = [];
            let duplicatesFound = 0;
            let similarFound = 0;
            
            for (const result of similarityResults) {
                if (!result) continue;
                
                const { 
                    photoData, 
                    colorAnalysis, 
                    similarPhotos, 
                    highestSimilarity, 
                    isDuplicate 
                } = result;
                
                if (isDuplicate) {
                    duplicatesFound++;
                } else if (similarPhotos.length > 0) {
                    similarFound++;
                }
                
                if (colorAnalysis.type === PhotoType.MONOCHROME || similarPhotos.length > 0) {
                    batchResults.push(
                        createScanResult(photoData, colorAnalysis, similarPhotos, highestSimilarity)
                    );
                }
            }
            
            newStats = updateSimilarityStats(newStats, duplicatesFound, similarFound);
            
            console.log(`Batch completato: ${batchResults.length} risultati interessanti trovati`);
            return { batchResults, updatedStats: newStats };
        } catch (error) {
            console.error('Errore nell\'elaborazione del batch:', error);
            return { batchResults: [], updatedStats: currentStats };
        }
    }
}
