export const HASH_SIZE = 16;  // Dimensione per il calcolo dell'hash
export const COLOR_ANALYSIS_SIZE = 32; // Dimensione per analisi colore

export const MONOCHROME_THRESHOLD = 0.92;  // Soglia per considerare una foto monocromatica
export const SIMILARITY_THRESHOLD = 0.87;   // Soglia di similarità per foto simili (87%)

export const MEDIA_BATCH_SIZE = 500;  // Numero di foto da recuperare in ogni batch
export const MAX_MEDIA_ASSETS = 100000; // Limite massimo di foto da analizzare

export const BATCH_SIZE = 100;  // Numero di foto da elaborare per batch
export const MAX_PARALLEL_OPERATIONS = 25;  // Operazioni parallele massime

export const LOADING_PHASE_MAX_PROGRESS = 0.5; // Il caricamento arriva fino al 50% del progresso totale
export const PROCESSING_PHASE_MIN_PROGRESS = 0.5; // L'elaborazione parte dal 50% del progresso totale