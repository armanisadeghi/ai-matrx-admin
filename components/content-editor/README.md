# ContentEditor Component

A fully-featured, reusable content editor component with multiple view modes, auto-save, collapsible sections, and customizable header actions.

## Components

- **ContentEditor**: Single editor instance with full features
- **ContentEditorStack**: Array-based wrapper for rendering multiple editors

## Features

### 🎨 Multiple Editor Modes
- **Plain Text**: Simple textarea for basic editing
- **WYSIWYG**: Rich text editor using TUI Editor
- **Markdown**: Split view with live preview
- **Preview**: Read-only rendered markdown view

### 💾 Auto-Save
- Configurable debounce delay
- Visual saving indicators
- Last saved timestamp
- Optional save callback

### 🗂️ Collapsible
- Optional collapse/expand functionality
- Click entire header to toggle
- Independent state for stacked editors
- Perfect for organizing multiple content blocks

### ⚡ Header Actions
- Copy content to clipboard
- Download as markdown
- Custom actions with icons
- All optional and configurable

### 🎛️ Flexible Control
- Controlled or uncontrolled mode switching
- Parent can control active mode
- Filter available modes
- Show/hide mode selector
- Optional title display

## Installation

The components are located at `@/components/content-editor` and can be imported as:

```typescript
import { 
  ContentEditor, 
  ContentEditorStack,
  type HeaderAction,
  type ContentEditorStackItem 
} from '@/components/content-editor';
```

## Basic Usage

### Minimal Setup

```typescript
<ContentEditor
  value={content}
  onChange={setContent}
/>
```

### With Auto-Save

```typescript
<ContentEditor
  value={content}
  onChange={setContent}
  autoSave
  onSave={async (content) => {
    await saveToDatabase(content);
  }}
/>
```

### With Collapsible

```typescript
<ContentEditor
  value={content}
  onChange={setContent}
  collapsible
  defaultCollapsed={false}
  title="My Content"
/>
```

### With Header Actions

```typescript
import { Copy, Download } from 'lucide-react';

const headerActions: HeaderAction[] = [
  {
    id: 'copy',
    icon: Copy,
    label: 'Copy content',
    onClick: (content) => {
      navigator.clipboard.writeText(content);
    }
  },
  {
    id: 'download',
    icon: Download,
    label: 'Download',
    onClick: (content) => {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'content.md';
      a.click();
      URL.revokeObjectURL(url);
    }
  }
];

<ContentEditor
  value={content}
  onChange={setContent}
  headerActions={headerActions}
/>
```

### Controlled Mode

```typescript
const [mode, setMode] = useState<EditorMode>('plain');

<ContentEditor
  value={content}
  onChange={setContent}
  mode={mode}
  onModeChange={setMode}
/>
```

### Limited Modes

```typescript
<ContentEditor
  value={content}
  onChange={setContent}
  availableModes={['plain', 'preview']}
  initialMode="plain"
/>
```

## Props

### Content Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | **required** | Current content value |
| `onChange` | `(value: string) => void` | **required** | Content change handler |

### Mode Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `availableModes` | `EditorMode[]` | `['plain', 'wysiwyg', 'markdown', 'preview']` | Which modes to show |
| `initialMode` | `EditorMode` | `'plain'` | Starting mode |
| `mode` | `EditorMode` | `undefined` | Controlled mode from parent |
| `onModeChange` | `(mode: EditorMode) => void` | `undefined` | Mode change callback |

### Auto-Save Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `autoSave` | `boolean` | `false` | Enable auto-save |
| `autoSaveDelay` | `number` | `1000` | Debounce delay in ms |
| `onSave` | `(content: string) => Promise<void> \| void` | `undefined` | Save callback |

### Collapsible Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `collapsible` | `boolean` | `false` | Enable collapse/expand |
| `defaultCollapsed` | `boolean` | `false` | Initial collapsed state |
| `title` | `string` | `undefined` | Header title text |

### UI Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `headerActions` | `HeaderAction[]` | `[]` | Custom header actions |
| `placeholder` | `string` | `'Start typing...'` | Placeholder text |
| `showModeSelector` | `boolean` | `true` | Show/hide mode selector |
| `className` | `string` | `undefined` | Additional CSS classes |

## Types

### EditorMode
```typescript
type EditorMode = 'plain' | 'wysiwyg' | 'markdown' | 'preview';
```

### HeaderAction
```typescript
interface HeaderAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: (content: string) => void;
}
```

## ContentEditorStack

### Simple Array-Based Rendering

The `ContentEditorStack` component allows you to render multiple editors from a simple array of content strings. All editors share the same configuration:

