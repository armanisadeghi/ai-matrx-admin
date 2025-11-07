# Voice Selection Components

Modern, mobile-friendly voice selection system following the mobile/desktop pattern.

## Components

### VoiceSelectionModal

The main voice selection modal that works on both mobile and desktop.

**Features:**
- Search functionality to find voices by name or description
- Voice testing with real-time playback
- Voice selection with visual feedback
- Mobile: Uses `MobileOverlayWrapper` for proper safe area handling
- Desktop: Full-screen modal with smooth animations

**Usage:**

```tsx
import { VoiceSelectionModal } from '@/features/audio/voice/components';

<VoiceSelectionModal
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    voices={voices}
    selectedVoiceId={currentVoiceId}
    onSelectVoice={(voiceId) => handleSelectVoice(voiceId)}
    title="Select Voice"
/>
```

**Props:**
- `isOpen`: Boolean - Controls modal visibility
- `onClose`: Function - Called when modal should close
- `voices`: AiVoice[] - Array of available voices
- `selectedVoiceId`: string - Currently selected voice ID
- `onSelectVoice`: Function - Called when a voice is selected (optional)
- `title`: string - Modal title (default: "Select Voice")

### FloatingActionBar

iOS-style floating action bar for mobile voice list pages.

**Features:**
- Compact mode with search and filter buttons
- Expands to full search input when activated
- Backdrop blur when search is active
- Safe area inset support

**Usage:**

```tsx
import { FloatingActionBar } from '@/features/audio/voice/components';

<FloatingActionBar
    searchValue={searchTerm}
    onSearchChange={setSearchTerm}
    onFilterClick={() => setIsFilterModalOpen(true)}
    showFilterBadge={hasActiveFilters}
/>
```

**Props:**
- `searchValue`: string - Current search term
- `onSearchChange`: Function - Called when search changes
- `onFilterClick`: Function - Called when filter button is clicked
- `showFilterBadge`: boolean - Shows badge on filter button (optional)

### DesktopSearchBar

Prominent search bar for desktop voice list pages.

**Features:**
- Large, beautiful search input
- Filter button with badge support
- Glass-morphism styling
- Smooth hover effects

**Usage:**

```tsx
import { DesktopSearchBar } from '@/features/audio/voice/components';

<DesktopSearchBar
    searchValue={searchTerm}
    onSearchChange={setSearchTerm}
    onFilterClick={() => setIsFilterModalOpen(true)}
    showFilterBadge={hasActiveFilters}
/>
```

**Props:**
- `searchValue`: string - Current search term
- `onSearchChange`: Function - Called when search changes
- `onFilterClick`: Function - Called when filter button is clicked
- `showFilterBadge`: boolean - Shows badge on filter button (optional)

### FilterModal

Modal for filtering and sorting voices.

**Features:**
- Sort options (Name A-Z, Name Z-A)
- Clear filters button
- Mobile: Uses `MobileOverlayWrapper`
- Desktop: Centered modal

**Usage:**

```tsx
import { FilterModal } from '@/features/audio/voice/components';

<FilterModal
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    sortBy={sortBy}
    onSortChange={setSortBy}
    onClearFilters={() => {
        setSortBy("name-asc");
        setSearchTerm("");
    }}
/>
```

**Props:**
- `isOpen`: Boolean - Controls modal visibility
- `onClose`: Function - Called when modal should close
- `sortBy`: string - Current sort option
- `onSortChange`: Function - Called when sort changes
- `onClearFilters`: Function - Called when clear filters is clicked (optional)

## Integration Example

See `features/audio/voice/VoicesList.tsx` for a complete example of how to integrate all components.

### Basic Integration Pattern

```tsx
const [searchTerm, setSearchTerm] = useState("");
const [sortBy, setSortBy] = useState("name-asc");
const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

// Filter and sort voices
const filteredVoices = useMemo(() => {
    let filtered = [...voices];
    
    if (searchTerm) {
        filtered = filtered.filter(voice => 
            voice.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    filtered.sort((a, b) => {
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        if (sortBy === "name-desc") return b.name.localeCompare(a.name);
        return 0;
    });
    
    return filtered;
}, [voices, searchTerm, sortBy]);

// Render
<>
    {/* Desktop Search Bar */}
    {!isMobile && (
        <DesktopSearchBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            onFilterClick={() => setIsFilterModalOpen(true)}
        />
    )}

    {/* Voice Grid with mobile padding */}
    <div className={cn("grid gap-4", isMobile && "pb-24")}>
        {filteredVoices.map(voice => (
            <VoiceCard key={voice.id} voice={voice} />
        ))}
    </div>

    {/* Mobile Floating Action Bar */}
    <FloatingActionBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        onFilterClick={() => setIsFilterModalOpen(true)}
    />

    {/* Modals */}
    <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        sortBy={sortBy}
        onSortChange={setSortBy}
    />
</>
```

## Design Principles

1. **Mobile-First**: Components are designed to work perfectly on mobile with proper safe area handling
2. **Desktop-Enhanced**: Desktop gets enhanced layouts and larger touch targets
3. **Consistent**: Uses the same mobile/desktop pattern as the prompts feature
4. **Accessible**: Proper keyboard navigation and screen reader support
5. **Performance**: Optimized with React.memo, useMemo, and useCallback

## Voice Testing

The VoiceSelectionModal includes voice testing functionality powered by the Cartesia TTS API:

- Click "Test" on any voice to hear a sample
- Samples use the voice's description as the text
- Only one voice can play at a time
- Click "Stop" to stop playback
- Voice testing requires an active Cartesia connection

## Future Enhancements

Potential improvements to consider:

1. **Advanced Filters**: Add filters for gender, age, accent, use case
2. **Favorites**: Allow users to mark favorite voices
3. **Voice Categories**: Organize voices by category (narrator, character, commercial, etc.)
4. **Custom Text**: Allow users to enter custom text for voice testing
5. **Voice Comparison**: Compare multiple voices side-by-side
6. **Voice Recommendations**: Suggest voices based on user preferences

## Notes

- All components follow the workspace coding standards
- Components use TypeScript for type safety
- Animations use Framer Motion for smooth transitions
- Styling uses Tailwind CSS with design tokens
- Mobile components respect safe area insets

