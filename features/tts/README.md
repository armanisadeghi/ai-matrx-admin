# Text-to-Speech Feature

A complete, production-ready text-to-speech system powered by Groq's PlayAI TTS API.

## Overview

This feature provides fast, high-quality text-to-speech conversion using Groq's `playai-tts` model with 19 English voices. The system includes automatic markdown processing, user preferences, and seamless browser audio playback.

## Architecture

###  🔐 Security-First Design

- **Server-Side API Proxy**: `/app/api/audio/text-to-speech/route.ts`
  - Groq API key stays secure on the server
  - Input validation (10K character limit)
  - Comprehensive error handling

### 🎯 Core Components

```
features/tts/
├── hooks/
│   └── useTextToSpeech.ts          # Main TTS hook
├── components/
│   └── AudioPlayerButton.tsx       # Simple play button
├── types.ts                         # TypeScript definitions
└── index.ts                         # Barrel exports
```

## Quick Start

### 1. Basic Usage

```tsx
import { useTextToSpeech } from '@/features/tts';

function MyComponent() {
  const { speak, isPlaying } = useTextToSpeech({
    autoPlay: true,
    processMarkdown: true,
  });

  return (
    <button onClick={() => speak("Hello world!")}>
      {isPlaying ? 'Playing...' : 'Play Audio'}
    </button>
  );
}
```

### 2. Using the AudioPlayerButton Component

```tsx
import { AudioPlayerButton } from '@/features/tts';

function MyComponent({ content }) {
  return (
    <AudioPlayerButton
      text={content}
      iconOnly
      showTooltip
    />
  );
}
```

## API

### `useTextToSpeech` Hook

The main hook for text-to-speech functionality.

```tsx
const {
  // State
  isGenerating,      // Generating speech audio
  isPlaying,         // Audio is playing
  isPaused,          // Audio is paused
  error,             // Error message
  audioUrl,          // Generated audio URL
  duration,          // Audio duration
  currentTime,       // Current playback time
  
  // Actions
  generateSpeech,    // Generate audio without playing
  speak,             // Generate and optionally play
  play,              // Play generated audio
  pause,             // Pause playback
  resume,            // Resume playback
  stop,              // Stop and cleanup
  setVoice,          // Change voice
  cleanup,           // Manual cleanup
} = useTextToSpeech({
  defaultVoice?: EnglishVoice,
  autoPlay?: boolean,
  processMarkdown?: boolean,
  onPlaybackStart?: () => void,
  onPlaybackEnd?: () => void,
  onError?: (error: string) => void,
});
```

### Available Voices

19 English voices available:

- `Arista-PlayAI` - Female, warm and professional
- `Atlas-PlayAI` - Male, deep and authoritative
- `Basil-PlayAI` - Male, clear and articulate
- `Briggs-PlayAI` - Male, strong and confident
- `Calum-PlayAI` - Male, friendly and approachable
- `Celeste-PlayAI` - Female, elegant and sophisticated
- **`Cheyenne-PlayAI`** - Female, natural and engaging (default)
- `Chip-PlayAI` - Male, energetic and upbeat
- `Cillian-PlayAI` - Male, smooth and calm
- `Deedee-PlayAI` - Female, cheerful and bright
- `Fritz-PlayAI` - Male, technical and precise
- `Gail-PlayAI` - Female, mature and trustworthy
- `Indigo-PlayAI` - Female, modern and versatile
- `Mamaw-PlayAI` - Female, warm and nurturing
- `Mason-PlayAI` - Male, professional and reliable
- `Mikail-PlayAI` - Male, rich and expressive
- `Mitch-PlayAI` - Male, casual and relatable
- `Quinn-PlayAI` - Female, dynamic and confident
- `Thunder-PlayAI` - Male, powerful and commanding

## Markdown Processing

The system automatically processes markdown for speech using `parseMarkdownToText` utility:

**Handles**:
- Code blocks → "Please see the code provided"
- Links → "Link provided"
- Headers → "Section: Title"
- Lists → "Bullet point: Item"
- Emojis → Spoken equivalents
- Abbreviations → Full words (AI → Artificial Intelligence)
- And much more!

**Control**:
```tsx
// Enable (default)
const { speak } = useTextToSpeech({ processMarkdown: true });

// Disable for plain text
const { speak } = useTextToSpeech({ processMarkdown: false });
```

## User Preferences

TTS preferences are stored in Redux (`features/user/userSettingsSlice.ts`):

```tsx
interface UserSettings {
  preferredTtsVoice: EnglishVoice;      // Default: 'Cheyenne-PlayAI'
  ttsAutoPlay: boolean;                  // Default: false
  ttsProcessMarkdown: boolean;           // Default: true
}
```

**Accessing**:
```tsx
import { useAppSelector } from '@/lib/redux/hooks';

const preferredVoice = useAppSelector(
  (state) => state.userSettings.preferredTtsVoice
);
```

