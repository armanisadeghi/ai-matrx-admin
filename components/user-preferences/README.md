# User Preferences System

A comprehensive system for managing user preferences with URL navigation support and modal access.

## Features

✅ **14 Preference Modules**: Display, Prompts, Voice, TTS, Assistant, Email, Video, Photo, Images, Text, Coding, Flashcards, Playground, AI Models  
✅ **URL Parameter Support**: Direct navigation to specific tabs  
✅ **Modal System**: Access preferences from anywhere in the app  
✅ **Mobile Optimized**: iOS-friendly bottom sheet style on mobile  
✅ **Auto-Save**: Changes tracked with save/reset functionality  
✅ **Type-Safe**: Full TypeScript support  

---

## Usage

### 1. URL Navigation (Page-Based)

Navigate users directly to specific preference tabs:

```tsx
import Link from 'next/link';

// Link to specific tab
<Link href="/settings/preferences?tab=prompts">
  Prompts Settings
</Link>

// Or using router
import { useRouter } from 'next/navigation';

const router = useRouter();
router.push('/settings/preferences?tab=prompts');
```

**Available Tab Values:**
- `display` - Display preferences
- `prompts` - Prompts preferences ⭐ NEW
- `voice` - Voice preferences
- `textToSpeech` - Text-to-speech preferences
- `assistant` - Assistant preferences
- `email` - Email preferences
- `videoConference` - Video conference preferences
- `photoEditing` - Photo editing preferences
- `imageGeneration` - Image generation preferences
- `textGeneration` - Text generation preferences
- `coding` - Coding preferences
- `flashcard` - Flashcard preferences
- `playground` - Playground preferences
- `aiModels` - AI Models preferences

---

### 2. Modal System

Open preferences as a modal from anywhere in your app:

```tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import PreferencesModal from '@/components/user-preferences/PreferencesModal';
import { usePreferencesModal } from '@/hooks/user-preferences/usePreferencesModal';

export function MyComponent() {
    const { isOpen, activeTab, openPreferences, closePreferences } = usePreferencesModal();

    return (
        <>
            {/* Open to default tab */}
            <Button onClick={() => openPreferences()}>
                Open Preferences
            </Button>

            {/* Open to specific tab */}
            <Button onClick={() => openPreferences('prompts')}>
                Prompts Settings
            </Button>

            {/* The modal component */}
            <PreferencesModal 
                isOpen={isOpen} 
                onClose={closePreferences}
                initialTab={activeTab}
            />
        </>
    );
}
```

---

### 3. Accessing Preference Values

Use Redux selectors to access preference values in your components:

```tsx
import { useAppSelector } from '@/lib/redux';
import { selectPromptsPreferences } from '@/lib/redux/selectors/usePreferenceSelectors';

function MyComponent() {
    const promptsPrefs = useAppSelector(selectPromptsPreferences);
    
    // Access values
    const defaultModel = promptsPrefs.defaultModel;
    const temperature = promptsPrefs.defaultTemperature;
    const submitOnEnter = promptsPrefs.submitOnEnter;
    
    // Use them in your logic
    if (submitOnEnter) {
        // Handle enter key submission
    }
}
```

**Available Selectors:**
```typescript
import {
    selectDisplayPreferences,
    selectPromptsPreferences,
    selectVoicePreferences,
    selectTextToSpeechPreferences,
    selectAssistantPreferences,
    selectEmailPreferences,
    selectVideoConferencePreferences,
    selectPhotoEditingPreferences,
    selectImageGenerationPreferences,
    selectTextGenerationPreferences,
    selectCodingPreferences,
    selectFlashcardPreferences,
    selectPlaygroundPreferences,
    selectAiModelsPreferences,
    selectSystemPreferences,
} from '@/lib/redux/selectors/usePreferenceSelectors';
```

---

## Prompts Preferences

The new Prompts preferences module includes:

1. **Show Settings on Main Page** (boolean) - Toggle settings visibility
2. **Default Model** (string) - Select from active AI models
3. **Default Temperature** (number: 0-2) - Control creativity/randomness
4. **Always Include Internal Web Search** (boolean) - Auto-enable web search
5. **Include "Thinking" in Auto-Generated Prompts** (none | simple | deep)
6. **Submit on Enter** (boolean) - Enter key behavior
7. **Auto Clear Responses in Edit Mode** (boolean) - Clear previous responses

### Example: Using Prompts Preferences

```tsx
import { useAppSelector } from '@/lib/redux';
import { selectPromptsPreferences } from '@/lib/redux/selectors/usePreferenceSelectors';

function PromptInput() {
    const promptsPrefs = useAppSelector(selectPromptsPreferences);
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (promptsPrefs.submitOnEnter) {
                e.preventDefault();
                // Submit message
            }
            // Otherwise, allow new line
        }
    };
    
    return <textarea onKeyDown={handleKeyDown} />;
}
```

---

## Mobile Behavior

The modal automatically adapts to mobile devices:

- **Desktop**: Centered dialog with max-width
- **Mobile**: Bottom sheet (iOS-style) taking 90% of viewport height
- **Smooth Animations**: Fade and slide transitions
- **Touch-Friendly**: Larger tap targets and spacing
- **Scroll Optimization**: Proper scroll behavior within modal

---

## Architecture

### Components

- **`PreferencesPage.tsx`** - Full-page preferences with URL support
- **`PreferencesModal.tsx`** - Modal wrapper with all tabs
- **`Prompts Preferences.tsx`** - Prompts-specific settings (and 13 other modules)

### Hooks

- **`usePreferencesModal.ts`** - Manage modal state
- **`usePreferenceValue.ts`** - Get/set individual preference values

### Redux

- **State**: `lib/redux/slices/userPreferencesSlice.ts`
- **Selectors**: `lib/redux/selectors/usePreferenceSelectors.ts`
- **Loaded**: Server-side in `app/(authenticated)/layout.tsx`

---

## Best Practices

1. **Always use selectors** - Don't access state directly
2. **Link to specific tabs** - Provide direct links for better UX
3. **Use modals for quick access** - Don't force users to navigate to settings page
4. **Test on mobile** - Ensure touch targets are adequate
5. **Handle unsaved changes** - Modal warns users before closing

---

## Adding New Preference Modules

To add a new preference module:

1. Add interface to `userPreferencesSlice.ts`
2. Create component in `components/user-preferences/`
3. Add to `PreferencesPage.tsx` and `PreferencesModal.tsx`
4. Create selector in `usePreferenceSelectors.ts`
5. Update `PreferenceTab` type

---

## Support

For questions or issues, check:
- Type definitions in `lib/redux/slices/userPreferencesSlice.ts`
- Examples in `PreferencesModalExample.tsx`
- Selector usage in `lib/redux/selectors/usePreferenceSelectors.ts`

