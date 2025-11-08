# Unified List Layout System

A comprehensive, reusable layout system for list/grid pages with mobile-first design, voice input, dynamic filtering, and hierarchical data support.

## Features

✅ **Mobile-First Design**
- iOS-style floating action bar on mobile
- Safe area handling with `pb-safe`
- Responsive grid layouts
- Touch-optimized interactions

✅ **Voice Input Integration**
- Built-in voice search on mobile and desktop
- Recording overlay with pause/resume
- Automatic transcription
- Seamless integration with search

✅ **Dynamic Filtering**
- Sort options (A-Z, Z-A, custom)
- Select filters (dropdown)
- Multi-select filters (checkboxes)
- Tags filters (badge selection)
- Toggle filters (switches)
- Custom filter components

✅ **Search Capabilities**
- Real-time search filtering
- Custom filter functions
- Voice input support
- Mobile: compact and active modes
- Desktop: prominent search bar

✅ **Navigation Management**
- Loading overlays on active cards
- Duplicate action prevention
- Disabled states during navigation
- Smooth transitions

✅ **CRUD Operations**
- View, edit, delete, duplicate actions
- Custom actions per item
- Delete confirmations with custom messages
- Async operation handling

✅ **Hierarchical Data Support** *(Coming Soon)*
- Folder navigation
- Breadcrumbs
- Tree view sidebar
- Parent-child relationships

---

## Installation

The system is located in `components/official/unified-list/`:

```tsx
import { UnifiedListLayout } from '@/components/official/unified-list';
```

---

## Quick Start

### 1. Define Your Data Type

```typescript
// features/your-feature/types.ts
export interface YourItem {
  id: string;
  name: string;
  description?: string;
  // ... other properties
}
```

### 2. Create Configuration

```typescript
// features/your-feature/config/your-config.ts
import { UnifiedListLayoutConfig } from '@/components/official/unified-list/types';
import { YourItem } from '../types';

export const yourConfig: UnifiedListLayoutConfig<YourItem> = {
  page: {
    title: "Your Items",
    icon: YourIcon,
    emptyMessage: "No items found. Create your first item!",
  },
  
  search: {
    enabled: true,
    placeholder: "Search items...",
    voice: true,
    filterFn: (item, term) => item.name.toLowerCase().includes(term),
  },
  
  filters: {
    sortOptions: [
      { value: "name-asc", label: "Name (A-Z)", sortFn: (a, b) => a.name.localeCompare(b.name) },
    ],
  },
  
  actions: [
    { id: "new", label: "New Item", icon: Plus, variant: "primary", showOnMobile: true, showOnDesktop: true, onClick: () => {} },
  ],
  
  layout: {
    gridCols: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    gap: "gap-6",
  },
  
  itemActions: {
    onView: (id) => `/your-route/${id}`,
    onEdit: (id) => `/your-route/${id}/edit`,
    onDelete: async (id) => { /* delete logic */ },
    onDuplicate: async (id) => { /* duplicate logic */ },
  },
};
```

### 3. Create Card Component

```typescript
// features/your-feature/components/YourCard.tsx
import { YourItem } from '../types';
import { RenderCardActions } from '@/components/official/unified-list/types';

interface YourCardProps {
  item: YourItem;
  actions: RenderCardActions<YourItem>;
}

export function YourCard({ item, actions }: YourCardProps) {
  return (
    <Card
      className={actions.isAnyNavigating ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02]"}
      onClick={actions.onView}
    >
      {/* Your card content */}
    </Card>
  );
}
```

### 4. Create Grid Component

```typescript
// features/your-feature/components/YourGrid.tsx
import { UnifiedListLayout } from '@/components/official/unified-list';
import { yourConfig } from '../config/your-config';
import { YourCard } from './YourCard';

export function YourGrid({ items }) {
  const router = useRouter();
  
  // Override config with actual implementations
  const config = {
    ...yourConfig,
    actions: yourConfig.actions.map(action => ({
      ...action,
      onClick: () => router.push('/your-route/new'),
    })),
  };
  
  return (
    <UnifiedListLayout
      config={config}
      items={items}
      renderCard={(item, actions) => <YourCard item={item} actions={actions} />}
    />
  );
}
```

