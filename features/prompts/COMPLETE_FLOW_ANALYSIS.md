# Complete Prompt Runner Flow Analysis

## Step-by-Step Prop Tracing from Page → Sidebar → Modal

### ✅ STEP 1: Server Page → Full Page PromptRunner
**File:** `app/(authenticated)/ai/prompts/run/[id]/page.tsx`

**Data Flow:**
```typescript
// Server fetches from Supabase
const prompt = { id, name, messages, variable_defaults, settings }

// Prepares data structure
const promptData = {
    id: prompt.id,
    name: prompt.name,
    messages: prompt.messages,
    variableDefaults: prompt.variable_defaults || [],
    settings: prompt.settings || {},
}

// Passes to component
<PromptRunner models={aiModels} promptData={promptData} />
```

**Props Passed:**
- ✅ `models: any[]` - AI models array
- ✅ `promptData: { id, name, messages, variableDefaults, settings }`

**Status:** ✅ All data properly structured and passed

---

### ✅ STEP 2: Full Page PromptRunner → PromptRunnerModalSidebarTester
**File:** `features/prompts/components/PromptRunner.tsx` (Lines 686-694)

**Data Flow:**
```typescript
// Inside AdaptiveLayout leftPanel footer
<PromptRunnerModalSidebarTester 
    promptData={{
        id: promptData.id,
        name: promptData.name,
        messages: templateMessages,        // From promptData.messages
        variableDefaults: variableDefaults, // State (initialized from promptData)
        settings: settings,                // From promptData.settings
    }}
/>
```

**Props Passed:**
- ✅ `promptData.id` - Prompt UUID
- ✅ `promptData.name` - Prompt name
- ✅ `promptData.messages` - Array of PromptMessage (system/user/assistant)
- ✅ `promptData.variableDefaults` - **LIVE STATE** (current variable values, not initial)
- ✅ `promptData.settings` - Model settings (model_id, temperature, etc.)

**Status:** ✅ All props properly passed, including live variable state

---

### ✅ STEP 3: PromptRunnerModalSidebarTester → Local State/Config
**File:** `features/prompts/components/modal/PromptRunnerModalSidebarTester.tsx`

**Props Received:**
```typescript
interface PromptRunnerModalSidebarTesterProps {
    promptData: PromptData; // ✅ Receives full prompt data
}
```

**Internal Processing:**
```typescript
// Line 29-35: Generates test variables from promptData
const getTestVariables = () => {
    const vars: Record<string, string> = {};
    promptData.variableDefaults?.forEach(v => {
        vars[v.name] = v.defaultValue || 'Test value';
    });
    return vars;
};

// Line 37-49: Constructs modal config with executionConfig
const openModalWithConfig = (executionConfig: Omit<NewExecutionConfig, 'result_display'>) => {
    const config: PromptRunnerModalConfig = {
        promptData: promptData,           // ✅ Full prompt data
        executionConfig: executionConfig, // ✅ New execution config
    };
    
    // Add test variables if apply_variables is true
    if (executionConfig.apply_variables) {
        config.variables = getTestVariables(); // ✅ Dynamically generated
    }
    
    promptModal.open(config); // ✅ Opens with complete config
};
```

**Test Configs Available (Lines 52-89):**
1. **Auto + Chat**: `{ auto_run: true, allow_chat: true, show_variables: false, apply_variables: true }`
2. **Auto One-Shot**: `{ auto_run: true, allow_chat: false, show_variables: false, apply_variables: true }`
3. **Manual + Hidden**: `{ auto_run: false, allow_chat: true, show_variables: false, apply_variables: true }`
4. **Manual + Visible**: `{ auto_run: false, allow_chat: true, show_variables: true, apply_variables: true }`
5. **Manual (No Vars)**: `{ auto_run: false, allow_chat: true, show_variables: false, apply_variables: false }`
6. **Chat Only**: `{ auto_run: false, allow_chat: true, show_variables: true, apply_variables: false }`

