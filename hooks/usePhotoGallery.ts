import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { requestMediaPermissions, fetchPhotos } from '../services/mediaService';
import { PhotoData, GalleryState } from '../types';

const PHOTOS_PER_PAGE = 12;

export const usePhotoGallery = () => {
    const [state, setState] = useState<GalleryState>({
        isLoading: true,
        hasPermission: null,
        photos: [],
        hasMorePhotos: true,
        page: 1
    });

    const loadInitialPhotos = useCallback(async () => {
        try {
            setState(prevState => ({ ...prevState, isLoading: true, page: 1 }));
            
            const { photos, hasMore, lastAssetId } = await fetchPhotos(1, PHOTOS_PER_PAGE, undefined, true);
            
            setState(prevState => ({ 
                ...prevState, 
                photos, 
                hasMorePhotos: hasMore, 
                isLoading: false,
                page: 1,
                lastAssetId 
            }));
            
            if (photos.length === 0) {
                Alert.alert('Nessuna Foto Trovata', 'Non sono state trovate foto nel dispositivo.');
            }
        } catch (error) {
            console.error('Errore nel recuperare le foto:', error);
            Alert.alert('Errore', 'C\'è stato un problema nel recuperare le foto.');
            setState(prevState => ({ 
                ...prevState, 
                isLoading: false, 
                hasMorePhotos: false 
            }));
        }
    }, []);

    const loadMorePhotos = useCallback(async () => {
        if (state.isLoading || !state.hasMorePhotos) return;
        
        try {
            setState(prevState => ({ ...prevState, isLoading: true }));
            
            const nextPage = state.page + 1;
            const { photos, hasMore, lastAssetId } = await fetchPhotos(
                nextPage, 
                PHOTOS_PER_PAGE, 
                state.lastAssetId,
                false
            );
            
            const existingIds = new Set(state.photos.map(photo => photo.id));
            const uniqueNewPhotos = photos.filter(photo => !existingIds.has(photo.id));
            
            setState(prevState => ({ 
                ...prevState, 
                photos: [...prevState.photos, ...uniqueNewPhotos], 
                hasMorePhotos: hasMore, 
                isLoading: false,
                page: nextPage,
                lastAssetId
            }));
        } catch (error) {
            console.error('Error loading more photos:', error);
            setState(prevState => ({ ...prevState, isLoading: false }));
        }
    }, [state.isLoading, state.hasMorePhotos, state.page, state.lastAssetId]);
    
    useEffect(() => {
        const initialize = async () => {
            try {
                const hasPermission = await requestMediaPermissions();
                
                if (!hasPermission) {
                    Alert.alert(
                        'Permessi Negati',
                        'L\'app ha bisogno di accedere alle tue foto per funzionare correttamente.'
                    );
                    setState(prevState => ({ 
                        ...prevState, 
                        isLoading: false, 
                        hasPermission: false 
                    }));
                    return;
                }
                
                setState(prevState => ({ ...prevState, hasPermission: true }));
                await loadInitialPhotos();
            } catch (error) {
                console.error('Errore nell\'inizializzazione:', error);
                setState(prevState => ({ 
                    ...prevState, 
                    isLoading: false, 
                    hasPermission: false 
                }));
            }
        };
        
        initialize();
    }, [loadInitialPhotos]);

    return {
        ...state,
        refreshPhotos: loadInitialPhotos,
        loadMorePhotos
    };
};
