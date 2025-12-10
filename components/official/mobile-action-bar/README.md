# Mobile Action Bar Component System

A reusable, enterprise-grade mobile search, filter, and action component system designed for consistent UX across the entire AI Matrx application.

## Overview

The Mobile Action Bar system provides a floating bottom action bar for mobile devices with integrated search, filtering, voice input, and custom actions. It's built with TypeScript generics to work with any data type and follows all mobile-first best practices.

## Components

### `MobileActionBar`

The main floating action bar component that sits at the bottom of the screen on mobile devices.

**Features:**
- Search input with real-time filtering
- Voice search integration via audio transcription
- **Inline recording/transcribing indicators** - no heavy modals
- Filter button with active state indicator
- Customizable primary action button
- **No backdrop overlay** - users can see and interact with results while searching
- Proper safe area padding for iOS devices
- Smooth transitions and animations
- Visual feedback with pulsing recording dot and audio level glow

### `MobileFilterDrawer`

A drawer component for displaying filter options with live results count.

**Features:**
- Generic filter configuration system
- **Live results count** displayed in footer
- Support for multiple filter types (select, multiselect, toggle, radio)
- "Clear All Filters" button when filters are active
- Real-time filter preview
- Proper mobile UX with safe area padding

## Installation

Import from `@/components/official/mobile-action-bar`:

```tsx
import { 
  MobileActionBar, 
  MobileFilterDrawer,
  type FilterConfig,
  type FilterState 
} from '@/components/official/mobile-action-bar';
```

## Usage

### Basic Example

```tsx
"use client";

import { useState, useMemo } from "react";
import { MobileActionBar, MobileFilterDrawer } from "@/components/official/mobile-action-bar";
import { Plus } from "lucide-react";

export function MyFeatureGrid({ items }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("updated-desc");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Filter configuration
  const filterConfig = {
    fields: [
      {
        id: "sortBy",
        label: "Sort By",
        type: "select" as const,
        options: [
          { value: "updated-desc", label: "Recently Updated" },
          { value: "name-asc", label: "Name (A-Z)" },
          { value: "name-desc", label: "Name (Z-A)" },
        ],
      },
    ],
    entityLabel: "items",
    entityLabelSingular: "item",
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = items.filter((item) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return item.name.toLowerCase().includes(searchLower);
    });

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [items, searchTerm, sortBy]);

  const activeFilters = { sortBy };

  const handleFiltersChange = (filters) => {
    if (filters.sortBy && typeof filters.sortBy === "string") {
      setSortBy(filters.sortBy);
    }
  };

  return (
    <>
      {/* Your content */}
      <div className="grid grid-cols-1 gap-4 pb-24">
        {filteredItems.map((item) => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>

      {/* Mobile Action Bar */}
      <MobileActionBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        totalCount={items.length}
        filteredCount={filteredItems.length}
        onPrimaryAction={() => setIsNewModalOpen(true)}
        primaryActionLabel="New Item"
        primaryActionIcon={<Plus className="h-5 w-5" />}
        showFilterButton={true}
        showVoiceSearch={true}
        isFilterModalOpen={isFilterModalOpen}
        setIsFilterModalOpen={setIsFilterModalOpen}
        searchPlaceholder="Search items..."
      />

      {/* Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filterConfig={filterConfig}
        activeFilters={activeFilters}
        onFiltersChange={handleFiltersChange}
        totalCount={items.length}
        filteredCount={filteredItems.length}
      />
    </>
  );
}
```

## API Reference

### MobileActionBarProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `searchValue` | `string` | Yes | - | Current search value |
| `onSearchChange` | `(value: string) => void` | Yes | - | Search change handler |
| `searchPlaceholder` | `string` | No | `"Search..."` | Placeholder text for search input |
| `totalCount` | `number` | Yes | - | Total number of items |
| `filteredCount` | `number` | Yes | - | Number of items after filtering |
| `onPrimaryAction` | `() => void` | No | - | Primary action button handler |
| `primaryActionLabel` | `string` | No | - | Accessible label for primary action |
| `primaryActionIcon` | `ReactNode` | No | `<Plus />` | Icon for primary action button |
| `showFilterButton` | `boolean` | No | `true` | Whether to show filter button |
| `showVoiceSearch` | `boolean` | No | `true` | Whether to show voice search |
| `isFilterModalOpen` | `boolean` | No | `false` | Filter modal open state |
| `setIsFilterModalOpen` | `(open: boolean) => void` | No | - | Filter modal state setter |

### MobileFilterDrawerProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Drawer open state |
| `onClose` | `() => void` | Yes | Close handler |
| `filterConfig` | `FilterConfig` | Yes | Filter configuration object |
| `activeFilters` | `FilterState` | Yes | Current filter values |
| `onFiltersChange` | `(filters: FilterState) => void` | Yes | Filter change handler |
| `totalCount` | `number` | Yes | Total number of items |
| `filteredCount` | `number` | Yes | Number of items after filtering |
| `className` | `string` | No | Additional CSS classes |

### FilterConfig

```tsx
interface FilterConfig {
  fields: FilterField[];
  entityLabel?: string;        // e.g., "prompts", "notes"
  entityLabelSingular?: string; // e.g., "prompt", "note"
}
```

### FilterField

```tsx
interface FilterField {
  id: string;
  label: string;
  type: "select" | "multiselect" | "toggle" | "radio";
  options?: FilterOption[];
  placeholder?: string;
  description?: string;
}
```

### FilterOption

```tsx
interface FilterOption {
  value: string;
  label: string;
}
```

### FilterState

```tsx
type FilterState = Record<string, string | string[] | boolean>;
```

## Key Features

