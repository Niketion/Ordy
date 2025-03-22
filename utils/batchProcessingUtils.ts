import * as MediaLibrary from 'expo-media-library';
import { PhotoData, ScanResult, PhotoType, ScanStats } from '../types';
import { calculateSimilarity } from '../services/scanService';

const SIMILARITY_THRESHOLD = 0.87;

export const processPhotoBatch = async (
    validResults: { photoData: PhotoData; colorAnalysis: any; hash: string }[],
    currentStats: ScanStats,
    totalProcessedCount: number,
    imageHashCache: Map<string, string>,
    processedSimilarPairs: Set<string>,
    isScanning: boolean,
    parallelLimit: <T>(tasks: (() => Promise<T>)[], limit: number) => Promise<T[]>,
    maxParallelOperations: number
): Promise<{
    batchResults: ScanResult[];
    newStats: ScanStats;
}> => {
    let newStats = { ...currentStats };
    newStats.totalProcessed = totalProcessedCount;
    
    for (const result of validResults) {
        if (!result) continue;
        
        const { photoData, colorAnalysis, hash } = result;
        
        if (colorAnalysis.type === PhotoType.MONOCHROME) {
            newStats.monochromeCount++;
        }
    }
    
    const similarityTasks = validResults.map(result => async () => {
        if (!result || !isScanning) return null;
        
        const { photoData, colorAnalysis, hash } = result;
        
        let similarPhotos: PhotoData[] = [];
        let highestSimilarity = 0;
        let isDuplicate = false;
        
        const existingIds = Array.from(imageHashCache.keys());
        const idsToCheck = existingIds.slice(-300);
        
        for (const existingId of idsToCheck) {
            if (existingId === photoData.id) continue;
            
            const pairId = [photoData.id, existingId].sort().join('_');
            
            if (processedSimilarPairs.has(pairId)) continue;
            
            const existingHash = imageHashCache.get(existingId);
            if (!existingHash) continue;
            
            const similarity = calculateSimilarity(hash, existingHash);
            
            if (similarity >= SIMILARITY_THRESHOLD) {
                try {
                    const existingAsset = await MediaLibrary.getAssetInfoAsync(existingId);
                    const existingPhotoData: PhotoData = {
                        uri: existingAsset.localUri || existingAsset.uri,
                        id: existingId,
                        createdAt: new Date(existingAsset.creationTime),
                        width: existingAsset.width,
                        height: existingAsset.height
                    };
                    
                    similarPhotos.push(existingPhotoData);
                    highestSimilarity = Math.max(highestSimilarity, similarity);
                    
                    processedSimilarPairs.add(pairId);
                    
                    if (similarity > 0.98) {
                        isDuplicate = true;
                    }
                } catch (error) {
                    console.log(`Non è stato possibile caricare l'asset ${existingId}`);
                }
            }
        }
        
        return {
            photoData,
            colorAnalysis,
            similarPhotos,
            highestSimilarity,
            isDuplicate
        };
    });
    
    const similarityResults = await parallelLimit(
        similarityTasks, 
        Math.max(2, maxParallelOperations / 2)
    );
    
    const batchResults: ScanResult[] = [];
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
            newStats.duplicatesFound++;
        } else if (similarPhotos.length > 0) {
            newStats.similarPhotosFound++;
        }
        
        if (colorAnalysis.type === PhotoType.MONOCHROME || similarPhotos.length > 0) {
            batchResults.push({
                photo: photoData,
                type: colorAnalysis.type,
                dominantColor: colorAnalysis.dominantColor,
                dominantPercent: colorAnalysis.dominantPercent,
                similarPhotos: similarPhotos.length > 0 ? similarPhotos : undefined,
                similarityScore: highestSimilarity > 0 ? highestSimilarity : undefined
            });
        }
    }
    
    return { batchResults, newStats };
};
