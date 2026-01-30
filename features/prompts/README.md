# Prompts Feature

Manage and organize AI prompts with search, filtering, voice input, and sharing capabilities.

## Overview

The Prompts feature provides a comprehensive interface for creating, organizing, and managing AI prompts. It includes both desktop and mobile-optimized experiences with advanced search, filtering, voice transcription, and prompt sharing capabilities.

## Route

- **Path:** `/ai/prompts`
- **Page:** `app/(authenticated)/ai/prompts/page.tsx`
- **Layout:** Authenticated layout with header

## Components

### Layouts

#### `PromptsGrid`
Main grid component that displays all prompts with search, filter, and action capabilities using an intelligent hybrid layout.

**Features:**
- Real-time search filtering
- Sort options (Recently Updated, Name A-Z, Name Z-A)
- **Hybrid card/list layout** for optimal space efficiency
- Mobile-responsive with floating action bar
- Desktop search bar
- Voice search integration
- Delete/duplicate/navigation actions
- Elegant empty state with quick actions
- Always displays shared prompts section (when available)

**Props:**
```tsx
interface PromptsGridProps {
  prompts: Prompt[];
  sharedPrompts?: SharedPrompt[];
}
```

**Hybrid Layout (New!):**
To optimize space for users with many prompts, the grid uses a hybrid display approach:

**Desktop (8-card threshold):**
- First 8 prompts display as full-size cards in a grid
- Remaining prompts display as compact list items
- ~75% vertical space savings for large collections

**Mobile (4-card threshold):**
- First 4 prompts display as full-size cards
- Remaining prompts display as compact list items
- Maintains touch-friendly interactions

**Why Hybrid?**
- **Visual appeal** for top items (immediate recognition)
- **Space efficiency** for browsing many items
- **Full functionality** maintained in both formats
- **Better search experience** - see more results at once

**Components:**
- `PromptCard` - Full-size card with inline actions
- `PromptListItem` - Compact list item with dropdown menu
- `SharedPromptCard` - Full-size card for shared prompts
- `SharedPromptListItem` - Compact list item for shared prompts

**Empty State:**
When a user has no personal prompts, an elegant empty state is displayed featuring:
- Prominent "Create Your First Prompt" heading
- Two action buttons:
  - **Create Blank Prompt** - Opens the NewPromptModal
  - **Browse Templates** - Navigates to templates page
- Gradient background styling for visual appeal
- All search, filter, and action features remain accessible
- Shared prompts section still appears below (if user has shared prompts)

**Display Logic:**
- If `prompts.length === 0`: Shows empty state
- If `prompts.length > 0` but `filteredPrompts.length === 0`: Shows "no matches" message
- If `filteredPrompts.length > 0`: Shows hybrid layout (cards + list)
- If `sharedPrompts.length > 0`: Always shows "Shared with Me" collapsible section with same hybrid layout
- Threshold applies to filtered results (search returns 5 items = all cards, 20 items = 8 cards + 12 list)

#### `SharedPromptCard`
Card component for displaying prompts shared by other users.

**Features:**
- Visual distinction from owned prompts (secondary color accent)
- Permission level badge (View Only, Can Edit, Full Access)
- Owner display badge showing who shared the prompt
- Conditional actions based on permission level:
  - **Viewer:** Run, View, Copy to My Prompts
  - **Editor:** Run, Edit, View, Copy to My Prompts
  - **Admin:** Full access like owner

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
Full-size card component displayed for the first 8 prompts (4 on mobile).

**Features:**
- Large, visually prominent display
- Inline action buttons (Run, Edit, View, Duplicate, Share, Create App)
- Admin actions menu (for system admins)
- Loading states and transition indicators
- Click to open action modal
- Hover effects and animations

#### `PromptListItem`
Compact list item component displayed after the card threshold is reached.

**Features:**
- Space-efficient single-line layout
- Icon, name, and truncated description
- Dropdown menu with all actions:
  - Run, Edit, View, Duplicate, Share, Create App, Delete
  - Admin actions submenu (Convert to Template, Make Global Built-in)
- Loading states and overlays
- Click row to edit (same as card behavior)
- Hover background highlighting
- All same functionality as cards, just more compact

**Design:**
```
[Icon] Prompt Name                                    [•••]
       Description (truncated, muted)
```

#### `SharedPromptCard`
Full-size card for shared prompts (first 8/4).

**Features:**
- Secondary color accent for distinction
- Permission badge (View Only, Can Edit, Full Access)
- Owner email badge
- Conditional actions based on permission level
- Click to run (viewer) or edit (editor/admin)

#### `SharedPromptListItem`
Compact list item for shared prompts (after threshold).

