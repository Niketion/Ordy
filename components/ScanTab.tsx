import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Button, 
  FlatList, 
  Image, 
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Dimensions
} from 'react-native';
import { useScanGallery } from '../hooks/useScanGallery';
import { PhotoType, ScanResult } from '../types';

const { width } = Dimensions.get('window');
const thumbSize = (width - 60) / 3;

const ScanTab: React.FC = () => {
  const { 
    isScanning, 
    progress, 
    currentBatch, 
    totalBatches,
    results, 
    stats,
    startScan,
    cancelScan,
    getFilteredResults,
    getSimilarPhotos
  } = useScanGallery();
  
  const [activeFilter, setActiveFilter] = useState<PhotoType | 'similar' | null>(null);
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
  
  const handleFilterPress = useCallback((filter: PhotoType | 'similar' | null) => {
    setActiveFilter(filter);
  }, []);
  
  const getDisplayResults = useCallback(() => {
    if (activeFilter === 'similar') {
      return getSimilarPhotos();
    } else {
      return getFilteredResults(activeFilter as PhotoType | undefined);
    }
  }, [activeFilter, getFilteredResults, getSimilarPhotos]);
  
  const getColorFromHex = useCallback((hex: string | undefined, opacity: number = 1) => {
    if (!hex) return 'rgba(0, 0, 0, 0.7)'; // Default nero
    
    if (hex.startsWith('#') && hex.length === 7) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    return hex;
  }, []);

  const renderResultItem = useCallback(({ item }: { item: ScanResult }) => {
    return (
      <TouchableOpacity 
        onPress={() => setSelectedResult(item)} 
        style={styles.resultItem}
      >
        <Image source={{ uri: item.photo.uri }} style={styles.thumbImage} />
        <View style={styles.thumbInfo}>
          {item.type === PhotoType.MONOCHROME && (
            <View style={[
              styles.badge, 
              { backgroundColor: getColorFromHex(item.dominantColor, 0.7) }
            ]}>
              <Text style={styles.badgeText}>
                Mono
              </Text>
            </View>
          )}
          
          {item.similarPhotos && item.similarPhotos.length > 0 && (
            <View style={styles.similarBadge}>
              <Text style={styles.badgeText}>
                {item.similarPhotos.length} simili
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [getColorFromHex]);
  
  const renderDetailView = useCallback(() => {
    if (!selectedResult) return null;
    
    return (
      <Modal
        visible={selectedResult !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedResult(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Dettagli Foto</Text>
              
              <Image 
                source={{ uri: selectedResult.photo.uri }} 
                style={styles.detailImage} 
                resizeMode="contain"
              />
              
              <View style={styles.detailInfo}>
                <Text>ID: {selectedResult.photo.id.substring(0, 12)}...</Text>
                <Text>Data: {selectedResult.photo.createdAt?.toLocaleString()}</Text>
                
                {selectedResult.type === PhotoType.MONOCHROME && (
                  <View style={styles.colorInfoContainer}>
                    <Text>Tipo: Monocromatica</Text>
                    <View style={styles.colorBox}>
                      <View 
                        style={[
                          styles.colorSwatch, 
                          { backgroundColor: selectedResult.dominantColor || '#000000' }
                        ]} 
                      />
                      <Text style={styles.colorText}>
                        Colore: {selectedResult.dominantColor || 'N/A'}
                      </Text>
                    </View>
                    <Text>Percentuale: {Math.round((selectedResult.dominantPercent || 0) * 100)}%</Text>
                  </View>
                )}
                
                {selectedResult.type !== PhotoType.MONOCHROME && (
                  <Text>Tipo: Normale</Text>
                )}
              </View>
              
              {selectedResult.similarPhotos && selectedResult.similarPhotos.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Foto Simili ({selectedResult.similarPhotos.length})</Text>
                  <Text style={styles.similarityScore}>
                    Somiglianza: {Math.round((selectedResult.similarityScore || 0) * 100)}%
                  </Text>
                  
                  <FlatList
                    data={selectedResult.similarPhotos}
                    renderItem={({ item }) => (
                      <Image source={{ uri: item.uri }} style={styles.similarThumb} />
                    )}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.similarList}
                  />
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedResult(null)}
            >
              <Text style={styles.closeButtonText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }, [selectedResult]);
  
  const renderProgressBar = useCallback(() => {
    if (!isScanning) return null;
    
    const isLoading = progress < 0.5;
    const phaseText = isLoading 
      ? "Caricamento foto dalla galleria..." 
      : "Analisi foto in corso...";

    const phaseProgress = isLoading 
      ? progress * 2 
      : (progress - 0.5) * 2;
    
    return (
      <View style={styles.progressContainer}>
        <Text style={styles.phaseText}>{phaseText}</Text>
        
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar,
              { width: `${progress * 100}%` }
            ]} 
          />
        </View>
        
        <Text style={styles.progressText}>
          {isLoading 
            ? `Foto trovate: ${stats.totalProcessed}`
            : `Batch ${currentBatch}/${totalBatches} (${Math.round(phaseProgress * 100)}%)`
          }
        </Text>
        
        {!isLoading && (
          <>
            <Text style={styles.statsText}>
              Foto analizzate: {stats.totalProcessed}
            </Text>
            {stats.monochromeCount > 0 && (
              <Text style={styles.statsText}>
                Monocromatiche trovate: {stats.monochromeCount}
              </Text>
            )}
            {(stats.duplicatesFound > 0 || stats.similarPhotosFound > 0) && (
              <Text style={styles.statsText}>
                Foto simili trovate: {stats.duplicatesFound + stats.similarPhotosFound}
              </Text>
            )}
          </>
        )}
        
        <Text style={[styles.infoText, {marginBottom: 10}]}>
          {isLoading 
            ? "Questa operazione potrebbe richiedere alcuni minuti con gallerie ampie..."
            : "Analisi in corso, attendere il completamento..."}
        </Text>
        
        <Button 
          title="Annulla" 
          onPress={() => {
            Alert.alert(
              'Annulla Scansione',
              'Sei sicuro di voler annullare la scansione in corso?',
              [
                { text: 'No', style: 'cancel' },
                { text: 'Sì', onPress: cancelScan }
              ]
            );
          }} 
          color="red" 
        />
      </View>
    );
  }, [isScanning, progress, currentBatch, totalBatches, stats, cancelScan]);
  
  const renderFilters = useCallback(() => {
    const monoCount = stats.monochromeCount;
    const totalSimilar = stats.duplicatesFound + stats.similarPhotosFound;
    
    return (
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === null && styles.activeFilter]} 
            onPress={() => handleFilterPress(null)}
          >
            <Text style={styles.filterText}>Tutti ({results.length})</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === PhotoType.MONOCHROME && styles.activeFilter]} 
            onPress={() => handleFilterPress(PhotoType.MONOCHROME)}
            disabled={monoCount === 0}
          >
            <Text style={styles.filterText}>
              Monocromatiche ({monoCount})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'similar' && styles.activeFilter]} 
            onPress={() => handleFilterPress('similar')}
            disabled={totalSimilar === 0}
          >
            <Text style={styles.filterText}>Simili ({totalSimilar})</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }, [activeFilter, handleFilterPress, results.length, stats]);
  
  // Renderizza i risultati
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scansione Galleria</Text>
        {!isScanning && (
          <Button 
            title="Avvia Scansione" 
            onPress={startScan} 
            disabled={isScanning}
          />
        )}
      </View>
      
      {isScanning && renderProgressBar()}
      
      {!isScanning && results.length > 0 && (
        <>
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Risultati:</Text>
            <Text>Foto analizzate: {stats.totalProcessed}</Text>
            <Text>Foto monocromatiche: {stats.monochromeCount}</Text>
            <Text>Duplicati trovati: {stats.duplicatesFound}</Text>
            <Text>Foto simili: {stats.similarPhotosFound}</Text>
          </View>
          
          {renderFilters()}
          
          <FlatList
            data={getDisplayResults()}
            renderItem={renderResultItem}
            keyExtractor={(item) => item.photo.id}
            numColumns={3}
            contentContainerStyle={styles.resultsContainer}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text>Nessun risultato per questo filtro</Text>
              </View>
            )}
          />
        </>
      )}
      
      {!isScanning && results.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text>Nessun risultato disponibile.</Text>
          <Text>Premi "Avvia Scansione" per analizzare le tue foto.</Text>
        </View>
      )}
      
      {renderDetailView()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  progressContainer: {
    marginBottom: 16
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginVertical: 8
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5
  },
  progressText: {
    textAlign: 'center',
    marginBottom: 8
  },
  statsText: {
    textAlign: 'center',
    marginBottom: 8
  },
  phaseText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#4CAF50'
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4
  },
  statsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  statsTitle: {
    fontWeight: 'bold',
    marginBottom: 4
  },
  filtersContainer: {
    marginBottom: 16
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 20
  },
  activeFilter: {
    backgroundColor: '#2196F3',
  },
  filterText: {
    color: '#000'
  },
  resultsContainer: {
    paddingBottom: 20
  },
  resultItem: {
    width: thumbSize,
    height: thumbSize,
    margin: 4,
    borderRadius: 6,
    overflow: 'hidden'
  },
  thumbImage: {
    width: '100%',
    height: '100%'
  },
  thumbInfo: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
    marginBottom: 4
  },
  similarBadge: {
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)', 
    textShadowOffset: {width: 1, height: 1}, 
    textShadowRadius: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    position: 'relative'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center'
  },
  detailImage: {
    width: '100%',
    height: 200,
    marginBottom: 12
  },
  detailInfo: {
    marginBottom: 12
  },
  colorInfoContainer: {
    marginTop: 8
  },
  colorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ccc'
  },
  colorText: {
    fontWeight: '500'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 8
  },
  similarityScore: {
    marginBottom: 8
  },
  similarList: {
    paddingBottom: 8
  },
  similarThumb: {
    width: 120,
    height: 120,
    marginRight: 8,
    borderRadius: 6
  },
  closeButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold'
  }
});

export default ScanTab;