# Chat Markdown Components

> **📖 [Complete Guide →](./GUIDE.md)** - Read the comprehensive guide for all details

## Quick Start

Use `MarkdownStream` everywhere - it handles both legacy and modern modes automatically:

```tsx
import MarkdownStream from '@/components/MarkdownStream';
```

### Legacy Mode (Redux/Socket.io) - No Changes Needed

```tsx
<MarkdownStream 
  content={messageContent}
  taskId={taskId}
  role="assistant"
  isStreamActive={isStreaming}
/>
```

### Event Mode (Direct API) - New Capability

```tsx
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';

const [events, setEvents] = useState<StreamEvent[]>([]);

<MarkdownStream 
  events={events}
  role="assistant"
  isStreamActive={isStreaming}
  onError={(error) => setErrorMessage(error)}
/>
```

## What's New

The `MarkdownStream` component now supports **both** systems in one simple interface:

✅ **Zero Breaking Changes** - All existing code works unchanged  
✅ **Event Support** - Pass `events` array for direct API integration  
✅ **Tool Visualizations** - Works in both modes automatically  
✅ **Type Safety** - Full TypeScript support with exported types  
✅ **Error Resilience** - Graceful fallbacks and error boundaries  

## Key Features

- 🎨 **Rich Markdown** - Code blocks, tables, reasoning, math
- 🔄 **Real-time Streaming** - Smooth updates as content arrives
- 🛠️ **Tool Calls** - Visual components for function execution
- 📊 **Status Updates** - Callbacks for processing states
- 🚨 **Error Handling** - Both inline display and callbacks
- 🎯 **Automatic Mode** - Detects legacy vs event mode automatically

## Complete Documentation

**[→ Read the Complete Guide](./GUIDE.md)** for:
- Detailed usage examples
- Event type reference
- Complete API documentation
- Migration strategies
- Troubleshooting
- Best practices

## Components Available

| Component | Use Case |
|-----------|----------|
| `MarkdownStream` | **Primary component** - Use everywhere (recommended) |
| `StreamAwareChatMarkdown` | Low-level event processor (used internally) |
| `EnhancedChatMarkdown` | Core renderer (used internally) |
| `useStreamEvents` | Hook for stream processing |

## Event Types

All event types are exported from `types.ts`:

```typescript
import type { 
  StreamEvent,      // Base event structure
  ChunkData,        // Text chunks
  ToolUpdateData,   // Tool execution
  ErrorData,        // Errors
  StatusUpdateData  // Status updates
} from '@/components/mardown-display/chat-markdown/types';
```

## Migration

**Existing code:** Works unchanged - no migration needed!

**New features:** Just add `events` prop to existing `MarkdownStream` usage:

```tsx
// Before (still works)
<MarkdownStream content={content} taskId={taskId} />

// After (add event support)
<MarkdownStream events={events} isStreamActive={isStreaming} />
```

## Architecture

```
MarkdownStream (Public API)
    ↓
StreamAwareChatMarkdown (Event Processor)
    ↓
EnhancedChatMarkdown (Core Renderer)
    ↓
Block Renderers (Code, Tables, Text, etc.)
```

Both Redux and direct events flow through the same pipeline, ensuring consistent rendering regardless of data source.

