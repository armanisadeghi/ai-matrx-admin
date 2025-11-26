# Mode Transition Architecture

## Overview

The prompt execution system operates in two distinct modes:

1. **Mode 1: Templated First Message** - Uses a prompt template with variables
2. **Mode 2: Ongoing Conversation** - Standard chat with conversation history

This document explains how the system transitions between these modes and maintains proper state.

---

## Mode 1: Templated First Message

### When It Applies
- `isFirstMessage === true` (no messages in conversation yet)
- `isLastTemplateMessageUser === true` (prompt template ends with user message)

### What Happens

**UI State:**
- ✅ Variables UI is **visible** (if `show_variables` is enabled)
- ✅ User can fill in variable values
- ✅ User can add "additional information" in the input field
- ✅ Resources can be attached

**Message Construction:**
```
Template:    "Analyze {{topic}} and provide insights."
Variables:   { topic: "machine learning" }
User Input:  "Focus on neural networks."
Resources:   [note, file, etc.]

Final Message Sent to Model:
├─ Analyze machine learning and provide insights.
├─ 
├─ Focus on neural networks.
├─
└─ <attached_resources>
   ├─ <resource type="note">...</resource>
   └─ <resource type="file">...</resource>
   </attached_resources>
```

**After Sending:**
1. ✅ Message added to `instance.messages[]` (conversation history)
2. ✅ Input field cleared (`clearCurrentInput`)
3. ✅ Resources cleared (`clearResources`) - they're per-message, not per-conversation
4. ✅ Variables UI hidden (`setShowVariables({ show: false })`) - no longer relevant
5. ✅ Run saved to database (if `track_in_runs: true`)

---

## Mode 2: Ongoing Conversation

### When It Applies
- `isFirstMessage === false` (messages exist in conversation)

### What Happens

**UI State:**
- ❌ Variables UI is **hidden** (no longer relevant)
- ✅ User types normal messages in the input field
- ✅ Resources can be attached to each message

**Message Construction:**
```
User Input:  "Can you explain the attention mechanism?"
Resources:   [pdf file]

Final Message Sent to Model:
├─ Can you explain the attention mechanism?
├─
└─ <attached_resources>
   └─ <resource type="file">...</resource>
   </attached_resources>
```

