import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as crypto from 'expo-crypto';
import { PhotoType } from '../types';
import { MONOCHROME_THRESHOLD, COLOR_ANALYSIS_SIZE, HASH_SIZE } from '../constants/scanConfig';

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
        console.error('Errore nel calcolo dell\'hash dell\'immagine:', error);
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
        console.error('Errore nell\'analisi dei colori:', error);
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
        console.error('Errore nell\'analisi base64:', error);
        
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