**Status:** ✅ All execution configs properly use new system

---

### ✅ STEP 4: PromptRunnerModalSidebarTester → usePromptRunnerModal Hook
**File:** `features/prompts/hooks/usePromptRunnerModal.ts`

**Hook State Management:**
```typescript
const promptModal = usePromptRunnerModal();
// Returns: { isOpen, open, close, config }

// Line 49-52: open() function stores config
const open = useCallback((modalConfig: PromptRunnerModalConfig) => {
    setConfig(modalConfig);  // ✅ Stores complete config
    setIsOpen(true);
}, []);
```

**Config Structure:**
```typescript
PromptRunnerModalConfig {
    promptData: PromptData,              // ✅ Full prompt data
    executionConfig: NewExecutionConfig, // ✅ Execution flags
    variables?: Record<string, string>,  // ✅ Variable values
}
```

**Status:** ✅ Hook properly stores and exposes full config

---

### ✅ STEP 5: usePromptRunnerModal → PromptRunnerModal
**File:** `features/prompts/components/modal/PromptRunnerModalSidebarTester.tsx` (Lines 133-139)

**Modal Rendering:**
```typescript
{promptModal.config && (
    <PromptRunnerModal
        isOpen={promptModal.isOpen}
        onClose={promptModal.close}
        {...promptModal.config}  // ✅ Spreads all config props
    />
)}
```

**Props Spread Result:**
- ✅ `isOpen: boolean`
- ✅ `onClose: () => void`
- ✅ `promptData: PromptData`
- ✅ `executionConfig: NewExecutionConfig`
- ✅ `variables?: Record<string, string>`

**Status:** ✅ All props properly passed via spread operator

---

### ✅ STEP 6: PromptRunnerModal → Modal PromptRunner
**File:** `features/prompts/components/modal/PromptRunnerModal.tsx` (Lines 39-50)

**Props Interface:**
```typescript
function PromptRunnerModal({
    isOpen,
    onClose,
    promptId,
    promptData,
    executionConfig,      // ✅ Receives executionConfig
    mode = 'manual',      // ✅ Legacy fallback
    variables,
    initialMessage,
    onExecutionComplete,
    title,
    runId,
}: PromptRunnerModalProps)
```

**Props Passed to PromptRunner:**
```typescript
<PromptRunner
    promptId={promptId}
    promptData={promptData}
    executionConfig={executionConfig}  // ✅ PASSED
    mode={mode}                        // ✅ PASSED (legacy)
    variables={variables}
    initialMessage={initialMessage}
    onExecutionComplete={onExecutionComplete}
    title={title}
    runId={runId}
    onClose={onClose}
    isActive={isOpen}
/>
```

**Status:** ✅ All props correctly forwarded to core PromptRunner

---

### ✅ STEP 7: Modal PromptRunner - Config Resolution
**File:** `features/prompts/components/modal/PromptRunner.tsx` (Lines 88-94)

**Props Interface:**
```typescript
interface PromptRunnerProps {
    promptId?: string;
    promptData?: PromptData | null;
    
    /** NEW: Execution configuration (preferred) */
    executionConfig?: Omit<NewExecutionConfig, 'result_display'>;
    
    /** @deprecated Use executionConfig instead */
    mode?: PromptExecutionMode;
    
    variables?: Record<string, string>;
    initialMessage?: string;
    onExecutionComplete?: (result) => void;
    title?: string;
    runId?: string;
    onClose?: () => void;
    className?: string;
    isActive?: boolean;
}
```

**Config Resolution (Lines 89-94):**
```typescript
// Resolve execution configuration (supports both new and legacy formats)
const resolvedConfig = useMemo(() => {
    return resolveExecutionConfig(executionConfig, mode);
}, [executionConfig, mode]);

// Extract execution flags for easy access
const { 
    auto_run: autoRun, 
    allow_chat: allowChat, 
    show_variables: showVariables, 
    apply_variables: applyVariables 
} = resolvedConfig;
```

