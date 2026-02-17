# Chat Markdown System - Complete Guide

## Overview

The chat markdown system provides a unified way to render AI responses with support for:
- ✅ Markdown formatting with syntax highlighting
- ✅ Real-time streaming
- ✅ Tool call visualizations
- ✅ Tables, code blocks, reasoning blocks
- ✅ Error resilience
- ✅ Both Redux/Socket.io and direct API events

## Quick Start

### Using MarkdownStream (Recommended)

The `MarkdownStream` component automatically handles both legacy and modern modes:

```tsx
import MarkdownStream from '@/components/MarkdownStream';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';
```

### Legacy Mode (Redux/Socket.io)

No changes needed to existing code:

```tsx
<MarkdownStream 
  content={messageContent}
  taskId={taskId}
  role="assistant"
  isStreamActive={isStreaming}
/>
```

**How it works:**
- Pass `content` string and optionally `taskId`
- Tool updates fetched automatically via Redux
- Works with existing Socket.io setup

### Event Mode (Direct API)

For new unified chat API:

```tsx
const [events, setEvents] = useState<StreamEvent[]>([]);

// Accumulate events as they arrive
const handleEvent = (event: StreamEvent) => {
  setEvents(prev => [...prev, event]);
};

<MarkdownStream 
  events={events}
  role="assistant"
  isStreamActive={isStreaming}
  onError={(error) => console.error(error)}
  onStatusUpdate={(status, msg) => console.log(status, msg)}
/>
```

**How it works:**
- Pass `events` array instead of content
- Component processes events automatically:
  - `chunk` events → accumulated into markdown
  - `tool_update` events → tool visualizations
  - `error` events → error display + callback
  - `status_update` events → status callback

## Event Types

### Chunk Events
```typescript
{ event: 'chunk', data: 'text content' }
// or
{ event: 'chunk', data: { chunk: 'text content' } }
```

### Tool Update Events
```typescript
{
  event: 'tool_update',
  data: {
    id: 'tool_123',
    type: 'mcp_input',  // or 'mcp_output', 'mcp_error'
    mcp_input: { name: 'tool_name', arguments: {...} },
    mcp_output: { status: 'success', result: {...} },
    user_message: 'Using tool...'
  }
}
```

### Error Events
```typescript
{
  event: 'error',
  data: {
    message: 'Error message',
    type: 'error_type',
    user_message: 'User-friendly error'
  }
}
```

### Status Update Events
```typescript
{
  event: 'status_update',
  data: {
    status: 'processing',
    user_message: 'Thinking...',
    metadata: {...}
  }
}
```

## Complete Example: Unified Chat API

```tsx
'use client';
import { useState } from 'react';
import MarkdownStream from '@/components/MarkdownStream';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';

export default function ChatPage() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');

  const sendMessage = async (message: string) => {
    setEvents([]);
    setIsStreaming(true);
    
    try {
      const response = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          ai_model_id: 'model-id',
          stream: true
        })
      });

      if (!response.ok) throw new Error('API error');

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            const event = JSON.parse(line) as StreamEvent;
            setEvents(prev => [...prev, event]);
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const event = JSON.parse(buffer) as StreamEvent;
        setEvents(prev => [...prev, event]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div>
      <button onClick={() => sendMessage('Hello!')}>
        Send Message
      </button>
      
      {error && <div className="error">{error}</div>}
      
      <MarkdownStream
        events={events}
        isStreamActive={isStreaming}
        role="assistant"
        onError={(error) => setError(error)}
        onStatusUpdate={(status, message) => {
          console.log('Status:', status, message);
        }}
      />
    </div>
  );
}
```

## Using the Hook (Alternative)

For cleaner code, use `useStreamEvents`:

```tsx
import { useStreamEvents } from '@/components/mardown-display/chat-markdown';

function ChatComponent() {
  const { events, isStreaming, processStream, reset } = useStreamEvents();

  const sendMessage = async () => {
    reset(); // Clear previous events
    
    const response = await fetch('/api/chat/unified', {...});
    await processStream(response); // Automatically processes stream
  };

  return (
    <MarkdownStream
      events={events}
      isStreamActive={isStreaming}
      role="assistant"
    />
  );
}
```