**Updating**:
```tsx
import { useAppDispatch } from '@/lib/redux/hooks';
import { setPreferredTtsVoice } from '@/features/user/userSettingsSlice';

const dispatch = useAppDispatch();
dispatch(setPreferredTtsVoice('Atlas-PlayAI'));
```

## Integration Examples

### Example 1: MessageOptionsMenu (✅ Implemented)

```tsx
import { useTextToSpeech } from '@/features/tts';

const MessageOptionsMenu = ({ content }) => {
  const { speak, isGenerating, isPlaying } = useTextToSpeech({
    autoPlay: true,
    processMarkdown: true,
  });

  const menuItems = [
    {
      key: 'play-audio',
      label: 'Play audio',
      action: () => speak(content),
      disabled: isGenerating || isPlaying,
    },
    // ... other menu items
  ];
  
  return <AdvancedMenu items={menuItems} />;
};
```

### Example 2: Chat Message with Audio Button

```tsx
function ChatMessage({ content }) {
  return (
    <div className="flex items-center gap-2">
      <div>{content}</div>
      <AudioPlayerButton text={content} />
    </div>
  );
}
```

### Example 3: Custom Voice Selection

```tsx
import { VOICE_METADATA } from '@/features/tts/types';

function VoiceSelector() {
  const dispatch = useAppDispatch();
  const currentVoice = useAppSelector(state => state.userSettings.preferredTtsVoice);
  
  return (
    <Select value={currentVoice} onChange={(v) => dispatch(setPreferredTtsVoice(v))}>
      {Object.values(VOICE_METADATA).map(voice => (
        <Option key={voice.id} value={voice.id}>
          {voice.name} - {voice.description}
        </Option>
      ))}
    </Select>
  );
}
```

## API Route

### POST `/api/audio/text-to-speech`

**Request (JSON)**:
```json
{
  "text": "Text to convert to speech",
  "voice": "Cheyenne-PlayAI",
  "model": "playai-tts"
}
```

**Response**:
- Success: Audio file (audio/wav)
- Error: JSON with error details

**Limits**:
- Max text length: 10,000 characters
- Output format: WAV
- Cached: 1 year

## Browser Compatibility

✅ **All modern browsers** support:
- Audio() API
- Blob URLs
- Web Audio API (used in the audio transcription feature)

## Performance

### Audio Generation
- **Speed**: ~1-3 seconds for typical messages
- **Caching**: Client-side blob URLs
- **Cleanup**: Automatic resource cleanup

### Memory Usage
- **Per audio**: ~500KB-2MB (WAV format)
- **Automatic cleanup**: On unmount and stop

## Error Handling

The system handles various error scenarios:

- **Text validation**: Empty text, length exceeded
- **API errors**: Authentication, rate limiting
- **Playback errors**: Browser restrictions, codec issues
- **Network errors**: Timeout, connection failures

All errors are:
1. Logged to console
2. Surfaced via `onError` callback
3. Stored in hook state (`error`)
4. Displayed via toast notifications (in components)

## Best Practices

1. **Always provide text validation** before calling `speak()`
2. **Use `processMarkdown: true`** for AI-generated content
3. **Respect user preferences** by reading from Redux
4. **Handle errors gracefully** with onError callback
5. **Cleanup on unmount** (automatic with hook)
6. **Test across browsers** for audio support

## Files Created

```
app/api/audio/text-to-speech/route.ts  - Secure API proxy
features/tts/types.ts                   - TypeScript definitions
features/tts/hooks/useTextToSpeech.ts   - Main TTS hook
features/tts/hooks/index.ts             - Hooks barrel export
features/tts/components/AudioPlayerButton.tsx  - Play button component
features/tts/components/index.ts        - Components barrel export
features/tts/index.ts                   - Feature barrel export
features/tts/README.md                  - This file
features/user/userSettingsSlice.ts      - Updated with TTS preferences
lib/redux/rootReducer.ts                - Updated with userSettings
```

## Future Enhancements

Potential improvements:

- [ ] Voice preview/testing UI
- [ ] Playback speed control
- [ ] Download audio file option
- [ ] Queue multiple messages
- [ ] Background playback
- [ ] Arabic language support
- [ ] Streaming audio (when supported by Groq)

## Troubleshooting

### Issue: "No audio plays"
**Solution**: Check browser console, ensure HTTPS, verify `GROQ_API_KEY` in `.env.local`

### Issue: "Generation is slow"
**Solution**: Check network, reduce text length, verify Groq API status

### Issue: "Voice sounds wrong"
**Solution**: Ensure voice name matches exactly (case-sensitive), check user preferences

### Issue: "Markdown not processing"
**Solution**: Ensure `processMarkdown: true`, verify `parseMarkdownToText` utility works

## Dependencies

- `groq-sdk`: Latest version
- `sonner`: Toast notifications
- React hooks and Next.js 15

---

**Built with** ❤️ **for high-quality voice output**

