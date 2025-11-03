# Audio Feature - Speech-to-Text Transcription

A complete, production-ready audio recording and transcription system powered by Groq's Whisper API.

## Overview

This feature provides fast, secure speech-to-text transcription using Groq's `whisper-large-v3-turbo` model, optimized for speed and multilingual support. The system is built with security in mind, using a server-side proxy to protect API keys while maintaining optimal performance.

## Architecture

### 🔐 Security-First Design

- **Server-Side API Proxy**: `/app/api/audio/transcribe/route.ts`
  - Groq API key stays secure on the server
  - Input validation and file size limits
  - Rate limiting awareness
  - Comprehensive error handling

### 🎯 Core Components

```
features/audio/
├── hooks/
│   ├── useAudioTranscription.ts     # Handles API calls for transcription
│   ├── useSimpleRecorder.ts         # Lightweight audio recording
│   └── useRecordAndTranscribe.ts    # Combined recording + transcription
├── components/
│   ├── MicrophoneButton.tsx         # Simple mic button with states
│   ├── TranscriptionLoader.tsx      # Loading indicator
│   ├── RecordingIndicator.tsx       # Recording status display
│   └── VoiceInputButton.tsx         # Complete voice input solution
├── types.ts                         # TypeScript definitions
└── index.ts                         # Barrel exports
```

## Quick Start

### 1. Environment Setup

Ensure your `.env.local` has the Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 2. Simple Implementation

```tsx
import { useRecordAndTranscribe } from '@/features/audio';

function MyComponent() {
  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
  } = useRecordAndTranscribe({
    onTranscriptionComplete: (result) => {
      console.log('Transcribed text:', result.text);
    },
    autoTranscribe: true,
  });

  return (
    <button onClick={isRecording ? stopRecording : startRecording}>
      {isRecording ? 'Stop' : 'Record'}
    </button>
  );
}
```

### 3. Using Pre-built Components

```tsx
import { VoiceInputButton } from '@/features/audio';

function MyComponent() {
  return (
    <VoiceInputButton
      variant="button"
      buttonText="Explain it Instead"
      onTranscriptionComplete={(text) => {
        console.log('Transcribed:', text);
      }}
    />
  );
}
```

## Hooks API

### `useRecordAndTranscribe`

The main hook that combines recording and transcription.

```tsx
const {
  // Recording state
  isRecording,
  isPaused,
  duration,
  
  // Transcription state
  isTranscribing,
  transcriptionResult,
  
  // Combined state
  isProcessing,
  error,
  recordedBlob,
  
  // Actions
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  manualTranscribe,
  reset,
} = useRecordAndTranscribe({
  onTranscriptionComplete?: (result: TranscriptionResult) => void,
  onError?: (error: string) => void,
  autoTranscribe?: boolean, // Default: true
  transcriptionOptions?: {
    language?: string,  // ISO-639-1 code (e.g., 'en', 'es')
    prompt?: string,    // Context for better accuracy
  },
});
```

### `useSimpleRecorder`

Lightweight recording hook without transcription.

```tsx
const {
  isRecording,
  isPaused,
  duration,
  audioBlob,
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  reset,
} = useSimpleRecorder({
  onRecordingComplete?: (blob: Blob) => void,
  onError?: (error: string) => void,
});
```

### `useAudioTranscription`

Standalone transcription hook (no recording).

```tsx
const {
  transcribe,
  isTranscribing,
  error,
  result,
  reset,
} = useAudioTranscription();

// Usage
const result = await transcribe(audioBlob, {
  language: 'en',
  prompt: 'Technical discussion about AI',
});
```

## Components API

### `VoiceInputButton`

Complete voice input solution with automatic state management.

```tsx
<VoiceInputButton
  variant="button" | "inline"          // Button with text or inline icon
  buttonText="Explain it Instead"      // Button text (button variant)
  size="sm" | "md" | "lg"             // Size
  onTranscriptionComplete={(text) => {}} // Required callback
  onError={(error) => {}}              // Optional error handler
  className="..."                      // Optional styling
  disabled={false}                     // Optional disable
/>
```

