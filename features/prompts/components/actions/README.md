# iOS-Style Floating Action Bar

## Overview

An iOS-inspired floating action bar system for mobile-first interactions on the prompts page. This provides a clean, modern interface with search, filter, and creation actions accessible from a persistent bottom bar.

## Components

### FloatingActionBar

**Location:** `features/prompts/components/actions/FloatingActionBar.tsx`

The main floating bar component that appears at the bottom of the screen on mobile devices.

**Features:**
- **Mobile-only:** Automatically hidden on desktop (>= 768px)
- **Three modes:**
  1. **Default:** Compact bar with filter, search, and new buttons
  2. **Search Active:** Expanded search input with voice support and cancel button
  3. **Modal States:** Full-screen overlays for filter and new actions

**States:**
- **Compact (Default):**
  - Filter icon (left) - Opens filter modal
  - Search bar (center) - Tappable to activate search
  - New button (right) - Opens creation modal

- **Expanded (Search Active):**
  - Full-width search input
  - Voice input button
  - Cancel button to return to compact state
  - Backdrop blur on page content

**Key Features:**
- Glass-morphism styling with backdrop blur
- Safe area inset support (`pb-safe`)
- Voice input integration
- Smooth state transitions
- iOS-style animations and interactions

### NewPromptModal

**Location:** `features/prompts/components/actions/NewPromptModal.tsx`

A beautiful, mobile-friendly modal presenting 5 creation options.

**Options:**
1. **Create Manually** - Start from scratch
2. **Generate with AI** - AI-powered prompt generation
3. **Build Interactively** - Guided prompt builder
4. **Import Prompt** - Import from text or file
5. **Use Template** - Start with a pre-built template

**Features:**
- Bottom sheet style presentation
- Gradient-styled action buttons
- Icon-based visual hierarchy
- Smooth transitions to sub-modals
- Never exceeds viewport height
- Proper z-index management

### FilterModal

**Location:** `features/prompts/components/actions/FilterModal.tsx`

A full-screen filter overlay for mobile users.

**Features:**
- Sort options (Recently Updated, Name A-Z, Name Z-A)
- Clear all filters button
- Apply button with persistent state
- Future-ready for additional filters
- iOS-style bottom sheet design

## Desktop Experience

On desktop (>= 768px), the floating bar is hidden and a traditional search/filter interface is shown:

- Inline search bar with live filtering
- Collapsible filter panel
- Sort dropdown
- Results counter when filters are active
- Clear filters button

This maintains the existing desktop UX while enhancing mobile.

## Integration

### Usage in PromptsGrid

```tsx
import { FloatingActionBar } from "../actions/FloatingActionBar";
import { NewPromptModal } from "../actions/NewPromptModal";
import { FilterModal } from "../actions/FilterModal";

// State management
const [searchTerm, setSearchTerm] = useState("");
const [sortBy, setSortBy] = useState("updated-desc");
const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
const [isNewModalOpen, setIsNewModalOpen] = useState(false);

// Render
<>
  {/* Content with pb-24 on mobile for spacing */}
  <div className={cn("grid gap-6", isMobile && "pb-24")}>
    {/* Your content */}
  </div>

  {/* Floating Action Bar (mobile only) */}
  <FloatingActionBar
    searchValue={searchTerm}
    onSearchChange={setSearchTerm}
    onFilterClick={() => setIsFilterModalOpen(true)}
    onNewClick={() => setIsNewModalOpen(true)}
    showFilterBadge={hasActiveFilters}
  />

  {/* Modals */}
  <NewPromptModal
    isOpen={isNewModalOpen}
    onClose={() => setIsNewModalOpen(false)}
  />
  <FilterModal
    isOpen={isFilterModalOpen}
    onClose={() => setIsFilterModalOpen(false)}
    sortBy={sortBy}
    onSortChange={setSortBy}
  />
</>
```

## Mobile Guidelines Compliance

This implementation follows all mobile layout guidelines:

✅ Uses `pb-safe` for safe area insets  
✅ Uses `h-dvh` for dynamic viewport height  
✅ Input font-size >= 16px to prevent iOS auto-zoom  
✅ Fixed bottom elements properly positioned  
✅ No hardcoded header heights  
✅ Proper z-index layering (z-30 backdrop, z-40 bar, z-50 modals)  
✅ Glass-morphism with backdrop blur  
✅ Touch-friendly tap targets (minimum 44px)

## Key Behaviors

### Search Flow
1. User taps compact search bar
2. Bar expands, other buttons hide
3. Backdrop blur applied to page
4. Search input auto-focuses
5. Voice input available
6. Cancel returns to compact state

### Filter Flow
1. User taps filter button
2. Modal slides up from bottom
3. Page content blurred
4. Sort options available
5. Apply or close to return

### New Flow
1. User taps new button
2. Creation modal slides up
3. 5 beautiful action buttons presented
4. Selection opens appropriate sub-modal
5. Sub-modals handle their own state
6. Return to page after completion

## Styling

### Glass-morphism
- `bg-background/80` or `bg-background/95` - Semi-transparent background
- `backdrop-blur-xl` - Strong blur effect
- `border border-border/50` - Subtle border
- `shadow-lg` or `shadow-2xl` - Elevated appearance

### Responsive Spacing
- Mobile: `pb-24` on content to prevent overlap with floating bar
- Desktop: Normal spacing without bottom padding
- Container: Respects page container padding

### Transitions
- Button states: `hover:scale-[1.02] active:scale-[0.98]`
- Color transitions: `transition-colors`
- Smooth backdrop animations
- iOS-like spring animations

## Future Enhancements

This pattern can be extended across the application for:
- Notes pages
- Tasks/todos pages
- Any list/grid view with search, filter, and create actions

### Potential Additions
- Advanced filter options (tags, categories, dates)
- Sort animations
- Haptic feedback on mobile
- Swipe gestures
- Long-press actions
- Multi-select mode

## Testing Checklist

- [x] Compact bar renders correctly on mobile
- [x] Search activation expands input properly
- [x] Voice input integration works
- [x] Cancel returns to compact state
- [x] Filter modal opens and closes smoothly
- [x] New modal presents all 5 options
- [x] Sub-modals open from main modal
- [x] Desktop shows traditional search/filter
- [x] Safe area insets respected on iOS
- [x] No layout shift between states
- [x] Z-index layering correct
- [x] Backdrop blur works properly
- [x] Touch targets are >= 44px

## Technical Notes

- Uses `useIsMobile()` hook for responsive detection
- Implements controlled component pattern for state management
- Proper cleanup on modal close
- Prevents iOS auto-zoom with 16px font size
- Voice transcription via `VoiceInputButton` component
- Router integration for navigation actions
- Toast notifications for user feedback