```typescript
import { ContentEditorStack } from '@/components/content-editor';

// Simple array of content strings
const [contents, setContents] = useState([
  '# Introduction\n\nFirst section...',
  '# Main Content\n\nSecond section...',
  '# Conclusion\n\nFinal section...'
]);

<ContentEditorStack 
  contents={contents}
  onContentsChange={setContents}
  collapsible
  defaultCollapsed={true}
  generateTitle={(index) => ['Intro', 'Body', 'Conclusion'][index]}
  headerActions={myActions}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `contents` | `string[]` | **required** | Array of content strings |
| `onContentsChange` | `(contents: string[]) => void` | **required** | Callback when any content changes |
| `availableModes` | `EditorMode[]` | all modes | Which modes to show (applies to all) |
| `initialMode` | `EditorMode` | `'plain'` | Starting mode (applies to all) |
| `autoSave` | `boolean` | `false` | Enable auto-save (applies to all) |
| `autoSaveDelay` | `number` | `1000` | Auto-save delay in ms |
| `onSave` | `(content: string, index: number) => Promise<void>` | `undefined` | Save callback with content and index |
| `collapsible` | `boolean` | `false` | Make editors collapsible |
| `defaultCollapsed` | `boolean` | `false` | Default collapsed state (first is always open) |
| `generateTitle` | `(index: number) => string \| undefined` | `undefined` | Function to generate titles |
| `headerActions` | `HeaderAction[]` | `[]` | Header actions (same for all) |
| `placeholder` | `string` | `undefined` | Placeholder text (same for all) |
| `showModeSelector` | `boolean` | `true` | Show mode selector (applies to all) |
| `spacing` | `'sm' \| 'md' \| 'lg'` | `'md'` | Space between editors |
| `className` | `string` | `undefined` | Additional CSS classes |

### Dynamic Array Management

The component automatically handles array changes:

```typescript
// Add a new editor
setContents([...contents, '# New Section\n\n...']);

// Remove an editor
setContents(contents.filter((_, i) => i !== indexToRemove));

// Update a specific editor (handled automatically by onContentsChange)
```

### Benefits of Using ContentEditorStack

1. **Minimal State**: Just one array of strings in parent
2. **Dynamic**: Array grows/shrinks, editors render automatically
3. **Unified Config**: One set of settings for all editors
4. **Clean API**: No need to manage individual onChange callbacks
5. **Index Tracking**: Save callback receives index for database updates

## Advanced Examples

### Stacked Collapsible Editors (Manual)

Perfect for organizing multiple content sections:

```typescript
<div className="space-y-4">
  <div className="h-[400px]">
    <ContentEditor
      value={intro}
      onChange={setIntro}
      collapsible
      title="Introduction"
      headerActions={actions}
    />
  </div>
  
  <div className="h-[400px]">
    <ContentEditor
      value={body}
      onChange={setBody}
      collapsible
      defaultCollapsed
      title="Main Content"
      headerActions={actions}
    />
  </div>
  
  <div className="h-[300px]">
    <ContentEditor
      value={conclusion}
      onChange={setConclusion}
      collapsible
      defaultCollapsed
      title="Conclusion"
      headerActions={actions}
    />
  </div>
</div>
```

### With Full Control

```typescript
function ControlledEditor() {
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<EditorMode>('plain');
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async (newContent: string) => {
    setIsSaving(true);
    try {
      await api.saveContent(newContent);
      toast.success('Saved!');
    } catch (error) {
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <ContentEditor
      value={content}
      onChange={setContent}
      mode={mode}
      onModeChange={setMode}
      autoSave
      autoSaveDelay={2000}
      onSave={handleSave}
      title="Document Editor"
      headerActions={customActions}
      collapsible
    />
  );
}
```

## Technical Details

### TUI Editor Integration

The component properly uses the TUI Editor's ref API:
- Uses `getCurrentMarkdown()` method for content sync
- Handles content conversions automatically
- Prevents unnecessary re-renders
- Avoids escape character issues

### State Management

- Manages internal state for uncontrolled usage
- Supports controlled mode from parent
- Syncs content between different editor modes
- Debounced auto-save with cleanup

### Performance

- Dynamic imports for TUI editor (loaded only when needed)
- Memoized callbacks to prevent re-renders
- Ref-based content sync
- Efficient mode switching

## Testing

Test page available at: `/tests/content`

The test page demonstrates:
- All editor modes
- Auto-save functionality
- Controlled/uncontrolled modes
- Collapsible behavior
- Header actions (copy, download, share)
- Multiple stacked editors
- All configuration options

## Notes

- Each editor maintains full height within its container
- Content never scrolls internally - use parent container for scrolling
- Header actions receive current content at time of click
- Collapse state is independent for each editor instance
- All features are optional and can be disabled

