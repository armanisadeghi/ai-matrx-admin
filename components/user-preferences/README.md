# User Preferences System - Technical Documentation

## Architecture Overview

### State Management
- **Redux Store**: `lib/redux/slices/userPreferencesSlice.ts`
- **Server-Side Loading**: `app/(authenticated)/layout.tsx` (loads before any page renders)
- **Selectors**: `lib/redux/selectors/usePreferenceSelectors.ts`
- **Middleware**: Syncs with Supabase on changes

### Available Modules
```typescript
type PreferenceTab = 'display' | 'prompts' | 'voice' | 'textToSpeech' | 'assistant' 
  | 'email' | 'videoConference' | 'photoEditing' | 'imageGeneration' 
  | 'textGeneration' | 'coding' | 'flashcard' | 'playground' | 'aiModels';
```

---

## Core Components

### 1. PreferencesPage (`PreferencesPage.tsx`)
Full-page preferences with URL parameter support.

**URL Navigation**: `/settings/preferences?tab=prompts`

**Features**:
- Syncs active tab with URL
- Save/reset all preferences
- Mobile responsive

### 2. PreferencesModal (`PreferencesModal.tsx`)
Modal wrapper for preferences.

**Usage**:
```tsx
import PreferencesModal from '@/components/user-preferences/PreferencesModal';
import { usePreferencesModal } from '@/hooks/user-preferences/usePreferencesModal';

const { isOpen, activeTab, openPreferences, closePreferences } = usePreferencesModal();

openPreferences('prompts'); // Open to specific tab

<PreferencesModal isOpen={isOpen} onClose={closePreferences} initialTab={activeTab} />
```

**Mobile**: Responsive dialog (bottom sheet style < 768px)

### 3. PreferenceModuleWrapper (`PreferenceModuleWrapper.tsx`)
Wraps individual modules with save/cancel functionality. **Only saves that specific module**.

**Usage**:
```tsx
import PreferenceModuleWrapper from '@/components/user-preferences/PreferenceModuleWrapper';
import PromptsPreferences from '@/components/user-preferences/PromptsPreferences';

<PreferenceModuleWrapper 
  module="prompts"
  onSaveSuccess={() => console.log('Saved')}
  onCancel={() => closeModal()}
>
  <PromptsPreferences />
</PreferenceModuleWrapper>
```

**Props**:
- `module`: Which preference module to save
- `showFooter`: Show/hide save/cancel buttons (default: true)
- `onSaveSuccess`: Callback after successful save
- `onCancel`: Callback when cancel is clicked

### 4. StandalonePromptsPreferences (`standalone/StandalonePromptsPreferences.tsx`)
Pre-wrapped prompts preferences with save/cancel. Use in modals or dedicated sections.

```tsx
import StandalonePromptsPreferences from '@/components/user-preferences/standalone/StandalonePromptsPreferences';

<StandalonePromptsPreferences 
  onSaveSuccess={() => toast.success('Saved!')}
  onCancel={() => closeModal()}
/>
```

---

## Hooks

### usePreferencesModal
Manages modal state.

```tsx
const { isOpen, activeTab, openPreferences, closePreferences } = usePreferencesModal();
```

### useModulePreferences
Direct control over saving/resetting specific modules.

```tsx
import { useModulePreferences } from '@/hooks/user-preferences/useModulePreferences';

const { save, reset, modulePreferences, isLoading, hasChanges, error } = useModulePreferences('prompts');

await save(); // Only saves prompts module
reset(); // Reset to defaults
```

---

## Redux Actions

### Save All Preferences
```tsx
import { savePreferencesToDatabase } from '@/lib/redux/slices/userPreferencesSlice';

dispatch(savePreferencesToDatabase(preferencesWithoutMeta));
```

### Save Single Module
```tsx
import { saveModulePreferencesToDatabase } from '@/lib/redux/slices/userPreferencesSlice';

dispatch(saveModulePreferencesToDatabase({ 
  module: 'prompts', 
  preferences: promptsPreferences 
}));
```