**After Sending:**
1. ✅ Message added to `instance.messages[]` (appended to conversation)
2. ✅ Input field cleared
3. ✅ Resources cleared (they're per-message)
4. ⏭️ Variables already hidden (happened after first message)

**API Payload:**
```
Messages Sent to API:
[
  { role: "system", content: "System message with variables replaced" },
  { role: "user", content: "First message (from Mode 1)" },
  { role: "assistant", content: "Response from first message" },
  { role: "user", content: "Second message (from Mode 2)" },
  { role: "assistant", content: "Response from second message" },
  { role: "user", content: "Current message (new)" }
]
```

---

## Critical State Management

### Resources Are Per-Message, Not Per-Conversation

**Why:**
- Each message can have different attached resources
- Resources are relevant to the specific message being sent
- Keeping them would confuse users ("Why are my old resources still here?")

**Implementation:**
```typescript
// After EVERY message send (both modes):
dispatch(clearResources({ runId }));
```

---

### Variables Are Only for Mode 1

**Why:**
- Variables are part of the initial prompt template
- After the first message, the conversation is dynamic
- Template variables cannot apply to subsequent messages
- Keeping them visible would be confusing

**Implementation:**
```typescript
// After first message is sent:
if (isFirstMessage && isLastMessageUser) {
  dispatch(setShowVariables({ runId, show: false }));
}
```

---

### Conversation History (`instance.messages`)

**This is the key to Mode 2:**

```typescript
// Structure:
instance: {
  messages: [
    { role: 'user', content: '...', timestamp: '...' },
    { role: 'assistant', content: '...', timestamp: '...' },
    // ... more messages as conversation continues
  ]
}
```

**For Mode 2 (isFirstMessage === false):**
```typescript
// We use the COMPLETE conversation history:
messagesToSend = instance.messages.map(m => ({
  role: m.role,
  content: m.content,
}));
```

**Important:** 
- Messages are stored with variables **already replaced**
- No need to re-process variables for stored messages
- Each message contains its resources in the content (XML format)

---

## Message Building Flow

### Mode 1 (First Message)

```typescript
const messageResult = await buildFinalMessage({
  isFirstMessage: true,
  isLastTemplateMessageUser: true,
  lastTemplateMessage: { role: 'user', content: 'Template text with {{vars}}' },
  userInput: 'Additional user input',
  resources: [...],
  variables: { key: 'value' }
});

// Result: template + input + resources + variables replaced
```

**API Payload:**
```typescript
[
  { role: 'system', content: 'System message' },
  // Template messages (if any assistants before last user)
  { role: 'assistant', content: '...' },
  // Our combined message
  { role: 'user', content: 'Template + Input + Resources' }
]
```

---

### Mode 2 (Subsequent Messages)

```typescript
const messageResult = await buildFinalMessage({
  isFirstMessage: false,
  isLastTemplateMessageUser: false,
  lastTemplateMessage: undefined, // Not used in Mode 2
  userInput: 'User message',
  resources: [...],
  variables: { ...mergedVariables } // Still passed but not in template
});

// Result: input + resources (no template)
```

**API Payload:**
```typescript
[
  { role: 'system', content: 'System message' },
  // ALL previous messages from instance.messages
  { role: 'user', content: 'First message' },
  { role: 'assistant', content: 'First response' },
  { role: 'user', content: 'Second message' },
  { role: 'assistant', content: 'Second response' },
  // Current message
  { role: 'user', content: 'New message + Resources' }
]
```

---

## Variable Replacement Strategy

### Mode 1 (First Message)
Variables are replaced in:
- ✅ Template content
- ✅ User input
- ✅ Resources
- ✅ System message

### Mode 2 (Subsequent Messages)
Variables are NOT replaced because:
- Template is not used
- Stored messages already have variables replaced
- System message is replaced once (on first message)

**Exception:** System message is still replaced with current variables on every message (in case scoped variables change).

---

## Debug Component Behavior

The debug component reads from Redux and follows the same mode logic:

**Mode 1:**
- Shows template + input + resources
- Shows variables being replaced
- Preview matches exactly what will be sent

**Mode 2:**
- Shows input + resources (no template)
- No variables in UI (hidden)
- Preview matches exactly what will be sent

**Critical:** Debug uses the SAME selectors as `executeMessageThunk`, so it's guaranteed to show correct information.

---

## State Isolation

### Why Three Separate State Maps?

```typescript
state: {
  instances: {},      // Stable core data (identity, config, messages)
  currentInputs: {},  // Isolated: user typing (high-frequency updates)
  resources: {},      // Isolated: attachments (per-message)
  uiState: {},        // Isolated: UI controls (expandedVariable, showVariables)
}
```

**Benefits:**
1. **Performance:** Typing doesn't re-render resource chips
2. **Clarity:** Clear separation of concerns
3. **Per-Message Resources:** Easy to clear without affecting other state
4. **UI Independence:** showVariables can be toggled without affecting data

---

## Transition Checklist

When transitioning from Mode 1 → Mode 2:

- [x] Add first message to `instance.messages`
- [x] Clear `currentInputs[runId]`
- [x] Clear `resources[runId]`
- [x] Set `uiState[runId].showVariables = false`
- [x] Save run to database (if tracking)
- [x] Future messages use `instance.messages` (not template)

---

## Common Pitfalls (Avoided)

❌ **Don't keep resources after sending**
- Resources are per-message, not per-conversation
- Always clear after send

❌ **Don't show variables after first message**
- They're only for the initial template
- Hide them after Mode 1 → Mode 2 transition

❌ **Don't re-process template in Mode 2**
- Template is only for first message
- Use `instance.messages` for conversation history

❌ **Don't replace variables twice**
- Replace once in `buildFinalMessage`
- Stored messages already have variables replaced

✅ **Do clear state properly**
- Clear input after every send
- Clear resources after every send
- Hide variables after first send (if templated)

---

## Summary

**The architecture properly handles two distinct modes:**

1. **Mode 1:** Template + Variables + Input + Resources → First Message → Transition
2. **Mode 2:** Input + Resources → Append to Conversation → Continue

**Key transition point:** After first message is sent
- Variables hidden
- Resources cleared
- Future messages use conversation history, not template

**This ensures:**
- ✅ Clean UX (no confusion about variables/resources)
- ✅ Proper state isolation
- ✅ Correct message construction for both modes
- ✅ Debug component shows accurate information

