export interface PhotoData {
    uri: string;
    id: string;
    createdAt?: Date;
    width?: number;
    height?: number;
  }
  
  export interface GalleryState {
    isLoading: boolean;
    hasPermission: boolean | null;
    photos: PhotoData[];
    hasMorePhotos: boolean;
    page: number;
    lastAssetId?: string;
  }
  
  export enum PhotoType {
    NORMAL = 'normal',
    MONOCHROME = 'monochrome'  
  }
  
  export interface ScanResult {
    photo: PhotoData;
    type: PhotoType;
    dominantColor?: string;       // Colore dominante in formato hex
    dominantPercent?: number;     // Percentuale di presenza del colore dominante (0-1)
    similarPhotos?: PhotoData[];  // Foto simili trovate
    similarityScore?: number;     // Punteggio di similarità (0-1)
  }
  
  export interface ScanStats {
    totalProcessed: number;
    monochromeCount: number;      // Contatore unico per tutte le foto monocromatiche
    duplicatesFound: number;      // Duplicati esatti
    similarPhotosFound: number;   // Foto simili
  }
  
  export interface ScanState {
    isScanning: boolean;
    progress: number;          // Progresso da 0 a 1
    currentBatch: number;      // Batch corrente
    totalBatches: number;      // Totale batch da processare
    results: ScanResult[];     
    stats: ScanStats;          
    error: string | null;      // Errore se presente
  }