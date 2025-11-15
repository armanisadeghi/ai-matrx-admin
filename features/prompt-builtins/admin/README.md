# Prompt Builtins Admin Components

This directory contains components for managing prompt builtins, shortcuts, and categories in the admin interface.

## Components

### ShortcutsTableManager (Recommended)

**Primary admin interface** - A comprehensive table-based view focused on shortcuts management, inspired by `ConsolidatedSystemPromptsManager`.

**Features:**
- Table view with sortable columns
- Comprehensive filtering (search, category, placement, status, active/inactive)
- Compact stats dashboard
- Edit shortcuts in a dialog
- Connect/create prompts inline
- Toggle active/inactive status
- Full CRUD operations
- Automatic data refresh after saves

```tsx
import { ShortcutsTableManager } from '@/features/prompt-builtins/admin';

<ShortcutsTableManager />
```

**Columns:**
- Status indicator (connected/unconnected)
- Label & description
- Category
- Placement type
- Keyboard shortcut
- AI Prompt connection
- Active status
- Actions (edit, toggle, delete)

### PromptBuiltinsManager (Alternative)

Tree-based management interface with a sidebar and edit panel.

**Features:**
- Tree view or flat shortcuts-only view
- Expand/Collapse all categories
- Create, edit, and delete categories and shortcuts
- Search and filter by placement type

```tsx
import { PromptBuiltinsManager } from '@/features/prompt-builtins/admin';

<PromptBuiltinsManager />
```

### PromptBuiltinEditPanel (Reusable)

A reusable edit panel component that can be embedded anywhere.

```tsx
import { PromptBuiltinEditPanel } from '@/features/prompt-builtins/admin';

<PromptBuiltinEditPanel
  selectedItem={{ type: 'shortcut', data: shortcutData }}
  editShortcutData={editData}
  categories={categories}
  builtins={builtins}
  onShortcutChange={(field, value) => {
    // Handle changes
  }}
  onOpenBuiltinEditor={(id) => {
    // Open builtin editor
  }}
  onOpenSelectPromptModal={() => {
    // Open prompt selection modal
  }}
  onToast={(message) => {
    // Show toast
  }}
/>
```

### PromptBuiltinEditDialog (Reusable Dialog Wrapper)

A complete dialog wrapper with save/discard/delete functionality.

**Usage Example:**

```tsx
import { PromptBuiltinEditDialog } from '@/features/prompt-builtins/admin';
import { useState } from 'react';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedShortcut, setSelectedShortcut] = useState(null);

  const handleEdit = (shortcut) => {
    setSelectedShortcut(shortcut);
    setIsOpen(true);
  };

  return (
    <>
      <button onClick={() => handleEdit(someShortcut)}>
        Edit Shortcut
      </button>

      {selectedShortcut && (
        <PromptBuiltinEditDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          item={{ type: 'shortcut', data: selectedShortcut }}
          onUpdate={() => {
            // Reload your data
            fetchShortcuts();
          }}
        />
      )}
    </>
  );
}
```

## Features

### 1. Expand All / Collapse All

In tree view mode, use the buttons to expand or collapse all categories at once.

### 2. View Modes

- **Tree View**: Hierarchical view with categories and nested shortcuts
- **Shortcuts View**: Flat list showing only shortcuts with their category labels

Switch between modes using the toggle buttons at the top of the sidebar.

### 3. Reusable Components

The edit panel and dialog are fully reusable:

- `PromptBuiltinEditPanel`: The form itself
- `PromptBuiltinEditDialog`: Complete dialog with save/delete functionality
- Both work exactly like the main manager
- Can be imported and used anywhere in your application

## Example: Using in a Custom Page

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PromptBuiltinEditDialog } from '@/features/prompt-builtins/admin';

export default function MyCustomPage() {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Your shortcuts list
  const shortcuts = [/* ... */];

  return (
    <div>
      <h1>My Shortcuts</h1>
      {shortcuts.map(shortcut => (
        <div key={shortcut.id}>
          <span>{shortcut.label}</span>
          <Button 
            onClick={() => {
              setSelectedItem({ type: 'shortcut', data: shortcut });
              setIsEditOpen(true);
            }}
          >
            Edit
          </Button>
        </div>
      ))}

      {selectedItem && (
        <PromptBuiltinEditDialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          item={selectedItem}
          onUpdate={() => {
            // Refresh your shortcuts list
            fetchShortcuts();
          }}
        />
      )}
    </div>
  );
}
```

## API

### PromptBuiltinEditPanel Props

| Prop | Type | Description |
|------|------|-------------|
| `selectedItem` | `{ type: 'category' \| 'shortcut', data: ... }` | The item being edited |
| `editCategoryData` | `Partial<ShortcutCategory>` | Category edit state (if editing category) |
| `editShortcutData` | `Partial<PromptShortcut>` | Shortcut edit state (if editing shortcut) |
| `categories` | `ShortcutCategory[]` | All categories |
| `builtins` | `PromptBuiltin[]` | All prompt builtins |
| `onCategoryChange` | `(field, value) => void` | Category field change handler |
| `onShortcutChange` | `(field, value) => void` | Shortcut field change handler |
| `onOpenBuiltinEditor` | `(id) => void` | Open builtin editor callback |
| `onOpenSelectPromptModal` | `() => void` | Open prompt selection modal callback |
| `onToast` | `(message) => void` | Toast notification callback |

### PromptBuiltinEditDialog Props

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Dialog open state |
| `onClose` | `() => void` | Close dialog callback |
| `item` | `{ type: 'category' \| 'shortcut', data: ... }` | The item being edited |
| `onUpdate` | `() => void` | Called after successful update/delete |

## Notes

- The dialog handles all state management internally
- Changes are saved to the database automatically
- The dialog includes unsaved changes detection
- All modals (prompt selection, builtin editor) are included in the dialog

