// src/utils/fileUtils.ts
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const CACHE_DIRECTORY = `${FileSystem.cacheDirectory}photos/`;

/**
 * Assicura che la directory della cache esista
 */
export const ensureCacheDirectory = async (): Promise<void> => {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, { intermediates: true });
  }
};

/**
 * Pulisce la directory della cache
 */
export const clearPhotoCache = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(CACHE_DIRECTORY);
      await ensureCacheDirectory();
    }
  } catch (error) {
    console.error('Errore nella pulizia della cache:', error);
  }
};

/**
 * Copia l'immagine dalla galleria al file system dell'app
 * @param asset Asset della foto da copiare
 * @param index Indice globale della foto (per generare nomi univoci)
 * @param clearCache Se true, pulisce la cache prima di salvare
 */
// In fileUtils.ts - copyPhotoToFileSystem function
export const copyPhotoToFileSystem = async (
    asset: MediaLibrary.Asset, 
    index: number,
    clearCache: boolean = false
  ): Promise<string | null> => {
    try {
      await ensureCacheDirectory();
      
      if (clearCache && index === 0) {
        await clearPhotoCache();
        await ensureCacheDirectory();
      }
      
      const fileName = `photo_${index}.jpg`;
      const destinationUri = `${CACHE_DIRECTORY}${fileName}`;
  
      // Log information
      console.log(`Copying image ${index}:
        - Source: ${asset.uri}
        - Destination: ${destinationUri}`);
  
      // Verify if file exists already
      const fileInfo = await FileSystem.getInfoAsync(destinationUri);
      if (fileInfo.exists) {
        console.log(`File already exists for image ${index}`);
        return destinationUri;
      }
  
      // Try to get asset info
      try {
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
        console.log(`Asset info for ${index}:`, assetInfo.localUri || assetInfo.uri);
        
        // Try to copy using localUri if available
        if (assetInfo.localUri) {
          await FileSystem.copyAsync({
            from: assetInfo.localUri,
            to: destinationUri,
          });
        } else {
          await FileSystem.copyAsync({
            from: asset.uri,
            to: destinationUri,
          });
        }
        
        return destinationUri;
      } catch (assetError) {
        console.error(`Error getting asset info for ${index}:`, assetError);
        
        // Fallback to direct copy
        await FileSystem.copyAsync({
          from: asset.uri,
          to: destinationUri,
        });
        return destinationUri;
      }
    } catch (error) {
      console.error(`Error copying image ${index}:`, error);
      return null;
    }
  };