## Props Reference

### MarkdownStream Props

| Prop | Type | Description | Mode |
|------|------|-------------|------|
| `content` | `string` | Markdown content | Legacy |
| `events` | `StreamEvent[]` | Stream events array | New |
| `taskId` | `string` | Task ID for Redux lookup | Legacy |
| `role` | `string` | Message role (user/assistant/system) | Both |
| `isStreamActive` | `boolean` | Whether stream is active | Both |
| `onError` | `(error: string) => void` | Error callback | New |
| `onStatusUpdate` | `(status: string, msg?: string) => void` | Status callback | New |
| `className` | `string` | Additional CSS classes | Both |
| `hideCopyButton` | `boolean` | Hide copy button | Both |
| `allowFullScreenEditor` | `boolean` | Enable full-screen editor | Both |

## Features

### Automatic Mode Detection
The component automatically detects which mode to use:
- If `events` provided → Event mode
- If `content` provided → Legacy mode
- Both can coexist in the same application

### Tool Call Visualization
Tool updates are automatically visualized with:
- Tool name and arguments
- Execution status
- Output results
- Error messages
- Progress indicators

### Error Handling
- Error boundaries protect against rendering failures
- Graceful fallback to plain text
- Works without Redux provider (public pages)
- Callbacks for custom error handling

### Performance
- Memoized block processing
- Efficient state updates
- Minimal re-renders
- Handles rapid streams smoothly

## Migration Guide

### Migrating from Old MarkdownStream

**Before:**
```tsx
<MarkdownStream content={content} taskId={taskId} />
```

**After (no changes needed!):**
```tsx
<MarkdownStream content={content} taskId={taskId} />
// Works exactly the same
```

### Adding Event Support

**Step 1:** Add event state
```tsx
const [events, setEvents] = useState<StreamEvent[]>([]);
```

**Step 2:** Accumulate events during streaming
```tsx
setEvents(prev => [...prev, parsedEvent]);
```

**Step 3:** Pass to component
```tsx
<MarkdownStream events={events} isStreamActive={isStreaming} />
```

## TypeScript Support

All types are exported for type safety:

```typescript
import type { 
  StreamEvent, 
  ChunkData, 
  ToolUpdateData,
  ErrorData,
  StatusUpdateData 
} from '@/components/mardown-display/chat-markdown/types';
```

## Backward Compatibility

✅ **Zero Breaking Changes**
- All existing code works unchanged
- Redux/Socket.io integration intact
- Can mix both modes in same app

✅ **Coexistence**
- Legacy and new systems work side-by-side
- Gradual migration at your own pace
- No forced updates required

## Troubleshooting

### Tool Updates Not Showing

**Event mode:**
- Ensure events contain `tool_update` type
- Check event format matches `ToolUpdateData` interface
- Verify events array is updating

**Legacy mode:**
- Ensure Redux provider is available
- Check taskId is correct
- Verify Socket.io events are firing

### Console Log Not Appearing

Check you're removing the debug console.log from `EnhancedChatMarkdown.tsx`:
```tsx
// Remove this:
console.log("toolUpdates", toolUpdates);
```

### Content Not Rendering

**Event mode:**
- Verify `chunk` events are in the events array
- Check event data format (string or `{ chunk: string }`)

**Legacy mode:**
- Ensure `content` prop is passed
- Check content is valid markdown

## Best Practices

1. **Use MarkdownStream everywhere** - It handles both modes automatically
2. **Type your events** - Use `StreamEvent` type for type safety
3. **Handle errors** - Provide `onError` callback in event mode
4. **Clear events** - Reset events array when starting new stream
5. **Test both modes** - Ensure your implementation works in both scenarios

## Support

For issues or questions:
1. Check this guide for common scenarios
2. Review the TypeScript types for event structure
3. Test with minimal example to isolate issues
4. Check console for error messages (wrapped in error boundaries)

