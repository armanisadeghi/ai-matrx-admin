# Voice Notes Feature

A complete voice recording and playback system with IndexedDB persistence.

## Features

- **Audio Recording**: Record voice notes with real-time duration tracking
- **Playback Controls**: Play, pause, and manage recordings
- **Local Storage**: All recordings stored in IndexedDB (no server required)
- **Recording Management**: View, play, and delete recordings
- **Status Tracking**: Visual indicators for recording, paused, and playback states
- **Metadata**: Track file size, duration, quality settings, and timestamps

## Architecture

### Data Layer
- **IDB Store** (`lib/idb/stores/audio-store.ts`): IndexedDB persistence layer
- **Types** (`types/audioRecording.types.ts`): TypeScript definitions
- **Hooks** (`hooks/useAudioStore.ts`): React hook wrapper for store operations

### Business Logic
- **useVoiceNotes**: Main audio recording hook with full lifecycle management
- **useVideoNotes**: Video recording variant (supports both audio and video)
- **useRecorder**: Lower-level recorder hook with direct MediaRecorder access
- **useRecorderBase**: Base recorder implementation without persistence

### UI Components
- **RecordingControls**: Recording interface with start/stop/pause controls
- **RecordingsList**: Grid view of all saved recordings
- **RecordingItem**: Individual recording card with playback and delete

## Usage

The page is accessible at `/voice-notes` and provides:

1. **Record**: Click "Start Recording" to begin
2. **Control**: Pause/resume during recording
3. **Save**: Stop recording to save to IndexedDB
4. **Playback**: Click play on any saved recording
5. **Delete**: Remove unwanted recordings

## Technical Details

### Storage
- **Database**: `voiceNotesDB` (version 2)
- **Stores**: 
  - `recordings`: Recording metadata
  - `recordingChunks`: Audio blob chunks
- **Format**: WebM with Opus codec
- **Quality**: 128kbps, 48kHz sample rate

### Recording Process
1. Request microphone permissions
2. Create MediaRecorder with WebM/Opus
3. Capture audio in 1-second chunks
4. Store chunks in IndexedDB progressively
5. Update metadata on completion

### Playback Process
1. Fetch recording metadata
2. Retrieve all audio chunks
3. Combine chunks into single Blob
4. Create object URL and play

## Dependencies

- `react-media-recorder`: MediaRecorder React wrapper
- `format-duration`: Duration formatting utility
- `idb`: IndexedDB Promise wrapper
- ShadCN UI components: Button, Card, Badge

## Future Enhancements

- Waveform visualization
- Audio trimming/editing
- Export to file system
- Cloud sync/backup
- Transcription integration
- Search and filtering
- Tagging and categorization

