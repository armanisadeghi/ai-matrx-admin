# Mobile/Desktop Action Bar Pattern

Complete pattern for list/grid pages with search, filter, and create actions.

## Reference Implementation

**Route:** `app/(authenticated)/ai/prompts/page.tsx`

## Core Components

### Mobile
- **FloatingActionBar**: `features/prompts/components/actions/FloatingActionBar.tsx`
  - iOS-style floating bar (bottom, rounded-full, glass-morphism)
  - States: compact, search-active, recording, transcribing
  - Filter | Search (with voice) | New

- **MobileOverlayWrapper**: `components/official/MobileOverlayWrapper.tsx`
  - Safe area handling (never behind browser UI)
  - Fixed header with close button
  - Scrollable content
  - Props: `isOpen`, `onClose`, `title`, `description`, `maxHeight`

### Desktop
- **DesktopSearchBar**: `features/prompts/components/actions/DesktopSearchBar.tsx`
  - Prominent search bar with voice input
  - Layout: [Search (large)] | [Filter] | [New Prompt]
  - Glass-morphism, rounded-2xl, shadows

### Shared Modals
- **NewPromptModal**: `features/prompts/components/actions/NewPromptModal.tsx`
  - Uses `MobileOverlayWrapper`
  - Action buttons with gradients
  
- **FilterModal**: `features/prompts/components/actions/FilterModal.tsx`
  - Uses `MobileOverlayWrapper`
  - Sort options, clear filters

- **RecordingOverlay**: `features/audio/components/RecordingOverlay.tsx`
  - Centered overlay, pause/resume, cancel confirmation
  - Used by both mobile and desktop

## Migration Steps

### 1. Clean Header
**Remove:** All action buttons from PageHeader (both mobile and desktop)
**Keep:** Just title and icon, centered

```tsx
// features/[feature]/components/layouts/[Feature]PageHeader.tsx
export function FeaturePageHeader() {
  const isMobile = useIsMobile();
  
  // Same header for both mobile and desktop
  return (
    <PageSpecificHeader>
      <div className="flex items-center justify-center w-full">
        <Icon className="h-5 w-5 text-primary" />
        <h1 className="text-base font-bold">Title</h1>
      </div>
    </PageSpecificHeader>
  );
}
```

### 2. Update Grid Component
**Reference:** `features/prompts/components/layouts/PromptsGrid.tsx`

**Add State:**
```tsx
const [searchTerm, setSearchTerm] = useState("");
const [sortBy, setSortBy] = useState("updated-desc");
const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
const [isNewModalOpen, setIsNewModalOpen] = useState(false);
```

**Add Filter/Sort Logic:**
```tsx
const filteredItems = useMemo(() => {
  let filtered = items.filter(/* search logic */);
  filtered.sort(/* sort logic */);
  return filtered;
}, [items, searchTerm, sortBy]);
```

**Render Pattern:**
```tsx
return (
  <>
    {/* Desktop Search Bar */}
    {!isMobile && (
      <DesktopSearchBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        onFilterClick={() => setIsFilterModalOpen(true)}
        onNewClick={() => setIsNewModalOpen(true)}
        showFilterBadge={hasActiveFilters}
      />
    )}

    {/* Grid with pb-24 on mobile */}
    <div className={cn("grid gap-6", isMobile && "pb-24")}>
      {filteredItems.map(/* items */)}
    </div>

    {/* Mobile Floating Bar */}
    <FloatingActionBar
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      onFilterClick={() => setIsFilterModalOpen(true)}
      onNewClick={() => setIsNewModalOpen(true)}
      showFilterBadge={hasActiveFilters}
    />

    {/* Modals */}
    <NewModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />
    <FilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} sortBy={sortBy} onSortChange={setSortBy} />
  </>
);
```

### 3. Create Feature-Specific Components

#### FloatingActionBar (if needed)
Copy `features/prompts/components/actions/FloatingActionBar.tsx` and adapt.

Key elements:
- `useRecordAndTranscribe` hook for voice
- Three modes: compact, search-active, recording
- Props: searchValue, onSearchChange, onFilterClick, onNewClick, showFilterBadge

