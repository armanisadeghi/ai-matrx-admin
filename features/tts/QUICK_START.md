# TTS Quick Start Guide

Quick reference for using the Text-to-Speech system.

## Installation Complete ✅

No additional packages needed. Everything is ready to use!

## Basic Usage

### Option 1: Use the Component (Easiest)

```tsx
import { AudioPlayerButton } from '@/features/tts';

function MyComponent({ content }) {
  return <AudioPlayerButton text={content} />;
}
```

### Option 2: Use the Hook (More Control)

```tsx
import { useTextToSpeech } from '@/features/tts';

function MyComponent({ content }) {
  const { speak, isPlaying, isGenerating } = useTextToSpeech({
    autoPlay: true,
    processMarkdown: true,
  });

  return (
    <button 
      onClick={() => speak(content)}
      disabled={isGenerating || isPlaying}
    >
      {isGenerating ? 'Generating...' : isPlaying ? 'Playing...' : 'Play'}
    </button>
  );
}
```

## User Preferences

### Get User's Preferred Voice

```tsx
import { useAppSelector } from '@/lib/redux/hooks';

const preferredVoice = useAppSelector(
  state => state.userSettings.preferredTtsVoice
);
```

### Set User's Preferred Voice

```tsx
import { useAppDispatch } from '@/lib/redux/hooks';
import { setPreferredTtsVoice } from '@/features/user/userSettingsSlice';

const dispatch = useAppDispatch();
dispatch(setPreferredTtsVoice('Atlas-PlayAI'));
```

## Available Voices

Default: **Cheyenne-PlayAI**

All 19 voices:
```
Arista, Atlas, Basil, Briggs, Calum, Celeste, Cheyenne,
Chip, Cillian, Deedee, Fritz, Gail, Indigo, Mamaw, Mason,
Mikail, Mitch, Quinn, Thunder
```

All voices suffixed with `-PlayAI` (e.g., `Cheyenne-PlayAI`)

## Markdown Processing

**Enabled by default** - Converts markdown to speech-friendly text.

To disable:
```tsx
const { speak } = useTextToSpeech({ processMarkdown: false });
```

## Common Patterns

### Play with Custom Voice

```tsx
const { speak } = useTextToSpeech();

speak(content, { voice: 'Thunder-PlayAI' });
```

### Handle Errors

```tsx
const { speak } = useTextToSpeech({
  onError: (error) => {
    console.error('TTS Error:', error);
    toast.error('Speech failed', { description: error });
  }
});
```

### Playback Controls

```tsx
const { speak, pause, resume, stop, isPlaying, isPaused } = useTextToSpeech();

// Start
await speak(content);

// Pause
if (isPlaying) pause();

// Resume  
if (isPaused) await resume();

// Stop completely
stop();
```

## Integration Example

```tsx
import { AudioPlayerButton } from '@/features/tts';
import { useAppSelector } from '@/lib/redux/hooks';

function ChatMessage({ content }) {
  const preferredVoice = useAppSelector(
    state => state.userSettings.preferredTtsVoice
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">{content}</div>
      <AudioPlayerButton 
        text={content} 
        voice={preferredVoice}
      />
    </div>
  );
}
```

## Testing

### In MessageOptionsMenu (Already Working!)

1. Go to any chat
2. Click three-dot menu on AI message
3. Click "Play audio" (speaker icon)
4. Audio plays!

### Test Markdown

Try messages with:
- Code blocks → "Please see the code provided"
- Links → "Link provided"
- Headers → "Section: Title"
- Emojis → Spoken descriptions

## API Route

Direct API calls (usually not needed, use hooks):

```tsx
const response = await fetch('/api/audio/text-to-speech', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Hello world',
    voice: 'Cheyenne-PlayAI',
    model: 'playai-tts',
  }),
});

const audioBlob = await response.blob();
const audioUrl = URL.createObjectURL(audioBlob);
```

## Troubleshooting

**No audio?**
- Check GROQ_API_KEY in .env.local
- Check browser console for errors
- Verify HTTPS (required for audio)

**Wrong voice?**
- Check Redux state: `state.userSettings.preferredTtsVoice`
- Voice names are case-sensitive

**Slow generation?**
- Normal: 1-3 seconds
- Check Groq API status
- Reduce text length

## Need Help?

See full docs: `features/tts/README.md`

---

**That's it! You're ready to add voice to your app! 🎙️**