### Reset Module
```tsx
import { resetModulePreferences } from '@/lib/redux/slices/userPreferencesSlice';

dispatch(resetModulePreferences('prompts'));
```

---

## Selectors

```tsx
import { useAppSelector } from '@/lib/redux';
import { selectPromptsPreferences } from '@/lib/redux/selectors/usePreferenceSelectors';

const promptsPrefs = useAppSelector(selectPromptsPreferences);
const defaultModel = promptsPrefs.defaultModel;
```

**Available Selectors**: `selectDisplayPreferences`, `selectPromptsPreferences`, `selectVoicePreferences`, etc.

---

## Prompts Preferences Module

Located: `components/user-preferences/PromptsPreferences.tsx`

**Settings**:
1. `showSettingsOnMainPage` (boolean) - Default: false
2. `defaultModel` (string) - Default: GPT-4.1 Mini ID
3. `defaultTemperature` (number: 0-2) - Default: 1.0
4. `alwaysIncludeInternalWebSearch` (boolean) - Default: true
5. `includeThinkingInAutoPrompts` ('none' | 'simple' | 'deep') - Default: 'none'
6. `submitOnEnter` (boolean) - Default: true
7. `autoClearResponsesInEditMode` (boolean) - Default: true

---

## Common Use Cases

### 1. Add Preferences Tab to Existing Modal
```tsx
<Tabs>
  <TabsTrigger value="preferences">Preferences</TabsTrigger>
  <TabsContent value="preferences">
    <StandalonePromptsPreferences onSaveSuccess={() => toast.success('Saved!')} />
  </TabsContent>
</Tabs>
```

### 2. Link to Specific Preference Tab
```tsx
<Link href="/settings/preferences?tab=prompts">Prompts Settings</Link>
```

### 3. Open Modal to Specific Tab
```tsx
const { openPreferences } = usePreferencesModal();
openPreferences('prompts');
```

### 4. Custom Save Logic
```tsx
const { save, hasChanges } = useModulePreferences('prompts');
if (hasChanges) await save();
```

---

## File Structure

```
components/user-preferences/
├── PreferencesPage.tsx          # Full page with URL support
├── PreferencesModal.tsx         # Modal wrapper
├── PreferenceModuleWrapper.tsx  # Individual module wrapper
├── PromptsPreferences.tsx       # Prompts settings
├── DisplayPreferences.tsx       # Display settings
├── [other modules...]
└── standalone/
    └── StandalonePromptsPreferences.tsx  # Pre-wrapped prompts

hooks/user-preferences/
├── usePreferencesModal.ts       # Modal state management
├── useModulePreferences.ts      # Module save/reset
└── usePreferenceValue.ts        # Get/set individual values

lib/redux/
├── slices/userPreferencesSlice.ts     # State + actions
└── selectors/usePreferenceSelectors.ts # Selectors
```

---

## Key Technical Details

- **Module Isolation**: `saveModulePreferencesToDatabase` only updates specified module
- **Type Safety**: Full TypeScript with `PreferenceTab` type
- **Mobile Optimized**: Responsive with iOS-style bottom sheet < 768px
- **Change Tracking**: `_meta.hasUnsavedChanges` tracks unsaved state
- **Error Handling**: `_meta.error` for error states
- **Server-Side Init**: Preferences loaded in layout before any page renders

---

## Creating Additional Standalone Modules

Copy pattern from `StandalonePromptsPreferences.tsx`:

```tsx
import PreferenceModuleWrapper from '../PreferenceModuleWrapper';
import VoicePreferences from '../VoicePreferences';

const StandaloneVoicePreferences = ({ onSaveSuccess, onCancel, showFooter = true }) => (
  <PreferenceModuleWrapper module="voice" showFooter={showFooter} onSaveSuccess={onSaveSuccess} onCancel={onCancel}>
    <VoicePreferences />
  </PreferenceModuleWrapper>
);
```