**Variants:**
- `button`: Shows as a styled button with text and icon
- `inline`: Shows as a simple microphone icon

**States:**
- Idle: Shows button/icon
- Recording: Shows recording indicator with duration
- Transcribing: Shows loading spinner with "Transcribing..." text

### `MicrophoneButton`

Simple microphone button with visual states.

```tsx
<MicrophoneButton
  isRecording={false}
  isProcessing={false}
  disabled={false}
  size="icon" | "sm" | "default" | "lg"
  variant="ghost" | "default" | "outline" | ...
  onClick={() => {}}
  showLabel={false}
  className="..."
  tooltip="Start recording"
/>
```

### `TranscriptionLoader`

Loading indicator for transcription process.

```tsx
<TranscriptionLoader
  message="Transcribing"
  duration={30}  // Optional: show duration
  size="sm" | "md" | "lg"
  className="..."
/>
```

### `RecordingIndicator`

Visual indicator for active recording.

```tsx
<RecordingIndicator
  duration={15}  // Current recording duration in seconds
  size="sm" | "md" | "lg"
  showPulse={true}
  className="..."
/>
```

## Implementation Examples

### Example 1: Auto-Submit Chat Input (PromptInput.tsx)

```tsx
import { useRecordAndTranscribe, TranscriptionLoader } from '@/features/audio';
import { Mic } from 'lucide-react';

function PromptInput({ chatInput, onChatInputChange, onSendMessage }) {
  const {
    isRecording,
    isTranscribing,
    duration,
    startRecording,
    stopRecording,
  } = useRecordAndTranscribe({
    onTranscriptionComplete: (result) => {
      if (result.success && result.text) {
        // Append to existing input
        const newText = chatInput ? `${chatInput}\n${result.text}` : result.text;
        onChatInputChange(newText);
        
        // Auto-submit
        setTimeout(() => onSendMessage(), 100);
        
        toast.success('Voice transcribed successfully');
      }
    },
    onError: (error) => {
      toast.error('Transcription failed', { description: error });
    },
    autoTranscribe: true,
  });

  return (
    <div>
      {isTranscribing ? (
        <TranscriptionLoader duration={duration} size="sm" />
      ) : isRecording ? (
        <Button onClick={stopRecording}>
          <Mic className="animate-pulse" />
          Stop ({Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')})
        </Button>
      ) : (
        <Button onClick={startRecording}>
          <Mic /> Record
        </Button>
      )}
    </div>
  );
}
```

### Example 2: "Explain it Instead" Button (PromptGenerator.tsx)

```tsx
import { VoiceInputButton } from '@/features/audio';

function PromptGenerator({ promptPurpose, setPromptPurpose }) {
  return (
    <div>
      <Label>
        Prompt Purpose
        <VoiceInputButton
          variant="button"
          buttonText="Explain it Instead"
          size="sm"
          onTranscriptionComplete={(text) => {
            const newText = promptPurpose ? `${promptPurpose}\n${text}` : text;
            setPromptPurpose(newText);
            toast.success('Voice explanation added');
          }}
          onError={(error) => {
            toast.error('Voice input failed', { description: error });
          }}
        />
      </Label>
      <Textarea value={promptPurpose} onChange={...} />
    </div>
  );
}
```

## API Route

### POST `/api/audio/transcribe`

Securely transcribes audio files using Groq's Whisper API.

**Request (FormData):**
```typescript
{
  file: File,           // Required: Audio file
  language?: string,    // Optional: ISO-639-1 language code
  prompt?: string,      // Optional: Context for better accuracy
}
```

**Response:**
```typescript
{
  success: true,
  text: string,                    // Transcribed text
  language?: string,               // Detected/specified language
  duration?: number,               // Audio duration in seconds
  segments?: TranscriptionSegment[] // Detailed segments with timestamps
}
```

