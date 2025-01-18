// App.tsx
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Image, ActivityIndicator, Alert, Button } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

const App: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Funzione per copiare l'immagine a un percorso accessibile
  const copyPhotoToFileSystem = async (asset: MediaLibrary.Asset) => {
    try {
      // Nome di file fisso per sovrascrivere
      const fileName = 'lastPhoto.jpg';
      const destinationUri = `${FileSystem.cacheDirectory}${fileName}`;

      // Verifica se il file esiste già
      const fileInfo = await FileSystem.getInfoAsync(destinationUri);
      if (fileInfo.exists) {
        // Elimina il file esistente
        await FileSystem.deleteAsync(destinationUri);
      }

      // Copia il file
      await FileSystem.copyAsync({
        from: asset.uri,
        to: destinationUri,
      });

      return destinationUri;
    } catch (error) {
      console.error('Errore nella copia dell\'immagine:', error);
      Alert.alert('Errore', 'C\'è stato un problema nel copiare l\'immagine.');
      return null;
    }
  };

  // Funzione per recuperare l'ultima foto
  const getLastPhoto = async () => {
    try {
      setIsLoading(true);
      const assets = await MediaLibrary.getAssetsAsync({
        first: 10,
        mediaType: ['photo'],
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });

      if (assets.assets.length > 0) {
        const lastPhoto = assets.assets[0];
        const copiedUri = await copyPhotoToFileSystem(lastPhoto);
        if (copiedUri) {
          setLastPhotoUri(copiedUri);
        } else {
          setLastPhotoUri(null);
        }
      } else {
        Alert.alert('Nessuna Foto Trovata', 'Non sono state trovate foto nel dispositivo.', [
          { text: 'OK' },
        ]);
        setLastPhotoUri(null);
      }
    } catch (error) {
      console.error('Errore nel recuperare le foto:', error);
      Alert.alert('Errore', 'C\'è stato un problema nel recuperare le foto.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permessi Negati',
          'L\'app ha bisogno di accedere alle tue foto per funzionare correttamente.',
          [{ text: 'OK' }]
        );
        setHasPermission(false);
        setIsLoading(false);
        return;
      }

      setHasPermission(true);
      await getLastPhoto();
    })();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Caricamento...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text>Permessi alla libreria multimediale negati.</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {lastPhotoUri ? (
        <Image source={{ uri: lastPhotoUri }} style={styles.image} resizeMode="contain" />
      ) : (
        <Text>Nessuna foto disponibile.</Text>
      )}
      <Button title="Aggiorna Foto" onPress={getLastPhoto} />
      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  image: {
    width: '90%',
    height: '70%',
    borderRadius: 10,
    marginBottom: 20,
  },
});

export default App;