#### DesktopSearchBar (if needed)
Copy `features/prompts/components/actions/DesktopSearchBar.tsx` and adapt.

Key elements:
- Same voice recording integration
- Prominent search input (flex-1)
- Filter and New buttons (flex-shrink-0)

#### Modals
All modals must use `MobileOverlayWrapper`:

```tsx
<MobileOverlayWrapper
  isOpen={isOpen}
  onClose={onClose}
  title="Modal Title"
  description="Optional subtitle"
  maxHeight="lg" // sm, md, lg, xl
>
  <div className="p-4">
    {/* Content */}
  </div>
</MobileOverlayWrapper>
```

### 4. Voice Recording Pattern

Both mobile and desktop use identical recording setup:

```tsx
const {
  isRecording,
  isPaused,
  isTranscribing,
  duration,
  audioLevel,
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  reset,
} = useRecordAndTranscribe({
  onTranscriptionComplete: handleTranscriptionComplete,
  onError: (error) => console.error('Voice error:', error),
  autoTranscribe: true,
});

// Show RecordingOverlay when recording
if (isRecording) {
  return (
    <RecordingOverlay
      duration={duration}
      audioLevel={audioLevel}
      isPaused={isPaused}
      onStop={stopRecording}
      onPause={pauseRecording}
      onResume={resumeRecording}
      onCancel={reset}
    />
  );
}
```

## Design Tokens

### Mobile
- **Floating Bar**: `rounded-full`, `bg-background/80`, `backdrop-blur-xl`, `shadow-lg`, `pb-safe`
- **Buttons**: Circular (`rounded-full`), `h-10 w-10`
- **Search**: Pill-shaped center element

### Desktop
- **Search Bar**: `rounded-2xl`, `bg-background/80`, `backdrop-blur-xl`, `shadow-lg`
- **Height**: `h-[52px]` for comfortable desktop interaction
- **Spacing**: `mb-8` below search bar

### Modals
- **MobileOverlayWrapper**: Handles all safe area concerns
- **Max Heights**: sm (50vh), md (65vh), lg (80vh), xl (90vh)
- **Header**: Always visible, close button always accessible

## Checklist

- [ ] Clean header (title only)
- [ ] FloatingActionBar on mobile (copy and adapt)
- [ ] DesktopSearchBar on desktop (copy and adapt)
- [ ] All modals use MobileOverlayWrapper
- [ ] Voice input integrated (both mobile/desktop)
- [ ] Search/filter state in grid component
- [ ] Grid has `pb-24` on mobile for floating bar space
- [ ] RecordingOverlay for voice states
- [ ] Test safe areas on actual iOS device
- [ ] Verify close buttons always accessible

## Key Files to Copy

1. **FloatingActionBar.tsx** - Mobile action bar
2. **DesktopSearchBar.tsx** - Desktop search bar
3. **NewPromptModal.tsx** - Example modal with actions
4. **FilterModal.tsx** - Example filter modal
5. **RecordingOverlay.tsx** - Voice recording UI

## Common Adaptations

### Different Actions
Change buttons in FloatingActionBar/DesktopSearchBar to match feature needs.

### No Voice Input
Remove mic button and recording logic, keep search/filter/new pattern.

### Additional Filters
Expand FilterModal content, keep MobileOverlayWrapper structure.

### Different Creation Flow
Replace NewPromptModal with feature-specific creation modal, keep MobileOverlayWrapper.

## Do's and Don'ts

✅ **Do:**
- Use MobileOverlayWrapper for ALL mobile modals
- Test on actual iOS Safari
- Keep header clean (title only)
- Use same voice recording pattern
- Maintain `pb-safe` on fixed bottom elements

❌ **Don't:**
- Create custom modal layouts (use MobileOverlayWrapper)
- Put actions in header
- Mix mobile/desktop code (use `isMobile` to separate)
- Skip voice input testing
- Ignore safe area insets

## Result

- Clean, modern UI on both platforms
- Consistent voice input experience
- No safe area issues on mobile
- Reusable components
- Easy maintenance

