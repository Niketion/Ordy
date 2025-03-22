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