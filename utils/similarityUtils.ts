import * as MediaLibrary from 'expo-media-library';
import { PhotoData, ScanStats, ScanResult, PhotoType } from '../types';
import { SIMILARITY_THRESHOLD } from '../constants/scanConfig';
import { calculateSimilarity } from '../services/photoAnalysisService';
import { assetToPhotoData } from '../services/mediaService';

export const arePhotosSimilar = (hash1: string, hash2: string): boolean => {
    const similarity = calculateSimilarity(hash1, hash2);
    return similarity >= SIMILARITY_THRESHOLD;
};

export const arePhotosDuplicates = (hash1: string, hash2: string): boolean => {
    const similarity = calculateSimilarity(hash1, hash2);
    return similarity > 0.98;
};

export const findSimilarPhotos = async (
    targetPhotoId: string,
    targetHash: string,
    imageHashCache: Map<string, string>,
    processedSimilarPairs: Set<string>,
    maxPhotosToCheck: number = 300
): Promise<{
    similarPhotos: PhotoData[],
    highestSimilarity: number,
    isDuplicate: boolean
}> => {
    let similarPhotos: PhotoData[] = [];
    let highestSimilarity = 0;
    let isDuplicate = false;
    
    const existingIds = Array.from(imageHashCache.keys());
    const idsToCheck = existingIds.slice(-maxPhotosToCheck);
    
    for (const existingId of idsToCheck) {
        if (existingId === targetPhotoId) continue;
        
        const pairId = [targetPhotoId, existingId].sort().join('_');
        
        if (processedSimilarPairs.has(pairId)) continue;
        
        const existingHash = imageHashCache.get(existingId);
        if (!existingHash) continue;
        
        const similarity = calculateSimilarity(targetHash, existingHash);
        
        if (similarity >= SIMILARITY_THRESHOLD) {
            try {
                const existingAsset = await MediaLibrary.getAssetInfoAsync(existingId);
                const existingPhotoData = await assetToPhotoData(existingAsset);
                
                similarPhotos.push(existingPhotoData);
                highestSimilarity = Math.max(highestSimilarity, similarity);
                
                if (similarity > 0.98) {
                    isDuplicate = true;
                }
                
                processedSimilarPairs.add(pairId);
            } catch (error) {
                console.log(`Non è stato possibile caricare l'asset ${existingId}`);
            }
        }
    }
    
    return { similarPhotos, highestSimilarity, isDuplicate };
};

export const updateSimilarityStats = (
    currentStats: ScanStats,
    numDuplicates: number,
    numSimilarPhotos: number
): ScanStats => {
    return {
        ...currentStats,
        duplicatesFound: currentStats.duplicatesFound + numDuplicates,
        similarPhotosFound: currentStats.similarPhotosFound + numSimilarPhotos
    };
};

export const createScanResult = (
    photoData: PhotoData,
    colorAnalysis: { type: PhotoType; dominantColor: string; dominantPercent: number },
    similarPhotos: PhotoData[] = [],
    similarityScore?: number
): ScanResult => {
    return {
        photo: photoData,
        type: colorAnalysis.type,
        dominantColor: colorAnalysis.dominantColor,
        dominantPercent: colorAnalysis.dominantPercent,
        similarPhotos: similarPhotos.length > 0 ? similarPhotos : undefined,
        similarityScore: similarityScore
    };
};
