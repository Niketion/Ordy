import React, { useState } from 'react';
import { 
    View, 
    Image, 
    StyleSheet, 
    Dimensions, 
    FlatList,
    TouchableOpacity, 
    Modal,
    Text,
    Pressable,
    ActivityIndicator
} from 'react-native';
import { PhotoData } from '../types';

const { width } = Dimensions.get('window');
const numColumns = 3;
const imageSize = (width - 70) / numColumns;

interface PhotoGridProps {
    photos: PhotoData[];
    onPhotoPress?: (photo: PhotoData) => void;
    onEndReached?: () => void;
    isLoading?: boolean;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ 
    photos, 
    onPhotoPress,
    onEndReached,
    isLoading = false
}) => {
    const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
    
    const handlePhotoPress = (photo: PhotoData) => {
        if (onPhotoPress) {
            onPhotoPress(photo);
        } else {
            setSelectedPhoto(photo);
        }
    };
    
    const closeModal = () => {
        setSelectedPhoto(null);
    };

    const renderItem = ({ item }: { item: PhotoData }) => (
        <TouchableOpacity 
            onPress={() => handlePhotoPress(item)}
            activeOpacity={0.8}
            style={styles.photoContainer}
        >
            <Image 
                source={{ uri: item.uri }} 
                style={styles.thumbnail}
                onError={(e) => console.log('Image loading error:', item.id, e.nativeEvent.error)}
            />
            {item.createdAt && (
                <Text style={styles.dateText}>
                    {item.createdAt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                </Text>
            )}
        </TouchableOpacity>
    );

    const renderFooter = () => {
        if (!isLoading) return null;
        
        return (
            <View style={styles.footerContainer}>
                <ActivityIndicator size="small" color="#0000ff" />
                <Text style={styles.footerText}>Caricamento altre foto...</Text>
            </View>
        );
    };
    
    return (
        <View style={styles.container}>
                <FlatList
                data={photos}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                contentContainerStyle={styles.listContent}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                />
            
            <Modal
                visible={selectedPhoto !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={closeModal}
            >
                <Pressable style={styles.modalOverlay} onPress={closeModal}>
                    <View style={styles.modalContent}>
                        {selectedPhoto && (
                            <>
                                <Image 
                                    source={{ uri: selectedPhoto.uri }} 
                                    style={styles.modalImage} 
                                    resizeMode="contain"
                                />
                                {selectedPhoto.createdAt && (
                                    <Text style={styles.modalText}>
                                        {selectedPhoto.createdAt.toLocaleDateString('it-IT', { 
                                            day: '2-digit', 
                                            month: '2-digit', 
                                            year: 'numeric'
                                        })}
                                    </Text>
                                )}
                            </>
                        )}
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 20,
    },
    photoContainer: {
        width: imageSize,
        height: imageSize,
        margin: 5,
        borderRadius: 5,
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    dateText: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.5)',
        color: 'white',
        padding: 2,
        borderRadius: 3,
        fontSize: 10,
    },
    footerContainer: {
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    footerText: {
        marginLeft: 10,
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        height: '70%',
        backgroundColor: 'black',
        borderRadius: 10,
        overflow: 'hidden',
    },
    modalImage: {
        width: '100%',
        height: '90%',
    },
    modalText: {
        color: 'white',
        padding: 10,
        textAlign: 'center',
    }
});

export default PhotoGrid;
