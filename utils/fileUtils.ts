import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const CACHE_DIRECTORY = `${FileSystem.cacheDirectory}photos/`;

export const ensureCacheDirectory = async (): Promise<void> => {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, { intermediates: true });
    }
};

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
    
            console.log(`Copying image ${index}:
                - Source: ${asset.uri}
                - Destination: ${destinationUri}`);
    
            const fileInfo = await FileSystem.getInfoAsync(destinationUri);
            if (fileInfo.exists) {
                console.log(`File already exists for image ${index}`);
                return destinationUri;
            }
    
            try {
                const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
                console.log(`Asset info for ${index}:`, assetInfo.localUri || assetInfo.uri);
                
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
