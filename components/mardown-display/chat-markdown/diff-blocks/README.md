# Streaming Diff Blocks

A high-performance, extensible system for rendering AI-generated code diffs with streaming support.

## Overview

The Streaming Diff Block system provides specialized rendering for code changes that stream in from AI models. It creates a seamless illusion where diffs appear instantly complete rather than awkwardly streaming in character by character.

### Key Features

- **🎭 Streaming Illusion**: Buffers SEARCH content silently, streams REPLACE as code, then instantly switches to diff view
- **⚡ High Performance**: Optimized for thousands of streaming chunks with minimal re-renders
- **🔌 Extensible**: Easy to add new diff styles beyond SEARCH/REPLACE
- **🎨 VS Code-like UI**: Minimal, professional loading states and diff visualization
- **📦 Automatic Integration**: Works automatically with existing code blocks marked as `diff`

## Architecture

### Components

```
diff-blocks/
├── types.ts                          # TypeScript definitions
├── diff-style-registry.ts           # Detection and routing system
├── StreamingDiffBlock.tsx           # Main state machine component
├── DiffLoadingIndicator.tsx         # Minimal loading UI
└── renderers/
    └── SearchReplaceDiffRenderer.tsx # SEARCH/REPLACE renderer
```

### State Machine

```
detecting → buffering → streaming → complete
          ↘ fallback (if unrecognized)
```

## Usage

### Automatic (Recommended)

The system automatically activates for any code block with `language="diff"` that contains recognized diff patterns:

````markdown
```diff
SEARCH:
<<<
old code
>>>

REPLACE:
<<<
new code
>>>
```
````

### Manual

```tsx
import { StreamingDiffBlock } from '@/components/mardown-display/chat-markdown/diff-blocks';

<StreamingDiffBlock
  content={streamingContent}
  language="typescript"
  isStreamActive={true}
/>
```

## Supported Diff Styles

### 1. SEARCH/REPLACE (Current)

**Format:**
```
SEARCH:
<<<
[exact code to find]
>>>

REPLACE:
<<<
[replacement code]
>>>
```

**Behavior:**
1. SEARCH content is buffered silently (shows "Analyzing code..." loader)
2. Once SEARCH completes, REPLACE content streams as code with "GENERATING" badge
3. When both complete, instantly switches to unified diff view

**Detection Confidence:**
- Has "SEARCH:": +40%
- Has "REPLACE:": +40%
- Has delimiters (<<<, >>>): +20%
- Minimum 60% confidence required

### 2. Unified Diff (Planned)

Standard Git-style unified diff with + and - markers.

### 3. Custom Styles (Future)

Easy to add new styles by implementing `DiffStyleHandler` interface.

## Adding New Diff Styles

### 1. Create Handler

```typescript
// diff-style-registry.ts

const myCustomDiffHandler: DiffStyleHandler = {
  name: 'my-custom-diff',
  canShowPartial: true, // Can we stream line-by-line?

  detect: (content: string): DiffStyleDetection => {
    // Return confidence 0-1 and metadata
    const hasMyMarkers = /MY_DIFF_MARKER/.test(content);
    return {
      style: 'my-custom-diff',
      confidence: hasMyMarkers ? 0.8 : 0,
      metadata: { hasMyMarkers },
    };
  },

  parse: (content: string) => {
    // Extract structured data from content
    return { /* parsed data */ };
  },
};
```

### 2. Create Renderer

```tsx
// renderers/MyCustomDiffRenderer.tsx

export const MyCustomDiffRenderer: React.FC<Props> = ({
  data,
  language,
  isStreamActive,
}) => {
  // Render based on parsed data and streaming state
  return <div>{/* Your UI */}</div>;
};
```

### 3. Register

```typescript
// diff-style-registry.ts
const DIFF_STYLE_HANDLERS = [
  searchReplaceHandler,
  myCustomDiffHandler, // Add here
];
```

```typescript
// StreamingDiffBlock.tsx - renderDiffByStyle()
case 'my-custom-diff':
  return <MyCustomDiffRenderer data={parsedData} ... />;
```

## Performance Optimization

### Memoization Strategy

```tsx
// ✅ Good: Memoized detection
const { state, style } = useStreamingState(content, isStreamActive);

// ✅ Good: Memoized parsing
const parsedData = useMemo(() => handler.parse(content), [handler, content]);

// ❌ Bad: Parsing on every render
const parsedData = handler.parse(content);
```

### Component Wrapping