### 1. Inline Voice Indicators (Like VoiceTextarea)

**No heavy modals or overlays** for voice input - everything is inline:

**Recording State:**
```
┌────────────────────────────────────────┐
│ ● Recording...              [X]        │
└────────────────────────────────────────┘
```
- Pulsing red dot with "Recording..." text
- Red-tinted background
- Stop button to end recording
- Content behind remains visible

**Transcribing State:**
```
┌────────────────────────────────────────┐
│ ⟳ Transcribing...                      │
└────────────────────────────────────────┘
```
- Animated spinner with "Transcribing..." text
- Blue-tinted background
- Action bar expands to show status
- No backdrop blocking content

### 2. No Backdrop on Search

Unlike traditional mobile search overlays, this component keeps the backdrop hidden when searching, allowing users to:
- See filtered results in real-time
- Scroll through content while searching
- Maintain context of what they're filtering

### 3. Live Filter Count

The filter drawer displays a live count of results:
```
┌─────────────────────────┐
│ Showing 5 of 12 prompts │
└─────────────────────────┘
```

This provides immediate feedback on how filters affect results without closing the drawer.

### 4. Voice Search Integration

Integrated voice-to-text transcription for hands-free search with **inline indicators** (same pattern as VoiceTextarea):
- Click microphone icon to start recording
- **Inline recording indicator** with pulsing red dot (no modal overlay)
- **Inline transcribing indicator** with spinner (no modal overlay)
- Mic button shows visual feedback with audio level glow during recording
- Automatic transcription via AI
- Results populate search field automatically using native value setters
- Dispatches synthetic events to ensure React state synchronization
- Search view automatically activates to show filtered results
- Clean, minimal UX that keeps content visible

### 5. Mobile-First Design

- Uses `h-dvh` for proper viewport height on mobile
- Safe area padding with `pb-safe` for iOS devices
- Input font size ≥16px to prevent iOS zoom
- Proper touch targets (44px minimum)
- Inline indicators instead of modal overlays

## Best Practices

### 1. Always Provide Entity Labels

```tsx
const filterConfig = {
  fields: [...],
  entityLabel: "prompts",        // Plural
  entityLabelSingular: "prompt", // Singular
};
```

This ensures the live count displays correctly: "Showing 1 of 5 prompts" vs "Showing 1 of 5 prompt".

### 2. Add Bottom Padding to Content

Add `pb-24` to your content container to prevent the floating action bar from covering content:

```tsx
<div className="grid grid-cols-1 gap-4 pb-24">
  {/* Your content */}
</div>
```

### 3. Manage Filter State Properly

Keep filter state in the parent component and pass it down:

```tsx
const [sortBy, setSortBy] = useState("updated-desc");
const activeFilters = { sortBy };

const handleFiltersChange = (filters) => {
  if (filters.sortBy) setSortBy(filters.sortBy);
  // Handle other filters...
};
```

### 4. Use useMemo for Filtering

Optimize performance by memoizing filtered results:

```tsx
const filteredItems = useMemo(() => {
  // Filter and sort logic
  return filtered;
}, [items, searchTerm, sortBy]);
```

## Customization

### Custom Primary Action Icon

```tsx
import { Sparkles } from "lucide-react";

<MobileActionBar
  primaryActionIcon={<Sparkles className="h-5 w-5" />}
  primaryActionLabel="Generate"
  onPrimaryAction={handleGenerate}
/>
```

### Disable Features

```tsx
<MobileActionBar
  showFilterButton={false}  // Hide filter button
  showVoiceSearch={false}   // Hide voice search
  onPrimaryAction={undefined} // Hide primary action
/>
```

### Custom Search Placeholder

```tsx
<MobileActionBar
  searchPlaceholder="Search notes, tags, or content..."
/>
```

## Implementation Notes

### Voice Transcription

The component uses the same robust transcription pattern as `VoiceTextarea`:
1. Stores a ref to the search input element
2. Uses native `HTMLInputElement.prototype.value` setter to update the DOM
3. Dispatches a synthetic `input` event with `bubbles: true`
4. Updates both local state and parent state via `onSearchChange`
5. Automatically activates search view to display filtered results

This ensures React properly detects the change and all event handlers fire correctly.

### Desktop Behavior

The `MobileActionBar` only renders on mobile devices (detected via `useIsMobile` hook). For desktop, implement a separate search bar component.

### Z-Index Layering

- Recording/Transcription overlays: `z-50`
- Mobile Action Bar: `z-40`
- Content: Below `z-40`

### Filter Types Support

Currently supported filter types:
- ✅ `select` - Single selection dropdown
- 🚧 `multiselect` - Multiple selection (coming soon)
- 🚧 `toggle` - Boolean toggle (coming soon)
- 🚧 `radio` - Radio button group (coming soon)

## Migration from FloatingActionBar

If migrating from the old `FloatingActionBar` component:

1. Update imports:
   ```tsx
   // Old
   import { FloatingActionBar } from "@/features/[feature]/components";
   
   // New
   import { MobileActionBar } from "@/components/official/mobile-action-bar";
   ```

2. Add required count props:
   ```tsx
   totalCount={items.length}
   filteredCount={filteredItems.length}
   ```

3. Update filter modal to `MobileFilterDrawer` with filter config

4. Remove old components after migration

## Related Components

- `DesktopSearchBar` - Desktop search component (feature-specific)
- `VoiceTextarea` - Voice-enabled textarea with similar inline indicators
- `MobileFilterDrawer` - Companion filter drawer component
- `useRecordAndTranscribe` - Audio recording and transcription hook

## Support

For issues, questions, or feature requests, consult the main AI Matrx development guidelines or contact the development team.