**Resolution Logic (from `types/modal.ts`):**
```typescript
export function resolveExecutionConfig(
    config?: Omit<NewExecutionConfig, 'result_display'>,
    legacyMode?: LegacyPromptExecutionMode
): Omit<NewExecutionConfig, 'result_display'> {
    // Prefer new config
    if (config) {
        return config;
    }
    
    // Fall back to legacy mode conversion
    if (legacyMode) {
        const fullConfig = convertLegacyModeToConfig(legacyMode);
        const { result_display, ...configWithoutDisplay } = fullConfig;
        return configWithoutDisplay;
    }
    
    // Default: manual mode
    return {
        auto_run: false,
        allow_chat: true,
        show_variables: false,
        apply_variables: false,
    };
}
```

**Status:** ✅ Config properly resolved with new system priority

---

### ✅ STEP 8: Modal PromptRunner - Config Usage
**File:** `features/prompts/components/modal/PromptRunner.tsx`

**Critical Usage Points:**

#### 8.1: Variable Application (Lines 155-169)
```typescript
useEffect(() => {
    if (promptData && isActive) {
        const defaults: PromptVariable[] = promptData.variableDefaults?.map(v => ({
            ...v,
            defaultValue: applyVariables && initialVariables?.[v.name] 
                ? initialVariables[v.name]  // ✅ Apply if applyVariables = true
                : v.defaultValue             // ✅ Use defaults if false
        })) || [];
        
        setVariableDefaults(defaults);
    }
}, [promptData, initialVariables, applyVariables, isActive]);
```
**Status:** ✅ `applyVariables` flag properly controls variable application

#### 8.2: Variable Display Control (Line 775)
```typescript
showVariables={showVariables && !conversationStarted}
```
**Status:** ✅ `showVariables` flag properly controls visibility

#### 8.3: Auto-Execution (Lines 215-249)
```typescript
useEffect(() => {
    if (autoRun && !hasAutoExecuted && isActive && promptData && !isLoadingPrompt) {
        // Auto-execute first message
        setHasAutoExecuted(true);
        handleSendTestMessage();
    }
}, [autoRun, hasAutoExecuted, isActive, promptData, isLoadingPrompt]);
```
**Status:** ✅ `autoRun` flag triggers automatic execution

#### 8.4: Chat Input Visibility (Lines 738-753)
```typescript
{allowChat ? (
    <PromptRunnerInput
        // ... input fields
    />
) : (
    <div className="text-center text-muted-foreground py-4">
        Execution complete. Chat disabled in one-shot mode.
    </div>
)}
```
**Status:** ✅ `allowChat` flag controls post-execution chat

#### 8.5: Message Display Logic (Lines 418-438)
```typescript
const handleSendTestMessage = async () => {
    const isFirstMessage = apiConversationHistory.length === 0;
    
    if (isFirstMessage) {
        // Use template messages
        if (!applyVariables) {
            // Manual mode - show raw template
            displayUserMessage = chatInput;
        } else {
            // Apply variables to template
            displayUserMessage = replaceVariablesInText(
                userMessageContent, 
                variableDefaults
            );
        }
    }
    // ...
}
```
**Status:** ✅ `applyVariables` controls variable replacement

---

## 🎯 COMPLETE FLOW VERIFICATION

### Data Integrity Checkpoints

| Stage | Component | Props In | Props Out | Status |
|-------|-----------|----------|-----------|--------|
| 1 | Server Page | Supabase data | `promptData`, `models` | ✅ |
| 2 | Full Page Runner | `promptData` | `promptData` (live vars) | ✅ |
| 3 | Sidebar Tester | `promptData` | `PromptRunnerModalConfig` | ✅ |
| 4 | usePromptRunnerModal | `config` | `config`, `isOpen` | ✅ |
| 5 | PromptRunnerModal Render | `{...config}` | All spread props | ✅ |
| 6 | PromptRunnerModal | All props | `executionConfig`, `promptData` | ✅ |
| 7 | Modal PromptRunner | `executionConfig` | `resolvedConfig` | ✅ |
| 8 | Config Resolution | `executionConfig`/`mode` | `{ autoRun, allowChat, showVariables, applyVariables }` | ✅ |
| 9 | Execution Logic | Flags | Behavior control | ✅ |