**Features:**
- Secondary color icon for distinction
- Inline permission and owner badges
- Dropdown menu with permission-appropriate actions:
  - Viewer: Run, View, Copy to My Prompts
  - Editor: Run, Edit, View, Copy to My Prompts
  - Admin: Full access
- Same space-efficient layout as PromptListItem
- Click to run (viewer) or edit (editor/admin)

### Modals

#### `NewPromptModal`
Modal for creating new prompts.

#### `SharedPromptWarningModal`
Modal shown when a user attempts to edit a shared prompt.

**Features:**
- Displays owner information
- Shows permission level
- Options based on access:
  - **Viewer:** "Save as My Copy" only
  - **Editor/Admin:** "Edit Original" or "Save as My Copy"
- Tracks acknowledgment to avoid repeated prompts

#### `SharedPromptBanner`
Banner component displayed on edit/run pages for shared prompts.

**Features:**
- Shows owner name and permission level
- Color-coded by permission (blue for viewer, amber for editor, green for admin)
- Compact display for headers

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

## Shared Prompts System

### Overview

The shared prompts system allows users to share prompts with other users, granting different permission levels.

### Permission Levels

| Level | View | Run | Edit | Delete | Share |
|-------|------|-----|------|--------|-------|
| Viewer | ✓ | ✓ | ✗ | ✗ | ✗ |
| Editor | ✓ | ✓ | ✓ | ✗ | ✗ |
| Admin | ✓ | ✓ | ✓ | ✗ | ✓ |
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ |

### "Shared with Me" Section

On the main prompts page, a collapsible "Shared with Me" section displays all prompts shared with the current user. Each card shows:
- Prompt name
- Owner badge
- Permission level badge
- Appropriate actions based on access

### Edit Flow for Shared Prompts

When editing a shared prompt:
1. Banner displays showing owner and permission level
2. On first save attempt, `SharedPromptWarningModal` appears
3. User chooses "Edit Original" (if allowed) or "Save as My Copy"
4. If "Save as My Copy", creates duplicate owned by user

### Run Page for Shared Prompts

- Displays shared prompt banner with owner info
- "Copy to My Prompts" button in header
- All run functionality works normally (running doesn't modify the prompt)

## API Integration

### Endpoints Used

- `GET /api/prompts` - Fetch user's prompts (via Supabase)
- `DELETE /api/prompts/[id]` - Delete prompt
- `POST /api/prompts/[id]/duplicate` - Duplicate prompt (works for owned AND shared prompts)

### SQL Functions (RPC)

- `get_prompts_shared_with_me()` - Returns all prompts shared with current user with permission details
- `get_prompt_access_level(prompt_id)` - Returns access level info for a specific prompt

### Data Fetching

Prompts are fetched server-side in the page component:

```tsx
// Fetch owned and shared prompts in parallel
const [promptsResult, sharedPromptsResult] = await Promise.all([
  supabase
    .from("prompts")
    .select("id, name, description")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false }),
  supabase.rpc("get_prompts_shared_with_me")
]);
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
│   │   ├── PromptsGrid.tsx           # Main grid component (includes shared prompts section)
│   │   ├── PromptsPageHeader.tsx     # Page header
│   │   ├── DesktopSearchBar.tsx      # Desktop search bar
│   │   ├── PromptCard.tsx            # Individual card for owned prompts
│   │   ├── SharedPromptCard.tsx      # Card for shared prompts (with permission badges)
│   │   ├── NewPromptModal.tsx        # Create modal
│   │   ├── FloatingActionBar.tsx     # (Deprecated - use MobileActionBar)
│   │   └── FilterModal.tsx           # (Deprecated - use MobileFilterDrawer)
│   ├── builder/
│   │   ├── PromptBuilder.tsx         # Main editor component
│   │   ├── PromptBuilderDesktop.tsx  # Desktop layout
│   │   ├── PromptBuilderMobile.tsx   # Mobile layout
│   │   ├── SharedPromptWarningModal.tsx # Modal for shared prompt save warnings
│   │   └── types.ts                  # Shared props interface
│   └── index.ts
├── types/
│   ├── core.ts                       # Core prompt types
│   └── shared.ts                     # Shared prompts types (SharedPrompt, PromptAccessInfo)
└── README.md                         # This file

app/(authenticated)/ai/prompts/
├── page.tsx                          # Main prompts list
├── edit/[id]/page.tsx                # Edit prompt (with access level)
└── run/[id]/page.tsx                 # Run prompt (with access level)

supabase/migrations/
└── create_shared_prompts_functions.sql  # SQL functions and RLS policies
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
- Organization-level sharing (share with all org members)
- Advanced search with operators
- Prompt performance analytics
- Collaborative editing with conflict resolution

