# Quick Actions Feature

A consolidated feature providing quick access to Notes, Tasks, Chat, and Data through a dropdown menu and full-screen utilities hub.

## 📁 Structure

```
features/quick-actions/
├── components/
│   ├── QuickActionsMenu.tsx    # Main dropdown menu with quick access
│   ├── UtilitiesOverlay.tsx    # Full-screen tabbed utilities hub
│   ├── QuickChatSheet.tsx      # AI chat interface
│   └── QuickDataSheet.tsx      # Data tables viewer
├── index.ts                     # Public exports
└── README.md                    # This file
```

## 🎯 Components

### QuickActionsMenu

The main dropdown menu accessible via the ⚡ (Zap) icon in the application header.

**Features:**
- Notes quick access
- Tasks management
- AI Chat assistant
- Data tables viewer
- Full Utilities Hub launcher

**Usage:**
```tsx
import { QuickActionsMenu } from '@/features/quick-actions';

<QuickActionsMenu className="optional-class" />
```

### UtilitiesOverlay

Full-screen tabbed overlay for extended work with multiple tools.

**Tabs:**
- Notes
- Tasks
- Chat
- Data

**Usage:**
```tsx
import { UtilitiesOverlay } from '@/features/quick-actions';

<UtilitiesOverlay 
    isOpen={isOpen}
    onClose={onClose}
    initialTab="notes" // optional: 'notes' | 'tasks' | 'chat' | 'data'
/>
```

### QuickChatSheet

AI conversation interface using PromptRunnerModal with a specific chat prompt.

**Features:**
- AI-powered conversations
- "New Chat" button to start fresh
- State preservation between sessions
- Automatic prompt loading

**Usage:**
```tsx
import { QuickChatSheet } from '@/features/quick-actions';

<QuickChatSheet onClose={handleClose} />
```

### QuickDataSheet

User-generated table viewer with selection and management capabilities.

**Features:**
- Table selector dropdown
- Auto-selects first table
- Full table viewing and editing
- "Open in New Tab" functionality
- State preservation

**Usage:**
```tsx
import { QuickDataSheet } from '@/features/quick-actions';

<QuickDataSheet onClose={handleClose} />
```

## 🔧 Adding New Quick Actions

### 1. Create Your Component

Create your feature component (e.g., in its own feature directory or as a QuickXSheet component here).

### 2. Add to QuickActionsMenu

Edit `components/QuickActionsMenu.tsx`:

```typescript
// Add state
const [isMyFeatureOpen, setIsMyFeatureOpen] = useState(false);

// Add menu item
<DropdownMenuItem
    onClick={() => setIsMyFeatureOpen(true)}
    className="cursor-pointer"
>
    <MyIcon className="h-4 w-4 mr-2" />
    <div className="flex flex-col">
        <span>My Feature</span>
        <span className="text-xs text-zinc-500">Brief description</span>
    </div>
</DropdownMenuItem>

// Add FloatingSheet
<FloatingSheet
    isOpen={isMyFeatureOpen}
    onClose={() => setIsMyFeatureOpen(false)}
    title="My Feature"
    description="Feature description"
    position="right"
    width="xl"
    height="full"
    closeOnBackdropClick={true}
    closeOnEsc={true}
    showCloseButton={true}
>
    <MyFeatureSheet onClose={() => setIsMyFeatureOpen(false)} />
</FloatingSheet>
```

### 3. Add to UtilitiesOverlay (Optional)

If your feature benefits from a full-screen tab view:

Edit `components/UtilitiesOverlay.tsx`:

```typescript
{
    id: 'myfeature',
    label: (
        <div className="flex items-center gap-2">
            <MyIcon className="h-4 w-4" />
            <span>My Feature</span>
        </div>
    ) as any,
    content: (
        <div className="h-full">
            <MyFeatureComponent />
        </div>
    ),
}
```

## 🎨 Design Patterns

### State Preservation

All FloatingSheet components maintain their state when closed/reopened. The sheet becomes invisible but doesn't unmount, preserving:
- Form inputs
- Scroll positions
- Selected items
- Conversation history

### Consistent UX

All quick sheets follow the same pattern:
- Right-side positioning
- XL width, full height
- Backdrop click to close
- ESC key to close
- Show close button
- Compact header with actions

### Component Reusability

The quick actions feature reuses existing components:
- **Notes**: `QuickNotesSheet` from `@/features/notes`
- **Tasks**: `QuickTasksSheet` from `@/features/tasks`
- **Chat**: Custom wrapper around `PromptRunnerModal`
- **Data**: Custom wrapper around `UserTableViewer`

## 📦 Public API

```typescript
// Main components
export { QuickActionsMenu } from './components/QuickActionsMenu';
export { UtilitiesOverlay } from './components/UtilitiesOverlay';

// Quick sheet components
export { QuickChatSheet } from './components/QuickChatSheet';
export { QuickDataSheet } from './components/QuickDataSheet';
```

## 🔗 Integration

The QuickActionsMenu is integrated into:
- `components/layout/new-layout/MobileLayout.tsx`
- `components/layout/new-layout/DesktopLayout.tsx`

## ✨ Benefits of This Structure

1. **Centralized**: All quick actions in one feature directory
2. **Discoverable**: Easy to find and understand
3. **Maintainable**: Clear separation of concerns
4. **Scalable**: Simple pattern for adding new actions
5. **Consistent**: Follows established feature structure

## 🚀 Future Enhancements

Potential additions:
- Calendar quick view
- Recent files
- Bookmarks/favorites
- Quick commands palette
- Search interface
- Settings quick access