### Execution Config Usage Verification

| Flag | Purpose | Used In | Status |
|------|---------|---------|--------|
| `auto_run` | Auto-execute on mount | `useEffect` trigger (Line 215) | ✅ |
| `allow_chat` | Enable post-execution chat | Input visibility (Line 738) | ✅ |
| `show_variables` | Display variable editor | `PromptRunnerInput` prop (Line 775) | ✅ |
| `apply_variables` | Apply variable values | Variable initialization (Line 155), Message formatting (Line 418) | ✅ |

---

## 🔍 POTENTIAL ISSUES IDENTIFIED

### ⚠️ Issue 1: Live Variable State May Not Reflect in Modal
**Location:** Step 2 (PromptRunner.tsx → PromptRunnerModalSidebarTester)

**Problem:**
```typescript
// Line 686-694 in features/prompts/components/PromptRunner.tsx
<PromptRunnerModalSidebarTester 
    promptData={{
        variableDefaults: variableDefaults, // ✅ LIVE state
    }}
/>
```

The full page PromptRunner passes **live state** `variableDefaults`, but the sidebar tester:
1. Creates fresh test variables via `getTestVariables()` (Line 29-35)
2. OR uses `promptData.variableDefaults` from props

**Impact:** If user modifies variables in the full page runner, those values ARE passed to the modal tester, but the tester OVERRIDES them with either:
- Test values from `getTestVariables()` if `apply_variables: true`
- Original defaults from `promptData.variableDefaults`

**Status:** ⚠️ PARTIAL - Variables passed but potentially overridden

---

### ⚠️ Issue 2: Default Mode Parameter Still Present
**Location:** Step 6 & 7 (PromptRunnerModal & Modal PromptRunner)

**Problem:**
```typescript
// PromptRunnerModal.tsx Line 27
mode = 'manual',  // ⚠️ Still has default

// PromptRunner.tsx Line 74
mode = 'manual',  // ⚠️ Still has default
```

**Impact:** If no `executionConfig` is passed, falls back to legacy `mode`, which then gets converted. This works but maintains legacy system dependency.

**Recommendation:** Remove defaults once all call sites use `executionConfig`

**Status:** ⚠️ FUNCTIONAL BUT LEGACY

---

### ✅ Issue 3: RESOLVED - Redux Flow
**Previous Concern:** Redux might not pass executionConfig

**Verification:**
- OverlayController passes `executionConfig={promptModalConfig.executionConfig}` ✅
- PromptRunnerModal receives and forwards it ✅
- Modal PromptRunner resolves it properly ✅

**Status:** ✅ FULLY RESOLVED

---

## 📊 SUMMARY

### ✅ What's Working Perfectly
1. **New execution config system** - All flags properly defined and used
2. **Config resolution** - Seamless handling of new/legacy formats
3. **Prop passing** - All props correctly forwarded through chain
4. **Flag usage** - All 4 flags control their respective behaviors
5. **Redux integration** - Full executionConfig support end-to-end
6. **Backwards compatibility** - Legacy mode still works during transition

### ⚠️ Minor Issues
1. **Variable state sync** - Modal tester may override live variable values
2. **Legacy defaults** - `mode = 'manual'` still present in function signatures

### 🎯 Next Steps
1. ✅ Current flow is **fully functional** with new system
2. ⚠️ Consider removing `mode` defaults after verifying no call sites rely on them
3. ⚠️ Consider whether modal tester should preserve or override variable state

