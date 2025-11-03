# Audio Transcription - Quick Start Guide

## 🚀 Get Started in 60 Seconds

### Step 1: Verify Environment Variable

Ensure your `.env.local` has the Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

If you just added it, restart your dev server.

### Step 2: Test It Out!

#### Option A: Test in PromptInput

1. Navigate to any prompt editing page (e.g., `/ai/prompts/edit/[any-id]`)
2. Look for the **microphone icon** in the bottom left of the input area
3. Click it
4. Allow microphone access when your browser asks (first time only)
5. Speak your message
6. Click "Stop" (or click the mic icon again)
7. Watch as it transcribes and **automatically submits**!

#### Option B: Test in PromptGenerator

1. Navigate to `/ai/prompts`
2. Find and click a button to generate a new prompt
3. Look for the **"Explain it Instead"** button (gradient purple/blue)
4. Click it
5. Speak your prompt description
6. Click "Stop Recording"
7. See your voice transcribed into the text field!

## 🎯 Use It Anywhere

### Example 1: Simple Voice Input

```tsx
import { useRecordAndTranscribe } from '@/features/audio';

function MyComponent() {
  const [text, setText] = useState('');
  
  const { isRecording, isTranscribing, startRecording, stopRecording } = 
    useRecordAndTranscribe({
      onTranscriptionComplete: (result) => setText(result.text),
    });

  return (
    <>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isTranscribing ? 'Transcribing...' : isRecording ? 'Stop' : 'Record'}
      </button>
      <p>{text}</p>
    </>
  );
}
```

### Example 2: Pre-built Button

```tsx
import { VoiceInputButton } from '@/features/audio';

function MyComponent() {
  return (
    <VoiceInputButton
      buttonText="Voice Input"
      onTranscriptionComplete={(text) => console.log(text)}
    />
  );
}
```

## 💡 Tips for Best Results

1. **Speak clearly** and at a normal pace
2. **Minimize background noise** for better accuracy
3. **Use the language parameter** if you know it (improves speed):
   ```tsx
   transcriptionOptions={{ language: 'en' }}
   ```
4. **Provide context** for technical terms:
   ```tsx
   transcriptionOptions={{ 
     prompt: 'Discussion about React hooks and TypeScript'
   }}
   ```

## 🎨 Available Components

1. **VoiceInputButton** - Complete solution, handles everything
2. **MicrophoneButton** - Simple mic icon with states
3. **TranscriptionLoader** - Shows "Transcribing..." state
4. **RecordingIndicator** - Shows recording duration

## 🔧 Troubleshooting

**Issue**: Microphone not working
- Check browser permissions (camera icon in address bar)
- Ensure you're on HTTPS (localhost is ok)
- Try a different browser

**Issue**: Transcription fails
- Check `.env.local` has `GROQ_API_KEY`
- Restart dev server after adding env variable
- Check console for specific error messages

**Issue**: Audio quality poor
- Ensure good microphone
- Reduce background noise
- Speak at normal volume (not too loud/quiet)

## 📖 Full Documentation

For complete API reference, examples, and advanced usage:
- See `features/audio/README.md`
- See `features/audio/IMPLEMENTATION_SUMMARY.md`

## ✅ That's It!

You're ready to add voice input anywhere in your application. The system handles:
- ✅ Browser permissions
- ✅ Audio recording
- ✅ File format conversion
- ✅ Secure API calls
- ✅ Transcription
- ✅ Error handling
- ✅ Loading states
- ✅ Visual feedback

Just import and use! 🎉

