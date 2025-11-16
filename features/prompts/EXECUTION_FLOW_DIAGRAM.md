# Prompt Execution Flow - Visual Diagram

## 🔄 Complete End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ SERVER: app/(authenticated)/ai/prompts/run/[id]/page.tsx           │
│                                                                      │
│  1. Fetch prompt from Supabase                                      │
│     const { data: prompt } = await supabase                         │
│       .from("prompts").select("*").eq("id", id)                     │
│                                                                      │
│  2. Structure data                                                  │
│     const promptData = {                                            │
│       id: prompt.id,                                                │
│       name: prompt.name,                                            │
│       messages: prompt.messages,                                    │
│       variableDefaults: prompt.variable_defaults || [],             │
│       settings: prompt.settings || {}                               │
│     }                                                                │
│                                                                      │
│  3. Fetch AI models                                                 │
│     const aiModels = await fetchAIModels()                          │
│                                                                      │
│  4. Render client component                                         │
│     <PromptRunner                                                   │
│       models={aiModels}                                             │
│       promptData={promptData}                                       │
│     />                                                              │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CLIENT: features/prompts/components/PromptRunner.tsx                │
│                                                                      │
│  Full-page prompt runner component                                  │
│                                                                      │
│  Props Received:                                                    │
│    ✅ models: any[]                                                 │
│    ✅ promptData: { id, name, messages, variableDefaults, settings }│
│                                                                      │
│  Internal State:                                                    │
│    - variableDefaults (live state, initialized from props)          │
│    - conversationMessages                                           │
│    - currentRun                                                     │
│                                                                      │
│  Layout Structure:                                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ AdaptiveLayout                                               │  │
│  │                                                              │  │
│  │  Left Panel: PromptRunsSidebar                              │  │
│  │    - Lists all runs for this prompt                         │  │
│  │    - Allows switching between runs                          │  │
│  │    - Footer: PromptRunnerModalSidebarTester ◄────────────┐  │  │
│  │                                                           │  │  │
│  │  Right Panel: Chat Interface                             │  │  │
│  │    - Message display                                      │  │  │
│  │    - PromptRunnerInput                                    │  │  │
│  │    - Streaming responses                                  │  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────│──────────────┘
                                                       │
                                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SIDEBAR TESTER:                                                     │
│ features/prompts/components/modal/PromptRunnerModalSidebarTester.tsx│
│                                                                      │
│  Props Received:                                                    │
│    ✅ promptData: {                                                 │
│         id: promptData.id,                                          │
│         name: promptData.name,                                      │
│         messages: templateMessages,                                 │
│         variableDefaults: variableDefaults, // LIVE STATE           │
│         settings: settings                                          │
│       }                                                              │
│                                                                      │
│  Test Configurations (6 buttons):                                   │
│    1. Auto + Chat                                                   │
│       { auto_run: ✅, allow_chat: ✅, show_variables: ❌, apply: ✅ }│
│    2. Auto One-Shot                                                 │
│       { auto_run: ✅, allow_chat: ❌, show_variables: ❌, apply: ✅ }│
│    3. Manual + Hidden                                               │
│       { auto_run: ❌, allow_chat: ✅, show_variables: ❌, apply: ✅ }│
│    4. Manual + Visible                                              │
│       { auto_run: ❌, allow_chat: ✅, show_variables: ✅, apply: ✅ }│
│    5. Manual (No Vars)                                              │
│       { auto_run: ❌, allow_chat: ✅, show_variables: ❌, apply: ❌ }│
│    6. Chat Only                                                     │
│       { auto_run: ❌, allow_chat: ✅, show_variables: ✅, apply: ❌ }│
│                                                                      │
│  On Button Click:                                                   │
│    1. Construct PromptRunnerModalConfig                             │
│    2. Add test variables if apply_variables = true                  │
│    3. Call promptModal.open(config)                                 │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ HOOK: features/prompts/hooks/usePromptRunnerModal.ts               │
│                                                                      │
│  State Management:                                                  │
│    const [isOpen, setIsOpen] = useState(false)                      │
│    const [config, setConfig] = useState<PromptRunnerModalConfig>()  │
│                                                                      │
│  Functions:                                                         │
│    open(modalConfig) => {                                           │
│      setConfig(modalConfig)  // Store complete config               │
│      setIsOpen(true)          // Trigger modal                      │
│    }                                                                 │
│                                                                      │
│  Returns:                                                           │
│    { isOpen, open, close, config }                                  │
│                                                                      │
│  Config Structure Stored:                                           │
│    ✅ promptData: PromptData                                        │
│    ✅ executionConfig: { auto_run, allow_chat, show_variables,      │
│                          apply_variables }                          │
│    ✅ variables?: Record<string, string>                            │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ MODAL WRAPPER:                                                      │
│ features/prompts/components/modal/PromptRunnerModal.tsx             │
│                                                                      │
│  JSX in Sidebar Tester:                                             │
│    {promptModal.config && (                                         │
│      <PromptRunnerModal                                             │
│        isOpen={promptModal.isOpen}                                  │
│        onClose={promptModal.close}                                  │
│        {...promptModal.config}  ◄── Spreads all props               │
│      />                                                             │
│    )}                                                                │
│                                                                      │
│  Props Received (via spread):                                       │
│    ✅ isOpen: boolean                                               │
│    ✅ onClose: () => void                                           │
│    ✅ promptData: PromptData                                        │
│    ✅ executionConfig: NewExecutionConfig                           │
│    ✅ variables: Record<string, string>                             │
│                                                                      │
│  Renders:                                                           │
│    <Dialog open={isOpen} onOpenChange={onClose}>                    │
│      <DialogContent className="max-w-[95vw] h-[95vh]">             │
│        <PromptRunner                                                │
│          promptData={promptData}                                    │
│          executionConfig={executionConfig} ◄── PASSED               │
│          variables={variables}                                      │
│          onClose={onClose}                                          │
│          isActive={isOpen}                                          │
│        />                                                           │
│      </DialogContent>                                               │
│    </Dialog>                                                        │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CORE COMPONENT:                                                     │
│ features/prompts/components/modal/PromptRunner.tsx                  │
│                                                                      │
│  Props Received:                                                    │
│    ✅ promptData?: PromptData                                       │
│    ✅ executionConfig?: Omit<NewExecutionConfig, 'result_display'>  │
│    ⚠️  mode?: PromptExecutionMode (deprecated, fallback)            │
│    ✅ variables?: Record<string, string>                            │
│    ✅ onClose?: () => void                                          │
│                                                                      │
│  Step 1: Config Resolution                                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ const resolvedConfig = useMemo(() => {                     │    │
│  │   return resolveExecutionConfig(executionConfig, mode)     │    │
│  │ }, [executionConfig, mode])                                │    │
│  │                                                            │    │
│  │ Priority:                                                  │    │
│  │   1️⃣  executionConfig (if provided) ◄── NEW SYSTEM        │    │
│  │   2️⃣  mode (if provided) ◄── Legacy, converted            │    │
│  │   3️⃣  Default: manual mode                                │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Step 2: Extract Flags                                              │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ const {                                                    │    │
│  │   auto_run: autoRun,           // ✅ Auto-execute          │    │
│  │   allow_chat: allowChat,       // ✅ Enable chat           │    │
│  │   show_variables: showVariables, // ✅ Show editor         │    │
│  │   apply_variables: applyVariables // ✅ Apply values       │    │
│  │ } = resolvedConfig                                         │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Step 3: Use Flags in Logic                                         │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ✅ autoRun → useEffect triggers automatic execution        │    │
│  │    (Line 215-249)                                          │    │
│  │                                                            │    │
│  │ ✅ allowChat → Controls input visibility after execution   │    │
│  │    (Line 738-753)                                          │    │
│  │                                                            │    │
│  │ ✅ showVariables → Passed to PromptRunnerInput             │    │
│  │    (Line 775)                                              │    │
│  │                                                            │    │
│  │ ✅ applyVariables → Controls variable initialization       │    │
│  │    and message formatting (Lines 155, 418)                │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Step 4: Execute Prompt                                             │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ - Build messages with/without variable replacement        │    │
│  │ - Create AI run in database                               │    │
│  │ - Submit task via Redux socket.io                         │    │
│  │ - Stream response                                          │    │
│  │ - Save results to AI run                                  │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔀 Alternative Flows

