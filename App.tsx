import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import PhotoGrid from './components/PhotoGrid';
import LoadingScreen from './components/LoadingScreen';
import ScanTab from './components/ScanTab';
import { usePhotoGallery } from './hooks/usePhotoGallery';
import { PhotoData } from './types';

// Tab enum per la navigazione
enum AppTab {
  GALLERY = 'gallery',
  SCAN = 'scan'
}

const App: React.FC = () => {
  const { 
    hasPermission, 
    photos, 
    isLoading, 
    refreshPhotos, 
    loadMorePhotos 
  } = usePhotoGallery();
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.GALLERY);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPhotos();
    setRefreshing(false);
  };

  const handlePhotoPress = (photo: PhotoData) => {
    console.log('Foto selezionata:', photo);
  };

  const handleLoadMore = () => {
    loadMorePhotos();
  };

  const renderContent = () => {
    if (activeTab === AppTab.GALLERY) {
      if (isLoading && photos.length === 0) {
        return <LoadingScreen />;
      }
      
      return (
        <View style={styles.tabContent}>
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
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={refreshing || !hasPermission}
            >
              <Text style={styles.refreshButtonText}>
                {refreshing ? "Aggiornamento..." : "Aggiorna Foto"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
      return <ScanTab />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {renderContent()}
        
        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === AppTab.GALLERY && styles.activeTab]}
            onPress={() => setActiveTab(AppTab.GALLERY)}
          >
            <Text style={styles.tabText}>Galleria</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === AppTab.SCAN && styles.activeTab]}
            onPress={() => setActiveTab(AppTab.SCAN)}
          >
            <Text style={styles.tabText}>Scansione</Text>
          </TouchableOpacity>
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
  },
  tabContent: {
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
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
  },
  tabText: {
    fontWeight: '500',
  },
});

export default App;