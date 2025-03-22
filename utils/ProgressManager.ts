import { ScanStats } from '../types';
import {
    LOADING_PHASE_MAX_PROGRESS,
    PROCESSING_PHASE_MIN_PROGRESS
} from '../constants/scanConfig';

export class ProgressManager {
    private totalAssetEstimate: number;
    private loadedAssetCount: number;
    private currentBatch: number;
    private totalBatches: number;
    private phase: 'loading' | 'processing';
    
    constructor() {
        this.totalAssetEstimate = 1000;
        this.loadedAssetCount = 0;
        this.currentBatch = 0;
        this.totalBatches = 1;
        this.phase = 'loading';
    }
    
    public initialize(initialEstimate: number = 1000) {
        this.totalAssetEstimate = initialEstimate;
        this.loadedAssetCount = 0;
        this.currentBatch = 0;
        this.totalBatches = Math.ceil(initialEstimate / 30);
        this.phase = 'loading';
    }
    
    public updateLoadingProgress(loadedAssets: number, newEstimate?: number) {
        this.loadedAssetCount = loadedAssets;
        
        if (newEstimate) {
            this.totalAssetEstimate = newEstimate;
            this.totalBatches = Math.ceil(newEstimate / 30);
        }
        
        if (this.loadedAssetCount > this.totalAssetEstimate * 0.8) {
            this.totalAssetEstimate = Math.ceil(this.loadedAssetCount * 1.25);
            this.totalBatches = Math.ceil(this.totalAssetEstimate / 30);
        }
    }
    
    public startProcessingPhase(totalAssets: number, batchSize: number) {
        this.phase = 'processing';
        this.totalAssetEstimate = totalAssets;
        this.totalBatches = Math.ceil(totalAssets / batchSize);
        this.currentBatch = 0;
    }
    
    public updateProcessingProgress(currentBatch: number) {
        this.currentBatch = currentBatch;
    }
    
    public calculateProgress(): number {
        if (this.phase === 'loading') {
            const loadingPercent = Math.min(1, this.loadedAssetCount / this.totalAssetEstimate);
            return loadingPercent * LOADING_PHASE_MAX_PROGRESS;
        } else {
            const processingPercent = Math.min(1, this.currentBatch / this.totalBatches);
            return PROCESSING_PHASE_MIN_PROGRESS + 
                ((1 - PROCESSING_PHASE_MIN_PROGRESS) * processingPercent);
        }
    }
    
    public getProgressInfo() {
        return {
            phase: this.phase,
            progress: this.calculateProgress(),
            currentBatch: this.currentBatch,
            totalBatches: this.totalBatches,
            loadedAssetCount: this.loadedAssetCount,
            totalAssetEstimate: this.totalAssetEstimate,
            isLoading: this.phase === 'loading',
            isProcessing: this.phase === 'processing'
        };
    }
    
    public getUiUpdateObject(stats: ScanStats) {
        const progressInfo = this.getProgressInfo();
        
        return {
            progress: progressInfo.progress,
            currentBatch: progressInfo.currentBatch,
            totalBatches: progressInfo.totalBatches,
            stats: {
                ...stats,
                totalProcessed: progressInfo.isLoading 
                    ? progressInfo.loadedAssetCount 
                    : stats.totalProcessed
            }
        };
    }
}
