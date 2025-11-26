# Debug Components

Complete debugging tools for the AI Matrx Admin system.

## Components

### 1. PromptExecutionDebugPanel

**Purpose:** Complete visibility into Redux prompt execution state.

**Shows:**
- Current mode (Mode 1 vs Mode 2)
- Template messages
- Conversation history
- Current state (input, resources, variables)
- **EXACT API payload** that will be sent to the LLM
- Model configuration

**How to Use:**
1. Enable debug mode (Cmd/Ctrl + Shift + D)
2. Click "Debug State" button above the input
3. Panel appears on the right side
4. Expand sections to see details
5. Copy any section to clipboard

**Sections:**
- **Overview:** Quick stats about current state
- **Template Messages:** Initial prompt template (Mode 1 only)
- **Conversation History:** Actual messages exchanged (Mode 2)
- **Current State Details:** Input, variables, resources, UI state
- **API Payload:** EXACTLY what the LLM will see

**Key Features:**
- ✅ Reads directly from Redux (same selectors as execution)
- ✅ Shows what LLM actually receives
- ✅ Copy any section to clipboard
- ✅ Clear mode indication (Mode 1 vs Mode 2)
- ✅ Expandable sections for clean UI

---

### 2. ResourceDebugIndicator

**Purpose:** Preview message with resources before sending.

**Shows:**
- Resources attached to current message
- Formatted XML of resources
- Complete message preview (template + input + resources + variables)

**How to Use:**
1. Attach resources to message
2. Small green indicator appears automatically
3. Click to expand and see resource list
4. Click "Preview Message" to see complete message

---

### 3. DebugIndicator

**Purpose:** General debug data display (floating indicator).

**Shows:**
- Custom debug data passed to it
- JSON formatting
- Draggable positioning

---

### 4. DebugIndicatorManager

**Purpose:** Central manager for all debug indicators.

**Manages:**
- PromptExecutionDebugPanel
- ResourceDebugIndicator
- DebugIndicator (general)

**Architecture:**
- Only renders when debug mode is enabled
- Each indicator reads state from Redux
- No prop drilling - only runId needed

---

## Usage Examples

### Opening Execution State Debug

```typescript
import { showExecutionStateDebug } from '@/lib/redux/slices/adminDebugSlice';

// In your component:
dispatch(showExecutionStateDebug({ runId }));
```

### Opening Resource Debug

```typescript
import { showResourceDebugIndicator } from '@/lib/redux/slices/adminDebugSlice';

// Automatically shown when resources exist in debug mode
// Or manually:
dispatch(showResourceDebugIndicator({ runId }));
```

---

## Architecture

### Redux-Driven Debug

All debug components read directly from Redux:

```typescript
// Inside debug component:
const instance = useAppSelector(state => selectInstance(state, runId));
const messages = useAppSelector(state => selectMessages(state, runId));
const variables = useAppSelector(state => selectMergedVariables(state, runId));
// ... etc
```

**Benefits:**
- ✅ Always shows current Redux state
- ✅ Uses same selectors as execution engine
- ✅ Cannot show wrong data
- ✅ Works with any component

### Single Source of Truth

Debug components and execution engine read from the **same Redux selectors**:

```typescript
// executeMessageThunk.ts:
const variables = selectMergedVariables(state, runId);
const messages = selectMessages(state, runId);

// PromptExecutionDebugPanel.tsx:
const variables = useAppSelector(state => selectMergedVariables(state, runId));
const messages = useAppSelector(state => selectMessages(state, runId));
```

**Guarantee:** What you see in debug is EXACTLY what will be executed.

---

## Debugging Workflow

### Mode 1 (Templated First Message)

1. Open execution state debug
2. Check "Template Messages" section
3. Verify variables are defined
4. Check "Current State Details" for input and resources
5. Check "API Payload" to see final message structure
6. **Verify:** Template + Input + Resources will be combined

### Mode 2 (Ongoing Conversation)

1. Open execution state debug
2. Check "Conversation History" section
3. Verify all previous messages are there
4. Check "Current State Details" for new input and resources
5. Check "API Payload" to see complete conversation
6. **Verify:** All history + new message will be sent

### Common Issues

**Variables not replaced:**
- Check "Current State Details" → Variables section
- Verify variable names match template `{{variable_name}}`
- Check if variables are in merged variables object

**Resources not showing:**
- Check "Current State Details" → Resources section
- Verify resources are in Redux state
- Check ResourceDebugIndicator for XML preview

**Wrong messages sent:**
- Check "API Payload" section
- Compare with "Template Messages" or "Conversation History"
- Verify mode is correct (Mode 1 vs Mode 2)

---

## Files

- `PromptExecutionDebugPanel.tsx` - Complete state visibility
- `ResourceDebugIndicator.tsx` - Resource preview
- `DebugIndicator.tsx` - General debug display
- `DebugIndicatorManager.tsx` - Central manager
- `index.ts` - Exports

---

## Related Documentation

- `/MODE_TRANSITION_ARCHITECTURE.md` - Mode 1 vs Mode 2 explanation
- `/ANALYSIS_AND_FIXES.md` - Bug fixes and architecture
- `/lib/redux/prompt-execution/` - Redux state management

