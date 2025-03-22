import * as MediaLibrary from 'expo-media-library';
import { PhotoData } from '../types';
import { MEDIA_BATCH_SIZE, MAX_MEDIA_ASSETS } from '../constants/scanConfig';

export const requestMediaPermissions = async (): Promise<boolean> => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
};

export const fetchPhotos = async (
    page: number = 1, 
    perPage: number = 12, 
    lastAssetId?: string,
    clearCache: boolean = false
): Promise<{photos: PhotoData[], hasMore: boolean, lastAssetId?: string}> => {
    try {
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
        
        const photosPromises = assets.assets.map(async (asset) => {
            const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
            
            return {
                uri: assetInfo.localUri || asset.uri,
                id: asset.id,
                createdAt: new Date(asset.creationTime),
                width: asset.width,
                height: asset.height
            };
        });
        
        const photos = await Promise.all(photosPromises);
        
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

export const getAllMediaAssets = async (): Promise<MediaLibrary.Asset[]> => {
    console.log("Iniziata raccolta asset della galleria");
    let allAssets: MediaLibrary.Asset[] = [];
    let hasNextPage = true;
    let cursor: string | undefined = undefined;
    
    try {
        const initialResult = await MediaLibrary.getAssetsAsync({
            first: MEDIA_BATCH_SIZE,
            mediaType: ['photo'],
            sortBy: MediaLibrary.SortBy.creationTime
        });
        
        console.log(`Primo batch recuperato: ${initialResult.assets.length} foto`);
        allAssets = [...initialResult.assets];
        hasNextPage = initialResult.hasNextPage;
        cursor = initialResult.endCursor;
        
        let batchCount = 1;
        
        while (hasNextPage && allAssets.length < MAX_MEDIA_ASSETS) {
            console.log(`Caricamento batch #${batchCount+1}...`);
            const result = await MediaLibrary.getAssetsAsync({
                first: MEDIA_BATCH_SIZE,
                after: cursor,
                mediaType: ['photo'],
                sortBy: MediaLibrary.SortBy.creationTime
            });
            
            console.log(`Batch #${batchCount+1} recuperato: ${result.assets.length} foto`);
            
            const newAssets = result.assets.filter(newAsset => 
                !allAssets.some(existingAsset => existingAsset.id === newAsset.id)
            );
            
            if (newAssets.length === 0) {
                console.log("Nessun nuovo asset, interrompendo il caricamento");
                break;
            }
            
            allAssets = [...allAssets, ...newAssets];
            hasNextPage = result.hasNextPage;
            cursor = result.endCursor;
            batchCount++;
            
            if (batchCount % 5 === 0) {
                console.log(`Progresso caricamento: ${allAssets.length} foto`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
            if (allAssets.length > MAX_MEDIA_ASSETS) {
                allAssets = allAssets.slice(0, MAX_MEDIA_ASSETS);
                console.log(`Raggiunto limite massimo di ${MAX_MEDIA_ASSETS} foto, troncamento.`);
                break;
            }
        }
        
        console.log(`Totale foto recuperate: ${allAssets.length}`);
        return allAssets;
    } catch (error) {
        console.error("Errore nel recupero degli asset della galleria:", error);
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
        console.error('Errore nel recupero info asset:', error);
        return {
            uri: asset.uri,
            id: asset.id,
            createdAt: new Date(asset.creationTime),
            width: asset.width,
            height: asset.height
        };
    }
};