```tsx
// All components wrapped in React.memo for reference equality
export const StreamingDiffBlock: React.FC<Props> = React.memo(({ ... }) => {
  // Component logic
});
```

### Lazy Loading

All diff components are lazy-loaded through the `BlockComponentRegistry`:

```typescript
const StreamingDiffBlock = lazy(() => 
  import("../diff-blocks/StreamingDiffBlock").then(m => ({ 
    default: m.StreamingDiffBlock 
  }))
);
```

## Testing

### Demo Page

Visit `/demo/component-demo/streaming-diff` to see:
- Multiple diff samples
- Speed controls (slow/medium/fast/instant)
- Raw markdown view
- Real streaming simulation

### Unit Testing

```tsx
// Test detection
const detection = detectDiffStyle(searchReplaceContent);
expect(detection.style).toBe('search-replace');
expect(detection.confidence).toBeGreaterThan(0.6);

// Test parsing
const handler = getDiffStyleHandler('search-replace');
const parsed = handler.parse(partialContent);
expect(parsed.searchComplete).toBe(true);
```

## Integration with Existing Code Editor

The system is **fully compatible** with the existing AI Code Editor Modal:

1. **Parser Compatible**: The `parseCodeEdits.ts` utility strips markdown code fences before parsing
2. **Format Agnostic**: Both ````diff` and plain ```` work identically
3. **No Breaking Changes**: Existing SEARCH/REPLACE functionality unchanged

### Example from AI Code Editor

```typescript
// In AICodeEditorModal.tsx - parseCodeEdits() strips the diff fence
const rawResponse = `
\`\`\`diff
SEARCH:
<<<
old code
>>>
...
\`\`\`
`;

// Parser sees:
// "SEARCH:\n<<<\nold code\n>>>\n..."
// ✅ Works perfectly
```

## Best Practices

### 1. Keep Renderers Simple

Each renderer should have one job: render its specific diff style efficiently.

```tsx
// ✅ Good: Focused renderer
export const SearchReplaceDiffRenderer = ({ data, language }) => {
  if (!data.searchComplete) return <LoadingIndicator />;
  if (!data.replaceComplete) return <CodeView code={data.replace} />;
  return <DiffView original={data.search} modified={data.replace} />;
};

// ❌ Bad: Doing too much
export const ComplexRenderer = ({ data }) => {
  // Fetching data, managing state, complex logic...
};
```

### 2. Confidence Thresholds

Set appropriate confidence thresholds in detection:

- **< 0.6**: Keep detecting or fallback to code block
- **0.6 - 0.8**: Likely correct, use with monitoring
- **> 0.8**: High confidence, safe to use

### 3. Graceful Degradation

Always provide fallbacks for unrecognized formats:

```tsx
if (detection.confidence < 0.6) {
  return <CodeBlock code={content} language="diff" />;
}
```

## Troubleshooting

### Issue: Diff not detected

**Check:**
1. Is `language="diff"` set on the code block?
2. Does content match expected pattern? (Use demo page to test)
3. Is confidence > 0.6? (Check console logs)

**Solution:**
Adjust detection logic or add more patterns to `detect()` function.

### Issue: Performance degradation

**Check:**
1. Are components properly memoized?
2. Is parsing happening on every render?
3. Are there unnecessary re-renders?

**Solution:**
Use React DevTools Profiler to identify bottlenecks. Ensure `useMemo` and `React.memo` are used correctly.

### Issue: Content not streaming properly

**Check:**
1. Is `isStreamActive` prop being passed correctly?
2. Is content actually changing between renders?
3. Are there console errors?

**Solution:**
Verify parent component is updating content and `isStreamActive` properly.

## Future Enhancements

- [ ] Unified diff renderer (Git-style +/-)
- [ ] Inline diff markers
- [ ] Side-by-side diff view
- [ ] Syntax-aware diffing (semantic diff)
- [ ] Copy individual changes
- [ ] Expand/collapse diff sections
- [ ] Search in diffs

## Related Systems

- **AI Code Editor Modal**: `/features/code-editor/components/AICodeEditorModal.tsx`
- **Diff View Component**: `/features/code-editor/components/DiffView.tsx`
- **Parse Code Edits**: `/features/code-editor/utils/parseCodeEdits.ts`
- **Block Registry**: `/components/mardown-display/chat-markdown/block-registry/`

---

**Created**: 2025-11-22
**Last Updated**: 2025-11-22
**Maintainer**: AI Matrx Team

