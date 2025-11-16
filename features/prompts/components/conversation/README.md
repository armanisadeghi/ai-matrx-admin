# Conversation Components

Reusable conversation display components for prompt running and chat interfaces.

## Components

### ConversationDisplay

Displays a scrollable list of conversation messages with auto-scrolling support.

**Use this when:** You need just the messages display without an input field.

```tsx
import { ConversationDisplay } from '@/features/prompts/components/conversation';

<ConversationDisplay
  messages={conversationMessages}
  isStreaming={isTestingPrompt}
  emptyState={<CustomEmptyState />}
  bottomPadding="240px"
  enableAutoScroll={true}
/>
```

**Props:**
- `messages`: Array of conversation messages (user/assistant)
- `isStreaming`: Whether currently streaming a response
- `emptyState`: Custom empty state component (optional)
- `className`: Additional CSS classes
- `bottomPadding`: Space for fixed elements (default: "240px") - only for 'overlay' variant
- `enableAutoScroll`: Enable auto-scrolling (default: true)
- `scrollBehavior`: Scroll animation ('smooth' or 'auto')
- `variant`: Layout mode - 'overlay' (default, absolute positioned) or 'inline' (regular flow)

**Features:**
- Auto-scrolls to bottom on new messages
- Smart scrolling during streaming (only if near bottom)
- Optimized for fixed input overlays
- Uses `PromptUserMessage` and `PromptAssistantMessage` internally

---

### ConversationWithInput

Complete conversation interface with messages display and fixed input at bottom.

**Use this when:** You need the full conversation pattern with input field.

```tsx
import { ConversationWithInput } from '@/features/prompts/components/conversation';

<ConversationWithInput
  messages={displayMessages}
  isStreaming={isTestingPrompt}
  emptyState={<CustomEmptyState />}
  variableDefaults={variableDefaults}
  onVariableValueChange={handleVariableValueChange}
  chatInput={chatInput}
  onChatInputChange={setChatInput}
  onSendMessage={handleSendMessage}
  showVariables={shouldShowVariables}
  templateMessages={conversationTemplate}
  resources={resources}
  onResourcesChange={setResources}
  enablePasteImages={true}
  hideInput={false}
/>
```

**Props:**
- All props from `ConversationDisplay`
- Plus input-related props:
  - `variableDefaults`: Variable configurations
  - `onVariableValueChange`: Variable change handler
  - `expandedVariable`: Currently expanded variable
  - `onExpandedVariableChange`: Expanded variable change handler
  - `chatInput`: Input value
  - `onChatInputChange`: Input change handler
  - `onSendMessage`: Send message handler
  - `showVariables`: Whether to show variables
  - `templateMessages`: Template messages for the prompt
  - `resources`: Attached resources
  - `onResourcesChange`: Resources change handler
  - `enablePasteImages`: Enable paste images functionality
  - `hideInput`: Hide the input field (e.g., for auto-run one-shot mode)

**Layout:**
- **Back layer**: Scrollable messages area
- **Front layer**: Fixed input at bottom with backdrop

---

## Layout Variants

### Overlay Variant (Default)
Uses absolute positioning for containers with fixed overlays (like input at bottom).

```tsx
<div className="relative h-full">
  <ConversationDisplay
    messages={messages}
    variant="overlay"
    bottomPadding="240px"
  />
</div>
```

### Inline Variant
Uses regular flow for inline layouts (like toggled input sections).

```tsx
<div className="max-h-[70vh]">
  <ConversationDisplay
    messages={messages}
    variant="inline"
  />
</div>
```

## Usage Examples

### Simple Messages Display

```tsx
<ConversationDisplay
  messages={messages}
  isStreaming={false}
/>
```

### Full Conversation with Input

```tsx
<ConversationWithInput
  messages={messages}
  isStreaming={isStreaming}
  chatInput={input}
  onChatInputChange={setInput}
  onSendMessage={handleSend}
/>
```

### Custom Empty State

```tsx
<ConversationWithInput
  messages={messages}
  emptyState={
    <div className="text-center">
      <p>Start your conversation</p>
    </div>
  }
  // ... other props
/>
```

---

## Architecture

These components extract the core conversation UI pattern from `PromptRunner`:

1. **ConversationDisplay** = Messages only
2. **ConversationWithInput** = Messages + Input

Both components:
- Handle auto-scrolling intelligently
- Support streaming responses
- Work with fixed overlays (input at bottom)
- Use existing message components (`PromptUserMessage`, `PromptAssistantMessage`)

---

## Integration

Currently used in:
- `features/prompts/components/modal/PromptRunner.tsx` (modal version - overlay variant)
- `features/prompts/components/modal/PromptCompactModal.tsx` (compact modal - inline variant)

Can be integrated into:
- `features/prompts/components/PromptRunner.tsx` (page version - different layout)
- Any other component needing conversation display
- Custom chat interfaces
- AI assistant UIs

---

## Message Format

```typescript
interface ConversationMessage {
  role: string;          // "user" or "assistant"
  content: string;       // Message content
  taskId?: string;       // Optional task ID
  metadata?: {           // Optional metadata
    timeToFirstToken?: number;
    totalTime?: number;
    tokens?: number;
  };
}
```

---

## Notes

- The components use absolute positioning with padding to accommodate fixed input
- Auto-scrolling is smart: only scrolls during streaming if user is near bottom
- Empty state is customizable for different contexts
- All styling respects the app's design system (Tailwind, dark mode, etc.)

