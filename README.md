# Ordy

A React Native mobile application that analyzes your photo gallery to detect monochromatic images and find similar/duplicate photos using advanced image processing algorithms.

<div style="display: flex; justify-content: space-between;">
  <img src="https://i.imgur.com/RaticEP.jpeg" alt="Gallery View" width="30%"/>
  <img src="https://i.imgur.com/Nqt2oAV.jpeg" alt="Scan Results" width="30%"/>
  <img src="https://i.imgur.com/aCjPyH5.jpeg" alt="Scanning" width="30%"/>
</div>

## Technical Architecture

### Core Components

- **PhotoGrid**: Renders photo collection in a customizable grid with efficient memory management
- **ScanTab**: Manages scanning workflows and result visualization
- **BatchProcessor**: Handles concurrent image analysis operations

### Key Technologies

- React Native + TypeScript
- Expo Media Library for asset access
- SHA-256 perceptual hashing for image similarity detection
- Parallel processing architecture for analyzing large photo libraries

## Features

### Gallery Management
- Paginated loading of device media
- Responsive grid display with date metadata
- Modal view for photo inspection
- Pull-to-refresh and infinite scroll implementations

### Photo Analysis
- **Monochrome Detection**: Identifies images with color uniformity above 92%
- **Similarity Detection**: Finds similar photos with >87% hash similarity
- **Duplicate Detection**: Identifies near-identical photos with >98% hash similarity
- Real-time progress tracking with dual-phase progress display

### Performance Optimizations
- Batch processing with configurable chunk sizes
- In-memory caching of analysis results
- Limited parallel operations to prevent device overload
- Progressive asset loading for large libraries

## Implementation Details

### Image Analysis Pipeline

1. **Asset Retrieval**: Efficiently loads photo metadata in configurable batches
2. **Perceptual Hashing**: Generates compact signatures for similarity comparison
   - Images are resized to 16×16px
   - Color data is transformed into cryptographic hash
3. **Color Analysis**: Identifies monochromatic images
   - Samples color distribution in 32×32px downsamples
   - Calculates variance across color spectrum
   - Applies 92% uniformity threshold for classification
4. **Similarity Comparison**: Compares hash signatures using Hamming distance algorithm

### Configuration Constants
- `HASH_SIZE`: 16px (hash generation dimensions)
- `COLOR_ANALYSIS_SIZE`: 32px (color analysis dimensions)
- `MONOCHROME_THRESHOLD`: 0.92 (92% color uniformity)
- `SIMILARITY_THRESHOLD`: 0.87 (87% hash similarity)
- `BATCH_SIZE`: 100 (photos processed per batch)
- `MAX_PARALLEL_OPERATIONS`: 25 (concurrent operations)

## Getting Started

### Prerequisites
- Node.js 12+
- React Native environment
- Expo CLI

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/ordy.git

# Install dependencies
cd ordy
npm install

# Start development server
expo start
```

## Performance Considerations

The application implements several optimizations for processing large photo libraries:
- **Memory-efficient processing**: Photos are processed in configurable batches
- **Operation throttling**: Parallel operations are limited to prevent device lockup
- **Progressive loading**: Two-phase loading strategy for improved UX
- **Hash caching**: Previously processed images are cached to avoid redundant processing