### 5. Use in Page

```typescript
// app/(authenticated)/your-route/page.tsx
export default async function YourPage() {
  const items = await fetchYourItems();
  
  return (
    <>
      <YourPageHeader />
      <div className="h-page w-full overflow-auto">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 max-w-[1800px]">
          <YourGrid items={items} />
        </div>
      </div>
    </>
  );
}
```

---

## Configuration Guide

### Page Configuration

```typescript
page: {
  title: string;              // Page title
  icon?: LucideIcon;          // Optional icon for header
  description?: string;       // Optional description
  emptyMessage?: string;      // Message when no items
  emptyAction?: {            // Optional action for empty state
    label: string;
    onClick: () => void;
  };
}
```

### Search Configuration

```typescript
search: {
  enabled: boolean;           // Enable search
  placeholder: string;        // Search placeholder text
  voice?: boolean;           // Enable voice input (default: true if search enabled)
  filterFn: (item, term) => boolean;  // Filter function
  customComponent?: ComponentType;     // Optional custom search component
}
```

### Filter Configuration

```typescript
filters?: {
  sortOptions: SortOption[];        // Sort options
  defaultSort?: string;             // Default sort value
  customFilters?: FilterDefinition[]; // Custom filters
}

// Sort Option
{
  value: string;                    // Option value
  label: string;                    // Display label
  sortFn: (a, b) => number;        // Sort function
}

// Filter Definition
{
  id: string;                       // Unique ID
  label: string;                    // Display label
  type: 'select' | 'multiselect' | 'tags' | 'toggle' | 'custom';
  options?: Array<{ value: string; label: string }>;
  filterFn: (item, value) => boolean;
  defaultValue?: any;
  extractOptions?: (items) => Array<{ value: string; label: string }>;
}
```

### Actions Configuration

```typescript
actions: ActionConfig[];

// Action Config
{
  id: string;                     // Unique ID
  label: string;                  // Button label
  icon: LucideIcon;              // Lucide icon
  onClick: () => void;           // Click handler
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  showOnMobile?: boolean;        // Show on mobile (default: true)
  showOnDesktop?: boolean;       // Show on desktop (default: true)
  badge?: string | number;       // Optional badge
  disabled?: boolean;            // Disabled state
  tooltip?: string;              // Tooltip text
}
```

### Layout Configuration

```typescript
layout: {
  gridCols: string;              // Tailwind grid classes
  gap: string;                   // Tailwind gap classes
  containerClass?: string;       // Additional container classes
}
```

### Item Actions Configuration

```typescript
itemActions?: {
  onView?: (id: string) => string | void;           // View action
  onEdit?: (id: string) => string | void;           // Edit action
  onDelete?: (id: string) => Promise<void>;         // Delete action
  onDuplicate?: (id: string) => Promise<void>;      // Duplicate action
  onShare?: (id: string) => void;                   // Share action
  customActions?: CustomItemAction[];               // Custom actions
  deleteConfirmation?: {                            // Delete confirmation config
    title: string;
    message: (itemName: string) => string;
    confirmLabel?: string;
    cancelLabel?: string;
  };
}
```

---

## Advanced Features

### Custom Filter Components

```typescript
// Define custom filter
{
  id: "custom",
  label: "Custom Filter",
  type: "custom",
  component: MyCustomFilter,
  filterFn: (item, value) => /* logic */,
}

// Implement custom filter component
function MyCustomFilter({ filter, value, onChange, items }) {
  return (
    <div>
      {/* Your custom filter UI */}
    </div>
  );
}
```

### Dynamic Filter Options

```typescript
// Extract options from items automatically
{
  id: "status",
  label: "Status",
  type: "select",
  extractOptions: (items) => {
    const statuses = extractUniqueValues(items, "status");
    return statuses.map(s => ({ value: s, label: s }));
  },
  filterFn: (item, value) => value === "all" || item.status === value,
}
```

