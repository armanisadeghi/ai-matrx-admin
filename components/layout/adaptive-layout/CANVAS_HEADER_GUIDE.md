# Canvas Header System Guide

## Overview

The Canvas Header system provides a flexible, professional header for canvas panels with built-in support for common features and easy customization per canvas type.

## Features

### ✅ Core Features (Available Now)

1. **Source/Preview Toggle** - Switch between preview mode and raw JSON source
2. **Cloud Sync Status** - Visual indicator and manual sync trigger
3. **Share Button** - Share functionality hook
4. **Custom Actions Slot** - Add canvas-specific controls
5. **Professional Design** - Rounded corners, proper borders, clean spacing
6. **Responsive** - Works on all screen sizes
7. **Tooltips** - Helpful tooltips for all actions

### 🚧 In Development

- Full sync implementation for all canvas types (currently only quizzes)
- Share functionality with multiple targets
- Canvas-specific custom actions

## Basic Usage

```tsx
import { CanvasHeader } from '@/components/layout/adaptive-layout';

<CanvasHeader
  title="My Canvas"
  subtitle="Optional subtitle"
  onClose={handleClose}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
  isSynced={false}
  onSync={handleSync}
  onShare={handleShare}
/>
```

## Props Reference

### Required Props

- `title: string` - Canvas title shown in header
- `onClose: () => void` - Callback when close button clicked

### View Mode Props

- `viewMode?: 'preview' | 'source'` - Current view mode (default: 'preview')
- `onViewModeChange?: (mode: ViewMode) => void` - Callback for view mode changes
- `hideViewToggle?: boolean` - Hide the source/preview toggle (default: false)

### Cloud Sync Props

- `isSynced?: boolean` - Whether content is synced to cloud
- `isSyncing?: boolean` - Whether sync is in progress
- `onSync?: () => void` - Callback for manual sync trigger
- `hideSync?: boolean` - Hide sync button (default: false)

### Share Props

- `onShare?: () => void` - Callback when share button clicked
- `hideShare?: boolean` - Hide share button (default: false)

### Customization Props

- `subtitle?: string` - Optional subtitle below title
- `customActions?: ReactNode` - Custom action buttons/controls
- `className?: string` - Additional CSS classes
- `variant?: 'default' | 'minimal'` - Header style variant

## Advanced Usage

### Custom Actions

Add canvas-specific controls between the view toggle and sync button:

```tsx
<CanvasHeader
  title="Rich Text Editor"
  onClose={handleClose}
  customActions={
    <>
      <Button size="sm" variant="ghost">
        <Save className="w-4 h-4" />
      </Button>
      <Button size="sm" variant="ghost">
        <Download className="w-4 h-4" />
      </Button>
    </>
  }
/>
```

### Conditional Features

Show/hide features based on canvas type:

```tsx
const hasSyncSupport = contentType === 'quiz';

<CanvasHeader
  title="Canvas"
  onClose={handleClose}
  hideSync={!hasSyncSupport}
  onSync={hasSyncSupport ? handleSync : undefined}
/>
```

### View Mode Implementation

```tsx
const [viewMode, setViewMode] = useState<ViewMode>('preview');

<CanvasHeader
  title="Canvas"
  onClose={handleClose}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
/>

{/* Render content based on view mode */}
{viewMode === 'preview' ? (
  <MyCanvasContent />
) : (
  <pre>{JSON.stringify(data, null, 2)}</pre>
)}
```

## Creating Canvas-Specific Headers

### Example: Rich Text Editor Header

```tsx
function RichTextEditorHeader({
  title,
  onClose,
  onSave,
  onExport,
  isSaved,
}: RichTextEditorHeaderProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  
  return (
    <CanvasHeader
      title={title}
      subtitle="Rich text document"
      onClose={onClose}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      isSynced={isSaved}
      onSync={onSave}
      customActions={
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                className="h-7 w-7 p-0"
              >
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export document</TooltipContent>
          </Tooltip>
        </>
      }
    />
  );
}
```

### Example: Image Editor Header

```tsx
function ImageEditorHeader({
  title,
  onClose,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ImageEditorHeaderProps) {
  return (
    <CanvasHeader
      title={title}
      subtitle="Image editing"
      onClose={onClose}
      hideViewToggle // Images don't need source view
      isSynced={false}
      onSync={onSave}
      customActions={
        <>
          <Button
            variant="ghost"
            size="sm"
            disabled={!canUndo}
            onClick={onUndo}
            className="h-7 w-7 p-0"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!canRedo}
            onClick={onRedo}
            className="h-7 w-7 p-0"
          >
            <Redo className="w-4 h-4" />
          </Button>
        </>
      }
    />
  );
}
```

## Styling Guidelines

### Colors & Borders

- Header background: `bg-zinc-50/95 dark:bg-zinc-900/95`
- Border: `border-zinc-200 dark:border-zinc-800`
- Text: `text-zinc-900 dark:text-zinc-100`
- Muted text: `text-zinc-500 dark:text-zinc-400`

### Spacing

- Header padding: `px-4 py-2.5`
- Gap between elements: `gap-1` for buttons, `gap-3` for sections
- Divider: `w-px h-5` with `mx-1` margins

### Button Sizes

- Standard buttons: `h-7 w-7 p-0`
- Toggle buttons: `h-7 px-2.5`
- Icon size: `w-4 h-4` (standard), `w-3.5 h-3.5` (compact)

## Future Enhancements

### Planned Features

1. **Full Sync System**
   - Database tables for all canvas types
   - Real-time sync status
   - Conflict resolution
   - Version history

2. **Share System**
   - Public link generation
   - Permission management
   - Embed options
   - Export formats

3. **Canvas-Specific Actions**
   - Rich text editor: Format controls, export options
   - Image editor: Filters, crop, resize tools
   - Code editor: Language selector, run button
   - Presentation: Slide navigation, presenter mode

4. **Collaborative Features**
   - Live collaboration indicators
   - User presence
   - Comments/annotations

## Integration with CanvasRenderer

The `CanvasRenderer` component automatically uses `CanvasHeader` for all canvas types:

```tsx
export function CanvasRenderer({ content }: CanvasRendererProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  
  return (
    <div className="h-full flex flex-col">
      <CanvasHeader
        title={content.metadata?.title || getDefaultTitle(content.type)}
        subtitle={getSubtitle(content.type)}
        onClose={handleClose}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        // ... other props based on content type
      />
      
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'preview' ? renderContent(content) : renderSource(content)}
      </div>
    </div>
  );
}
```

## Best Practices

1. **Always provide meaningful titles** - Use descriptive titles that help users identify the content
2. **Use subtitles for context** - Add subtitles to clarify the canvas type or purpose
3. **Hide irrelevant features** - Use `hideSync`, `hideShare`, etc. when features aren't applicable
4. **Provide feedback** - Use `isSyncing` to show loading states
5. **Keep custom actions minimal** - Only add truly essential custom actions
6. **Use tooltips** - Always provide helpful tooltips for custom actions
7. **Match the design system** - Follow the color and spacing guidelines

## Questions?

For implementation help or feature requests, refer to:
- `components/layout/adaptive-layout/CanvasHeader.tsx` - Component source
- `components/layout/adaptive-layout/CanvasRenderer.tsx` - Usage example

