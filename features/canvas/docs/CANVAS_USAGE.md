# Canvas System Usage Guide

The Canvas system allows any component to push interactive content to a side panel without prop drilling or tight coupling.

## Quick Start

### 1. Basic Usage - Opening Canvas

```tsx
import { useCanvas } from '@/hooks/useCanvas';

function MyQuizComponent({ quizData }) {
  const { open } = useCanvas();

  const handleExpand = () => {
    open({
      type: 'quiz',
      data: quizData,
      metadata: { 
        title: 'Interactive Quiz',
        sourceMessageId: messageId 
      }
    });
  };

  return (
    <div>
      <button onClick={handleExpand}>Open in Canvas</button>
      {/* ... rest of component */}
    </div>
  );
}
```

### 2. Check if Canvas is Open

```tsx
function MyComponent() {
  const { isOpen, content } = useCanvas();

  if (isOpen) {
    // Canvas is currently showing content
    console.log('Canvas content type:', content?.type);
  }
}
```

### 3. Close Canvas

```tsx
function MyComponent() {
  const { close } = useCanvas();

  return <button onClick={close}>Close Canvas</button>;
}
```

## Supported Content Types

- `'quiz'` - Multiple choice quizzes
- `'presentation'` - Slideshows
- `'iframe'` - External URLs in iframe
- `'html'` - Raw HTML content
- `'code'` - Code blocks with syntax highlighting
- `'image'` - Image viewer
- `'diagram'` - Interactive diagrams
- `'comparison'` - Comparison tables
- `'timeline'` - Timeline visualizations
- `'research'` - Research documents
- `'troubleshooting'` - Troubleshooting guides
- `'decision-tree'` - Decision trees
- `'flashcards'` - Flashcard sets
- `'recipe'` - Cooking recipes

## Examples

### Quiz
```tsx
open({
  type: 'quiz',
  data: {
    title: 'Math Quiz',
    questions: [...],
    // ... quiz data structure
  }
});
```

### Presentation
```tsx
open({
  type: 'presentation',
  data: {
    slides: [...],
    // ... presentation data
  }
});
```

### IFrame
```tsx
open({
  type: 'iframe',
  data: {
    url: 'https://example.com',
  },
  metadata: {
    title: 'External Resource'
  }
});
```

### HTML Content
```tsx
open({
  type: 'html',
  data: {
    html: '<div>Custom HTML content</div>'
  }
});
```

## Adding to EnhancedChatMarkdown Blocks

To add canvas support to any block in EnhancedChatMarkdown:

1. Import the hook:
```tsx
import { useCanvas } from '@/hooks/useCanvas';
```

2. Use it in your component:
```tsx
const YourBlock = ({ data }) => {
  const { open } = useCanvas();
  
  return (
    <div>
      <button onClick={() => open({ type: 'your-type', data })}>
        Open in Canvas
      </button>
    </div>
  );
};
```

3. That's it! No prop drilling, no parent updates needed.

## How It Works

The canvas system uses Redux for global state management:
- Any component can dispatch `openCanvas()` action
- `AdaptiveLayout` subscribes to canvas state
- When canvas opens, it automatically renders in the side panel
- User can resize canvas width (persisted in Redux)
- Clean separation: blocks don't need to know about layout

## Benefits

- ✅ **Zero prop drilling** - Works from deeply nested components
- ✅ **Consistent** - Same pattern everywhere
- ✅ **Streaming safe** - Works perfectly with streaming content
- ✅ **Type safe** - Full TypeScript support
- ✅ **Easy to extend** - Add new content types easily
- ✅ **State management** - Canvas width, history (future), etc.

