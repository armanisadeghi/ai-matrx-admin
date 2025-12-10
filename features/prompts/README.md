# Prompts Feature

Manage and organize AI prompts with search, filtering, and voice input capabilities.

## Overview

The Prompts feature provides a comprehensive interface for creating, organizing, and managing AI prompts. It includes both desktop and mobile-optimized experiences with advanced search, filtering, and voice transcription capabilities.

## Route

- **Path:** `/ai/prompts`
- **Page:** `app/(authenticated)/ai/prompts/page.tsx`
- **Layout:** Authenticated layout with header

## Components

### Layouts

#### `PromptsGrid`
Main grid component that displays all prompts with search, filter, and action capabilities.

**Features:**
- Real-time search filtering
- Sort options (Recently Updated, Name A-Z, Name Z-A)
- Card-based grid layout
- Mobile-responsive with floating action bar
- Desktop search bar
- Voice search integration
- Delete/duplicate/navigation actions

**Props:**
```tsx
interface PromptsGridProps {
  prompts: Prompt[];
}
```

#### `PromptsPageHeader`
Page header component with icon and title, shown in the top navigation bar.

#### `DesktopSearchBar`
Desktop-only search bar with search, filter, and action buttons.

**Features:**
- Prominent search input with clear button
- Voice search via microphone icon
- Filter button with active state indicator
- "New Prompt" action button
- Beautiful glassmorphic design

#### Mobile Components (Reusable)

The mobile experience uses the new reusable component system from `/components/official/mobile-action-bar/`:

- **`MobileActionBar`** - Floating bottom action bar with search, filter, and "New Prompt" button
  - No backdrop overlay when searching (users can see results)
  - Voice search support
  - Active filter indicator badge
  
- **`MobileFilterDrawer`** - Filter drawer with live results count
  - Displays "Showing X of Y prompts" in real-time
  - Clear all filters button
  - Sort options (Recently Updated, Name A-Z, Name Z-A)

See `/components/official/mobile-action-bar/README.md` for complete documentation.

### Cards

#### `PromptCard`
Individual prompt card with actions menu.

**Features:**
- Prompt name and description
- Action menu (Edit, Duplicate, Delete)
- Loading states for actions
- Navigation transition indicator
- Click to edit

### Modals

#### `NewPromptModal`
Modal for creating new prompts.

#### `FilterModal` (Deprecated)
Old filter modal - replaced by `MobileFilterDrawer` from the reusable component system.

#### `FloatingActionBar` (Deprecated)
Old floating action bar - replaced by `MobileActionBar` from the reusable component system.

## State Management

### Search & Filter State

Managed in `PromptsGrid` component:
```tsx
const [searchTerm, setSearchTerm] = useState("");
const [sortBy, setSortBy] = useState("updated-desc");
const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
```

### Filter Configuration

```tsx
const filterConfig = {
  fields: [
    {
      id: "sortBy",
      label: "Sort By",
      type: "select",
      options: [
        { value: "updated-desc", label: "Recently Updated" },
        { value: "name-asc", label: "Name (A-Z)" },
        { value: "name-desc", label: "Name (Z-A)" },
      ],
    },
  ],
  entityLabel: "prompts",
  entityLabelSingular: "prompt",
};
```

### Action States

```tsx
const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
const [duplicatingIds, setDuplicatingIds] = useState<Set<string>>(new Set());
const [navigatingId, setNavigatingId] = useState<string | null>(null);
```

## API Integration

### Endpoints Used

- `GET /api/prompts` - Fetch user's prompts (via Supabase)
- `DELETE /api/prompts/[id]` - Delete prompt
- `POST /api/prompts/[id]/duplicate` - Duplicate prompt

### Data Fetching

Prompts are fetched server-side in the page component:

```tsx
const { data: prompts } = await supabase
  .from("prompts")
  .select("id, name, description")
  .eq("user_id", user.id)
  .order("updated_at", { ascending: false });
```

## User Experience

### Desktop

- Full-width search bar at top of grid
- Grid layout: 1-4 columns (responsive)
- Hover states on cards
- Filter drawer slides from right

### Mobile

- Floating action bar at bottom with safe area padding
- Compact search that expands when tapped
- **No backdrop when searching** - results remain visible
- Filter drawer from left with **live count display**
- Voice search via microphone icon
- Bottom padding on grid to prevent content overlap

### Voice Search

Integrated voice transcription via `/features/audio/`:
1. Click microphone icon
2. Recording overlay appears
3. Automatic transcription on stop
4. Search input populated with transcribed text

## Key Mobile UX Fixes

### Fixed: Search Backdrop Issue
**Previous:** Search overlay covered entire screen, blocking view of results
**Now:** No backdrop when searching - users can see and interact with filtered results

### Added: Live Filter Count
**Previous:** No feedback on filter results until closing drawer
**Now:** Footer displays "Showing X of Y prompts" in real-time as filters change

## Related Features

- **Prompt Templates** - Browse and use pre-built prompt templates at `/ai/prompts/templates`
- **Audio Transcription** - Voice-to-text for search input (`/features/audio/`)

## File Structure

```
features/prompts/
├── components/
│   ├── layouts/
│   │   ├── PromptsGrid.tsx          # Main grid component
│   │   ├── PromptsPageHeader.tsx    # Page header
│   │   ├── DesktopSearchBar.tsx     # Desktop search bar
│   │   ├── PromptCard.tsx           # Individual card
│   │   ├── NewPromptModal.tsx       # Create modal
│   │   ├── FloatingActionBar.tsx    # (Deprecated - use MobileActionBar)
│   │   └── FilterModal.tsx          # (Deprecated - use MobileFilterDrawer)
│   └── index.ts
├── types.ts                          # TypeScript interfaces
└── README.md                         # This file

app/(authenticated)/ai/prompts/
└── page.tsx                          # Route page component
```

## Technologies

- **React 19** - Component framework
- **Next.js 15/16** - App Router, Server Components
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - Database and auth
- **Lucide React** - Icons
- **ShadCN UI** - Component library
- **Audio Transcription** - Voice search

## Mobile Guidelines

Follows AI Matrx mobile layout guidelines:
- Uses `h-dvh` for viewport height (not `h-screen`)
- Safe area padding with `pb-safe`
- Input font size ≥16px to prevent iOS zoom
- Touch targets ≥44px
- Proper z-index layering

## Future Enhancements

- Additional filter types (categories, tags, favorites)
- Bulk actions (select multiple, batch delete)
- Prompt versioning and history
- Sharing and collaboration features
- Advanced search with operators
- Prompt performance analytics

