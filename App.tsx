// src/App.tsx
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, SafeAreaView } from 'react-native';
import PhotoGrid from './components/PhotoGrid';
import LoadingScreen from './components/LoadingScreen';
import { usePhotoGallery } from './hooks/usePhotoGallery';
import { PhotoData } from './types';

const App: React.FC = () => {
  const { 
    hasPermission, 
    photos, 
    isLoading, 
    refreshPhotos, 
    loadMorePhotos 
  } = usePhotoGallery();
  
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPhotos();
    setRefreshing(false);
  };

  const handlePhotoPress = (photo: PhotoData) => {
    console.log('Foto selezionata:', photo);
    // Qui puoi implementare azioni aggiuntive quando una foto viene selezionata
  };

  const handleLoadMore = () => {
    loadMorePhotos();
  };

  if (isLoading && photos.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>La tua galleria foto</Text>
        
        {!hasPermission ? (
          <View style={styles.messageContainer}>
            <Text>Permessi alla libreria multimediale negati.</Text>
          </View>
        ) : photos.length > 0 ? (
          <PhotoGrid 
            photos={photos} 
            onPhotoPress={handlePhotoPress}
            onEndReached={handleLoadMore}
            isLoading={isLoading}
          />
        ) : (
          <View style={styles.messageContainer}>
            <Text>Nessuna foto disponibile.</Text>
          </View>
        )}
        
        <View style={styles.buttonContainer}>
          <Button 
            title={refreshing ? "Aggiornamento..." : "Aggiorna Foto"} 
            onPress={handleRefresh}
            disabled={refreshing || !hasPermission}
          />
        </View>
        <StatusBar style="auto" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    marginBottom: 20,
  }
});

export default App;