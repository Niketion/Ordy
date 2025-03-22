// src/services/mediaService.ts
import * as MediaLibrary from 'expo-media-library';
import { copyPhotoToFileSystem } from '../utils/fileUtils';
import { PhotoData } from '../types';

/**
 * Richiede i permessi di accesso alla galleria
 */
export const requestMediaPermissions = async (): Promise<boolean> => {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
};

/**
 * Recupera le foto dalla galleria con supporto per paginazione
 * @param page Numero di pagina (inizia da 1)
 * @param perPage Numero di foto per pagina
 * @param clearCache Se true, pulisce la cache prima di recuperare nuove foto
 */
// In mediaService.ts - fetchPhotos function
// In mediaService.ts
export const fetchPhotos = async (
    page: number = 1, 
    perPage: number = 12, 
    lastAssetId?: string,
    clearCache: boolean = false
  ): Promise<{photos: PhotoData[], hasMore: boolean, lastAssetId?: string}> => {
    try {
      // Get assets using the after parameter for proper pagination
      const assets = await MediaLibrary.getAssetsAsync({
        first: perPage,
        after: lastAssetId,
        mediaType: ['photo'],
        sortBy: MediaLibrary.SortBy.creationTime
      });
      
      const hasMore = assets.hasNextPage || false;
      
      if (assets.assets.length === 0) {
        return { photos: [], hasMore };
      }
      
      // Process photos - use a Promise.all to get all asset info in parallel
      const photosPromises = assets.assets.map(async (asset) => {
        // Get full asset info which includes a usable URI
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
        
        return {
          uri: assetInfo.localUri || asset.uri, // Use localUri which works better
          id: asset.id,
          createdAt: new Date(asset.creationTime),
          width: asset.width,
          height: asset.height
        };
      });
      
      const photos = await Promise.all(photosPromises);
      
      // Return the last asset ID for pagination
      return { 
        photos, 
        hasMore,
        lastAssetId: assets.assets.length > 0 ? assets.assets[assets.assets.length - 1].id : undefined
      };
    } catch (error) {
      console.error('Error fetching photos:', error);
      return { photos: [], hasMore: false };
    }
  };