import { useState, useCallback, useEffect, useRef } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';
import { PhotoType, ScanState, ScanResult } from '../types';
import { BATCH_SIZE } from '../constants/scanConfig';
import { requestMediaPermissions, getAllMediaAssets } from '../services/mediaService';
import { BatchProcessor } from '../utils/BatchProcessor';
import { ProgressManager } from '../utils/ProgressManager';

export const useScanGallery = () => {
    const isScanningRef = useRef(false);
    const processedCountRef = useRef(0);
    const [imageHashCache] = useState<Map<string, string>>(new Map());
    const [colorAnalysisCache] = useState<Map<string, {
        type: PhotoType, 
        dominantColor: string, 
        dominantPercent: number
    }>>(new Map());
    const [processedSimilarPairs] = useState<Set<string>>(new Set());
    const [state, setState] = useState<ScanState>({
        isScanning: false,
        progress: 0,
        currentBatch: 0,
        totalBatches: 0,
        results: [],
        stats: {
            totalProcessed: 0,
            monochromeCount: 0,
            duplicatesFound: 0,
            similarPhotosFound: 0
        },
        error: null
    });
    const getBatchProcessor = useCallback(() => {
        return new BatchProcessor(
            imageHashCache,
            colorAnalysisCache,
            processedSimilarPairs,
            isScanningRef
        );
    }, [imageHashCache, colorAnalysisCache, processedSimilarPairs]);
    const progressManager = useRef(new ProgressManager()).current;
    const cancelScan = useCallback(() => {
        if (state.isScanning) {
            isScanningRef.current = false;
            setState(prev => ({ ...prev, isScanning: false }));
        }
    }, [state.isScanning]);
    const resetScanState = useCallback(() => {
        processedCountRef.current = 0;
        processedSimilarPairs.clear();
        if (imageHashCache.size > 1000) {
            const keys = Array.from(imageHashCache.keys());
            keys.slice(0, keys.length - 500).forEach(key => imageHashCache.delete(key));
        }
        if (colorAnalysisCache.size > 1000) {
            const keys = Array.from(colorAnalysisCache.keys());
            keys.slice(0, keys.length - 500).forEach(key => colorAnalysisCache.delete(key));
        }
        progressManager.initialize();
    }, [processedSimilarPairs, imageHashCache, colorAnalysisCache, progressManager]);
    const processAssetBatches = useCallback(async (
        assets: MediaLibrary.Asset[],
        batchProcessor: BatchProcessor
    ) => {
        const totalBatches = Math.ceil(assets.length / BATCH_SIZE);
        progressManager.startProcessingPhase(assets.length, BATCH_SIZE);
        setState(prev => ({ 
            ...prev,
            ...progressManager.getUiUpdateObject(prev.stats)
        }));
        try {
            for (let i = 0; i < totalBatches; i++) {
                if (!isScanningRef.current) {
                    break;
                }
                const start = i * BATCH_SIZE;
                const end = Math.min(start + BATCH_SIZE, assets.length);
                const batchAssets = assets.slice(start, end);
                progressManager.updateProcessingProgress(i + 1);
                setState(prev => ({
                    ...prev,
                    ...progressManager.getUiUpdateObject(prev.stats)
                }));
                const { batchResults, updatedStats } = await batchProcessor.processBatch(
                    batchAssets,
                    state.stats,
                    processedCountRef.current
                );
                processedCountRef.current += batchAssets.length;
                if (isScanningRef.current) {
                    setState(prev => ({
                        ...prev,
                        stats: updatedStats,
                        results: [...prev.results, ...batchResults]
                    }));
                }
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            if (isScanningRef.current) {
                isScanningRef.current = false;
                setState(prev => {
                    return { 
                        ...prev, 
                        isScanning: false,
                        progress: 1
                    };
                });
                Alert.alert(
                    'Scansione Completata',
                    `Sono state analizzate ${processedCountRef.current} foto.\n\nRisultati trovati:\n- Monocromatiche: ${state.stats.monochromeCount}\n- Foto simili: ${state.stats.duplicatesFound + state.stats.similarPhotosFound}`
                );
            }
        } catch (error) {
            isScanningRef.current = false;
            setState(prev => ({ 
                ...prev, 
                isScanning: false,
                error: 'Errore durante la scansione'
            }));
            Alert.alert('Errore', 'Si è verificato un errore durante la scansione.');
        }
    }, [state.stats, progressManager]);
    const startScan = useCallback(async () => {
        try {
            resetScanState();
            const hasPermission = await requestMediaPermissions();
            if (!hasPermission) {
                setState(prev => ({ 
                    ...prev, 
                    isScanning: false,
                    error: 'Permessi di accesso alla galleria negati'
                }));
                Alert.alert(
                    'Permessi Negati',
                    'L\'app ha bisogno di accedere alle tue foto per eseguire la scansione.'
                );
                return;
            }
            isScanningRef.current = true;
            setState(prev => ({ 
                ...prev, 
                isScanning: true,
                ...progressManager.getUiUpdateObject(prev.stats)
            }));
            await new Promise(resolve => setTimeout(resolve, 500));
            try {
                const batchProcessor = getBatchProcessor();
                let allAssets: MediaLibrary.Asset[] = [];
                let hasNextPage = true;
                let cursor: string | undefined = undefined;
                let batchCount = 0;
                const initialResult = await MediaLibrary.getAssetsAsync({
                    first: 100,
                    mediaType: ['photo'],
                    sortBy: MediaLibrary.SortBy.creationTime
                });
                allAssets = [...initialResult.assets];
                hasNextPage = initialResult.hasNextPage;
                cursor = initialResult.endCursor;
                batchCount = 1;
                progressManager.updateLoadingProgress(allAssets.length);
                setState(prev => ({ 
                    ...prev, 
                    ...progressManager.getUiUpdateObject(prev.stats)
                }));
                if (hasNextPage && initialResult.assets.length > 0) {
                    const initialEstimate = initialResult.assets.length * 20;
                    progressManager.updateLoadingProgress(allAssets.length, initialEstimate);
                    setState(prev => ({ 
                        ...prev, 
                        ...progressManager.getUiUpdateObject(prev.stats)
                    }));
                }
                while (hasNextPage && allAssets.length < 100000 && isScanningRef.current) {
                    const result = await MediaLibrary.getAssetsAsync({
                        first: 200,
                        after: cursor,
                        mediaType: ['photo'],
                        sortBy: MediaLibrary.SortBy.creationTime
                    });
                    if (result.assets.length === 0) {
                        break;
                    }
                    allAssets = [...allAssets, ...result.assets];
                    hasNextPage = result.hasNextPage;
                    cursor = result.endCursor;
                    batchCount++;
                    progressManager.updateLoadingProgress(allAssets.length);
                    if (batchCount % 5 === 0 || allAssets.length % 1000 === 0) {
                        setState(prev => ({ 
                            ...prev, 
                            ...progressManager.getUiUpdateObject(prev.stats)
                        }));
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    if (allAssets.length > 100000) {
                        allAssets = allAssets.slice(0, 100000);
                        break;
                    }
                }
                if (allAssets.length === 0) {
                    isScanningRef.current = false;
                    setState(prev => ({ 
                        ...prev, 
                        isScanning: false,
                        error: 'Nessuna foto trovata nel dispositivo'
                    }));
                    Alert.alert('Nessuna Foto', 'Non sono state trovate foto nel dispositivo.');
                    return;
                }
                if (!isScanningRef.current) {
                    return;
                }
                await processAssetBatches(allAssets, batchProcessor);
            } catch (error) {
                isScanningRef.current = false;
                setState(prev => ({ 
                    ...prev, 
                    isScanning: false,
                    error: 'Errore nel recupero delle foto'
                }));
                Alert.alert('Errore', 'Si è verificato un problema nel caricamento delle foto.');
            }
        } catch (error) {
            isScanningRef.current = false;
            setState(prev => ({ 
                ...prev, 
                isScanning: false,
                error: 'Errore nell\'avvio della scansione'
            }));
            Alert.alert('Errore', 'C\'è stato un problema nell\'avvio della scansione.');
        }
    }, [
        resetScanState, 
        getBatchProcessor, 
        processAssetBatches, 
        progressManager
    ]);
    const getFilteredResults = useCallback((type?: PhotoType) => {
        if (!type) return state.results;
        return state.results.filter(result => result.type === type);
    }, [state.results]);
    const getSimilarPhotos = useCallback(() => {
        return state.results.filter(result => result.similarPhotos && result.similarPhotos.length > 0);
    }, [state.results]);
    useEffect(() => {
        return () => {
            if (isScanningRef.current) {
                isScanningRef.current = false;
            }
        };
    }, []);
    return {
        ...state,
        startScan,
        cancelScan,
        getFilteredResults,
        getSimilarPhotos
    };
};