**Error Response:**
```typescript
{
  error: string,
  details?: string
}
```

**Supported Audio Formats:**
- FLAC
- MP3
- MP4
- MPEG
- MPGA
- M4A
- OGG
- WAV
- WebM (recommended for browser recording)

**File Size Limits:**
- Free tier: 25MB
- Dev tier: 100MB

**Rate Limiting:**
- The API handles 429 responses gracefully
- Errors are returned to the client with appropriate messages

## Technical Details

### Audio Recording Configuration

```typescript
{
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 16000,  // Optimal for Whisper
}
```

### Recording Format

- **MIME Type**: `audio/webm;codecs=opus`
- **Fallback**: `audio/webm`
- **Sample Rate**: 16KHz (optimized for speech recognition)
- **Channels**: Mono

### Transcription Model

- **Model**: `whisper-large-v3-turbo`
- **Speed**: Fastest available
- **Multilingual**: Supports 90+ languages
- **Temperature**: 0.0 (most accurate)
- **Response Format**: `verbose_json` (includes metadata)

### Browser Permissions

The system automatically requests microphone permissions when recording starts. Users will be prompted by their browser the first time. The permission state is managed by the browser and persists across sessions once granted.

## Performance Optimizations

1. **Client-Side Audio Processing**
   - Records at 16KHz (Whisper's native sample rate)
   - Uses opus codec for smallest file size
   - Minimizes upload time

2. **Server-Side Processing**
   - Direct stream to Groq API (no temporary storage)
   - Validates files before processing
   - Returns errors immediately

3. **UI/UX Optimizations**
   - Real-time duration display during recording
   - Smooth state transitions
   - Prevents duplicate actions with proper state management

## Error Handling

The system handles various error scenarios:

- **Microphone Access Denied**: User-friendly error message
- **API Authentication Failure**: Logged server-side, generic message to user
- **Rate Limiting**: Informative message to try again later
- **File Size Exceeded**: Clear message with size limit
- **Invalid File Type**: List of supported formats
- **Network Errors**: Graceful degradation with retry option
- **Empty Audio**: Handled by Groq API

## Best Practices

1. **Always provide `onError` callback** to handle failures gracefully
2. **Use `autoTranscribe: true`** for seamless user experience
3. **Consider adding `language` parameter** if you know the input language (improves accuracy and speed)
4. **Use `prompt` parameter** to provide context for better transcription of technical terms, names, etc.
5. **Show recording duration** to users so they know the system is working
6. **Disable UI elements** during recording/transcription to prevent duplicate actions
7. **Provide feedback** via toasts or UI messages for all state changes

## Future Enhancements

Potential improvements for future iterations:

- [ ] Audio chunk streaming for longer recordings
- [ ] Support for multiple language detection
- [ ] Custom vocabulary support
- [ ] Audio quality analysis and warnings
- [ ] Saved recordings with IndexedDB integration
- [ ] Voice activity detection (VAD)
- [ ] Real-time streaming transcription
- [ ] Speaker diarization
- [ ] Timestamp-based navigation

## Troubleshooting

### Issue: "Microphone access denied"
**Solution**: Check browser permissions, ensure HTTPS, guide user to enable microphone in browser settings.

### Issue: "Transcription taking too long"
**Solution**: Check audio file size, network connection. Consider chunking for very long recordings.

### Issue: "Poor transcription quality"
**Solution**: 
- Ensure clear audio input (reduce background noise)
- Use the `language` parameter to specify the language
- Add context via the `prompt` parameter
- Check microphone quality

### Issue: "API key not found"
**Solution**: Ensure `GROQ_API_KEY` is set in `.env.local` and restart development server.

## Dependencies

- `groq-sdk`: Latest version for Whisper API access
- `sonner`: For toast notifications
- Standard React hooks and Next.js 15 App Router

## License

Part of the AI Matrx application.

---

**Built with** ❤️ **for fast, secure, and reliable voice input**

