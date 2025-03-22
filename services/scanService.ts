import * as MediaLibrary from 'expo-media-library';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { PhotoData, PhotoType } from '../types';
import * as FileSystem from 'expo-file-system';
import * as crypto from 'expo-crypto';

const HASH_SIZE = 16;
const COLOR_ANALYSIS_SIZE = 32;
const MONOCHROME_THRESHOLD = 0.92;
const SIMILARITY_THRESHOLD = 0.85;
const MEDIA_BATCH_SIZE = 200;
const MAX_MEDIA_ASSETS = 100000;

export const getAllMediaAssets = async (): Promise<MediaLibrary.Asset[]> => {
    let allAssets: MediaLibrary.Asset[] = [];
    let hasNextPage = true;
    let cursor: string | undefined = undefined;
    
    try {
        const initialResult = await MediaLibrary.getAssetsAsync({
            first: MEDIA_BATCH_SIZE,
            mediaType: ['photo'],
            sortBy: MediaLibrary.SortBy.creationTime
        });
        
        allAssets = [...initialResult.assets];
        hasNextPage = initialResult.hasNextPage;
        cursor = initialResult.endCursor;
        
        let batchCount = 1;
        
        while (hasNextPage && allAssets.length < MAX_MEDIA_ASSETS) {
            const result = await MediaLibrary.getAssetsAsync({
                first: MEDIA_BATCH_SIZE,
                after: cursor,
                mediaType: ['photo'],
                sortBy: MediaLibrary.SortBy.creationTime
            });
            
            const newAssets = result.assets.filter(newAsset => 
                !allAssets.some(existingAsset => existingAsset.id === newAsset.id)
            );
            
            if (newAssets.length === 0) {
                break;
            }
            
            allAssets = [...allAssets, ...newAssets];
            hasNextPage = result.hasNextPage;
            cursor = result.endCursor;
            batchCount++;
            
            if (batchCount % 5 === 0) {
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            if (allAssets.length > MAX_MEDIA_ASSETS) {
                allAssets = allAssets.slice(0, MAX_MEDIA_ASSETS);
                break;
            }
        }
        
        return allAssets;
    } catch (error) {
        return allAssets.length > 0 ? allAssets : [];
    }
};

export const assetToPhotoData = async (asset: MediaLibrary.Asset): Promise<PhotoData> => {
    try {
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
        
        return {
            uri: assetInfo.localUri || asset.uri, 
            id: asset.id,
            createdAt: new Date(asset.creationTime),
            width: asset.width,
            height: asset.height
        };
    } catch (error) {
        return {
            uri: asset.uri,
            id: asset.id,
            createdAt: new Date(asset.creationTime),
            width: asset.width,
            height: asset.height
        };
    }
};

export const calculateImageHash = async (uri: string): Promise<string> => {
    try {
        const resized = await manipulateAsync(
            uri,
            [{ resize: { width: HASH_SIZE, height: HASH_SIZE } }],
            { format: SaveFormat.PNG }
        );
        
        const base64Data = await FileSystem.readAsStringAsync(resized.uri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        
        const hash = await crypto.digestStringAsync(
            crypto.CryptoDigestAlgorithm.SHA256,
            base64Data
        );
        
        return hash;
    } catch (error) {
        return '';
    }
};

export const analyzeImageColors = async (uri: string): Promise<{
    type: PhotoType,
    dominantColor: string,
    dominantPercent: number
}> => {
    try {
        const resized = await manipulateAsync(
            uri, 
            [{ resize: { width: COLOR_ANALYSIS_SIZE, height: COLOR_ANALYSIS_SIZE } }],
            { base64: true, format: SaveFormat.PNG }
        );
        
        if (!resized.base64) {
            throw new Error("Image conversion failed");
        }
        
        const colorData = analyzeImageWithBase64(resized.base64);
        
        if (colorData.dominantPercent >= MONOCHROME_THRESHOLD) {
            return {
                type: PhotoType.MONOCHROME,
                dominantColor: colorData.dominantColor,
                dominantPercent: colorData.dominantPercent
            };
        }
        
        return {
            type: PhotoType.NORMAL,
            dominantColor: colorData.dominantColor,
            dominantPercent: colorData.dominantPercent
        };
    } catch (error) {
        return {
            type: PhotoType.NORMAL,
            dominantColor: '#777777',
            dominantPercent: 0.5
        };
    }
};

const analyzeImageWithBase64 = (base64Image: string): {
    dominantColor: string,
    dominantPercent: number
} => {
    try {
        const sampleSize = Math.min(base64Image.length, 1000);
        const sampleBytes: number[] = [];
        
        const step = Math.max(1, Math.floor(base64Image.length / sampleSize));
        for (let i = 0; i < base64Image.length; i += step) {
            if (sampleBytes.length >= sampleSize) break;
            sampleBytes.push(base64Image.charCodeAt(i));
        }
        
        const meanByte = sampleBytes.reduce((sum, val) => sum + val, 0) / sampleBytes.length;
        const variance = sampleBytes.reduce((sum, val) => sum + Math.pow(val - meanByte, 2), 0) / sampleBytes.length;
        
        const normalizedVariance = Math.min(1, variance / 2000);
        const colorUniformity = 1 - normalizedVariance;
        
        const r = Math.min(255, Math.max(0, Math.floor((meanByte * 1.5) % 256)));
        const g = Math.min(255, Math.max(0, Math.floor((meanByte * 0.8) % 256)));
        const b = Math.min(255, Math.max(0, Math.floor((meanByte * 0.5) % 256)));
        
        const dominantColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        
        return {
            dominantColor,
            dominantPercent: colorUniformity
        };
    } catch (error) {
        return {
            dominantColor: '#777777',
            dominantPercent: 0.5
        };
    }
};

export const calculateSimilarity = (hash1: string, hash2: string): number => {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) {
        return 0;
    }
    
    let differences = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) {
            differences++;
        }
    }
    
    return 1 - (differences / hash1.length);
};