### Custom Item Actions

```typescript
customActions: [
  {
    id: "convert",
    icon: ArrowRightLeft,
    label: "Convert",
    tooltip: "Convert to another format",
    onClick: (item) => {
      // Your custom logic
    },
    disabled: (item) => !item.canConvert,
  },
]
```

### Voice Input Configuration

```typescript
voice: {
  enabled: boolean;                              // Enable voice input
  autoTranscribe?: boolean;                      // Auto-transcribe (default: true)
  onTranscriptionComplete?: (text) => void;     // Custom handler
  onError?: (error) => void;                    // Error handler
}
```

---

## Best Practices

### 1. Configuration Organization

```
features/your-feature/
├── config/
│   └── your-config.ts        # Configuration
├── components/
│   ├── YourCard.tsx          # Card component
│   ├── YourGrid.tsx          # Grid component
│   └── YourPageHeader.tsx    # Header component
└── types.ts                  # Type definitions
```

### 2. Override Actions in Grid Component

Always override action handlers in the grid component, not in the config file:

```typescript
const config = {
  ...yourConfig,
  actions: yourConfig.actions.map(action => ({
    ...action,
    onClick: () => {
      // Actual implementation here
    },
  })),
};
```

### 3. Use Type-Safe Navigation

Return paths from onView and onEdit:

```typescript
itemActions: {
  onView: (id) => `/your-route/${id}`,
  onEdit: (id) => `/your-route/${id}/edit`,
}
```

### 4. Error Handling in Async Actions

Always re-throw errors to maintain loading states:

```typescript
onDelete: async (id) => {
  try {
    await deleteItem(id);
    router.refresh();
    toast.success("Deleted!");
  } catch (error) {
    toast.error("Failed to delete");
    throw error; // Re-throw to keep deleting state
  }
}
```

### 5. Mobile Testing

Always test on actual iOS devices to ensure:
- Safe areas work correctly
- Voice input functions properly
- Touch interactions feel natural
- Floating action bar is accessible

---

## Examples

See the following implementations:

1. **Recipes** (Simple, flat structure)
   - Config: `features/recipes/config/recipes-config.ts`
   - Grid: `features/recipes/components/RecipesGridUnified.tsx`
   - Card: `features/recipes/components/RecipeCardUnified.tsx`

2. **Prompts** (Original implementation - reference)
   - Page: `app/(authenticated)/ai/prompts/page.tsx`
   - Components: `features/prompts/components/`

---

## Troubleshooting

### Actions not working

Make sure to override the onClick handlers in your grid component:

```typescript
const config = {
  ...yourConfig,
  actions: yourConfig.actions.map(action => ({
    ...action,
    onClick: () => router.push('/your-route'),
  })),
};
```

### Navigation not working

Ensure onView and onEdit return strings (paths):

```typescript
itemActions: {
  onView: (id) => `/your-route/${id}`,  // Return path as string
}
```

### Voice input not working

Make sure voice is enabled in config:

```typescript
search: {
  enabled: true,
  voice: true,  // Enable voice
  // ...
}
```

### Filters not updating

Check that you're using the correct filter type and filterFn:

```typescript
{
  type: "select",  // Must match UI component
  filterFn: (item, value) => value === "all" || item.property === value,
}
```

---

## API Reference

See `types.ts` for complete API documentation.

---

## Migration Guide

### From Old Grid Component to Unified System

1. Create configuration file
2. Create new card component using `RenderCardActions`
3. Create new grid component using `UnifiedListLayout`
4. Update page to use new components
5. Test on mobile and desktop
6. Remove old components

---

## Contributing

When extending the system:

1. Maintain backward compatibility
2. Add new features via configuration (not breaking changes)
3. Update TypeScript types
4. Document new features in this README
5. Test on mobile and desktop
6. Update examples

---

## Support

For questions or issues:
1. Check this README
2. Review example implementations (recipes, prompts)
3. Check TypeScript types in `types.ts`
4. Review utility functions in `utils.ts`

---

## License

Internal use only - AI Matrx Admin Application

