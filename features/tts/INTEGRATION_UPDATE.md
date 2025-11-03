# TTS Integration Update

## ✅ Corrected Integration with User Preferences

The TTS system has been properly integrated with the existing `userPreferencesSlice` instead of creating a duplicate settings system.

## Changes Made

### 1. Updated User Preferences Slice ✅

**File**: `lib/redux/slices/userPreferencesSlice.ts`

Added new `TextToSpeechPreferences` interface and `GroqTtsVoice` type:

```typescript
export type GroqTtsVoice = 
    | 'Arista-PlayAI'
    | 'Atlas-PlayAI'
    // ... 19 total voices
    | 'Thunder-PlayAI';

export interface TextToSpeechPreferences {
    preferredVoice: GroqTtsVoice;
    autoPlay: boolean;
    processMarkdown: boolean;
}
```

Added `textToSpeech` to the `UserPreferences` interface:

```typescript
export interface UserPreferences {
    display: DisplayPreferences;
    voice: VoicePreferences;  // Existing - for separate voice service
    textToSpeech: TextToSpeechPreferences;  // NEW - for Groq TTS
    assistant: AssistantPreferences;
    // ... other preferences
}
```

Default values:
```typescript
textToSpeech: {
    preferredVoice: 'Cheyenne-PlayAI',
    autoPlay: false,
    processMarkdown: true,
}
```

### 2. Updated TTS Types ✅

**File**: `features/tts/types.ts`

Now re-exports `GroqTtsVoice` from userPreferencesSlice for consistency:

```typescript
export type { GroqTtsVoice as EnglishVoice } from '@/lib/redux/slices/userPreferencesSlice';
```

### 3. Updated Components ✅

**MessageOptionsMenu**: 
```typescript
const preferredVoice = useAppSelector(
  (state) => state.userPreferences?.textToSpeech?.preferredVoice || 'Cheyenne-PlayAI'
);
const ttsProcessMarkdown = useAppSelector(
  (state) => state.userPreferences?.textToSpeech?.processMarkdown ?? true
);
```

**AudioPlayerButton**: Same pattern as above.

### 4. Removed Duplicate Files ✅

- ❌ Deleted `features/user/userSettingsSlice.ts` (was unused duplicate)
- ❌ Removed from `lib/redux/rootReducer.ts`

## Usage

### Access TTS Preferences

```typescript
import { useAppSelector } from '@/lib/redux/hooks';

const preferredVoice = useAppSelector(
  state => state.userPreferences.textToSpeech.preferredVoice
);
const autoPlay = useAppSelector(
  state => state.userPreferences.textToSpeech.autoPlay
);
const processMarkdown = useAppSelector(
  state => state.userPreferences.textToSpeech.processMarkdown
);
```

### Update TTS Preferences

```typescript
import { useAppDispatch } from '@/lib/redux/hooks';
import { setModulePreferences } from '@/lib/redux/slices/userPreferencesSlice';

const dispatch = useAppDispatch();

// Update single preference
dispatch(setModulePreferences({
  module: 'textToSpeech',
  preferences: {
    preferredVoice: 'Atlas-PlayAI'
  }
}));

// Update multiple preferences
dispatch(setModulePreferences({
  module: 'textToSpeech',
  preferences: {
    preferredVoice: 'Thunder-PlayAI',
    autoPlay: true,
    processMarkdown: false
  }
}));
```

### Save to Database

```typescript
import { saveModulePreferencesToDatabase } from '@/lib/redux/slices/userPreferencesSlice';

// Save just TTS preferences
dispatch(saveModulePreferencesToDatabase({
  module: 'textToSpeech',
  preferences: {
    preferredVoice: 'Celeste-PlayAI'
  }
}));
```

## Integration with Existing Preferences UI

The TTS preferences are now part of the existing preferences system at:
- **Route**: `/dashboard/preferences`
- **Component**: `components/user-preferences/PreferencesPage`

To add TTS settings to the preferences UI, you would add a new section in the `PreferencesPage` component similar to other preference modules (display, voice, assistant, etc.).

### Example UI Integration

```typescript
// In PreferencesPage component
import { ENGLISH_VOICES, VOICE_METADATA } from '@/features/tts/types';
import { setModulePreferences } from '@/lib/redux/slices/userPreferencesSlice';

// Get current preferences
const ttsPrefs = useAppSelector(state => state.userPreferences.textToSpeech);

// Voice selector
<Select
  value={ttsPrefs.preferredVoice}
  onChange={(voice) => dispatch(setModulePreferences({
    module: 'textToSpeech',
    preferences: { preferredVoice: voice }
  }))}
>
  {ENGLISH_VOICES.map(voice => (
    <Option key={voice} value={voice}>
      {VOICE_METADATA[voice].name} - {VOICE_METADATA[voice].description}
    </Option>
  ))}
</Select>

// Auto-play toggle
<Switch
  checked={ttsPrefs.autoPlay}
  onChange={(checked) => dispatch(setModulePreferences({
    module: 'textToSpeech',
    preferences: { autoPlay: checked }
  }))}
/>

// Markdown processing toggle
<Switch
  checked={ttsPrefs.processMarkdown}
  onChange={(checked) => dispatch(setModulePreferences({
    module: 'textToSpeech',
    preferences: { processMarkdown: checked }
  }))}
/>
```

## Key Points

✅ **No Duplication**: Uses existing `userPreferencesSlice` system
✅ **Database Integration**: Automatic save to `user_preferences` table
✅ **Proper Separation**: `voice` for separate voice service, `textToSpeech` for Groq TTS
✅ **Type Safety**: `GroqTtsVoice` type ensures only valid voices
✅ **Default Values**: Sensible defaults that work out of the box
✅ **Async Support**: Built-in loading, error states, and save tracking via `_meta`

## Benefits

1. **Single Source of Truth**: All user preferences in one place
2. **Database Persistence**: Automatic save to Supabase
3. **Consistent API**: Same pattern as other preference modules
4. **UI Ready**: Can be added to existing PreferencesPage
5. **Type Safe**: TypeScript ensures correct voice names
6. **No Breaking Changes**: Existing preferences untouched

---

**Status**: ✅ Complete and properly integrated with existing user preferences system!