### Via Redux (Context Menus, Cards, etc.)

```
Component calls openPrompt()
    ↓
Redux Thunk: openPromptThunk
    ↓
dispatches openPromptModal(config)
    ↓
promptRunnerSlice stores config
    ↓
OverlayController reads Redux state
    ↓
Renders PromptRunnerModal
    ↓
  executionConfig={promptModalConfig.executionConfig} ✅
    ↓
[Same flow as above from Modal wrapper]
```

### Direct Component Usage

```
Component imports PromptRunnerModal
    ↓
Local state management (usePromptRunnerModal)
    ↓
Renders <PromptRunnerModal executionConfig={...} />
    ↓
[Same flow as above from Modal wrapper]
```

---

## 🎯 Key Verification Points

### ✅ Data Never Lost
- Prompt data flows from server → page → sidebar → modal ✅
- Variable state is live and synchronized ✅
- Execution config is preserved at every step ✅

### ✅ Config Always Respected
- `auto_run` triggers automatic execution ✅
- `allow_chat` controls input visibility ✅
- `show_variables` controls editor display ✅
- `apply_variables` controls value application ✅

### ✅ No Legacy Bypasses
- All execution goes through flag checks ✅
- No hardcoded mode strings in active logic ✅
- Legacy mode only exists as fallback ✅

---

## 📊 Execution Config Examples

### Example 1: Auto-Execute with Chat
```typescript
{
  auto_run: true,        // Execute immediately ✅
  allow_chat: true,      // Enable follow-up messages ✅
  show_variables: false, // Hide variable editor ✅
  apply_variables: true  // Use provided values ✅
}

Behavior:
1. Modal opens
2. Immediately executes with provided variable values
3. Shows response
4. Allows user to continue conversation
```

### Example 2: Manual Entry (No Variables)
```typescript
{
  auto_run: false,       // Wait for user ✅
  allow_chat: true,      // Enable chat ✅
  show_variables: false, // Hide editor ✅
  apply_variables: false // Manual entry ✅
}

Behavior:
1. Modal opens with empty input
2. User types message (no variables replaced)
3. Executes when user sends
4. Allows conversation
```

### Example 3: Variable Editor Mode
```typescript
{
  auto_run: false,       // Wait for user ✅
  allow_chat: true,      // Enable chat ✅
  show_variables: true,  // Show editor ✅
  apply_variables: true  // Use values ✅
}

Behavior:
1. Modal opens showing variable editor
2. User can edit variable values
3. User sends when ready
4. Variables replaced in message
5. Allows conversation
```

---

## 🎉 Summary

The execution config flows through **9 distinct stages** without data loss:

1. Server fetch
2. Full page component
3. Sidebar tester
4. Hook state
5. Modal spread
6. Modal wrapper
7. Core component
8. Config resolution
9. Execution logic

At every stage, props are properly passed, typed, and respected. The new `executionConfig` system completely replaces the legacy `mode` enum while maintaining backwards compatibility.

