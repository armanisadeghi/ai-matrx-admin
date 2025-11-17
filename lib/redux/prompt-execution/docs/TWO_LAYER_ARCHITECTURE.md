# Two-Layer Architecture: Prompts + Actions

## 🎯 Core Philosophy

**Layer 1: Prompts (Pure)** - The template  
**Layer 2: Actions (Context-Aware)** - The execution wrapper

---

## 📐 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
├─────────────────────────────────────────────────────────────────┤
│  Shortcuts  │  Manual Run  │  API Call  │  Automation  │  ...   │
└──────┬──────────────┬──────────────┬──────────────┬─────────────┘
       │              │              │              │
       │              ▼              ▼              │
       │       ┌──────────────────────────┐        │
       │       │   PROMPT (Pure)          │        │
       │       ├──────────────────────────┤        │
       │       │ • Messages               │        │
       │       │ • Settings               │        │
       │       │ • Variable Definitions   │        │
       │       │ • NO context awareness   │        │
       │       └──────────────────────────┘        │
       │                                             │
       ▼                                             ▼
┌──────────────────────────┐          ┌──────────────────────────┐
│  PROMPT ACTION           │          │  DIRECT EXECUTION        │
├──────────────────────────┤          │  (No Action Wrapper)     │
│ • References Prompt      │          │                          │
│ • Broker Mappings        │          │  User provides all vars  │
│ • Hardcoded Values       │          │  manually                │
│ • Context Scopes         │          └──────────┬───────────────┘
│ • Execution Config       │                     │
└──────────┬───────────────┘                     │
           │                                      │
           ▼                                      │
┌──────────────────────────┐                     │
│  BROKER RESOLUTION       │                     │
├──────────────────────────┤                     │
│ 1. Get Context IDs       │                     │
│ 2. Query Hierarchy       │                     │
│ 3. Return Values         │                     │
└──────────┬───────────────┘                     │
           │                                      │
           ▼                                      │
┌──────────────────────────────────────────────┐ │
│         VARIABLE PRECEDENCE ENGINE            │ │
├───────────────────────────────────────────────┤ │
│  1. Start with Prompt Defaults                │ │
│  2. Override with Broker Values (if resolved) │ │
│  3. Override with Hardcoded (from action)     │ │
│  4. Override with User Input (if provided)    │ │
└──────────────────┬────────────────────────────┘ │
                   │                               │
                   └───────────┬───────────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │   REDUX EXECUTION ENGINE     │
                ├──────────────────────────────┤
                │ • Instance Management        │
                │ • Variable Replacement       │
                │ • Message Building           │
                │ • Streaming Coordination     │
                │ • Run/Task Tracking          │
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │      SOCKET.IO LAYER         │
                ├──────────────────────────────┤
                │ • Send to API                │
                │ • Stream Response            │
                │ • Handle Errors              │
                └──────────────┬───────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │  DATABASE   │
                        ├─────────────┤
                        │ • ai_runs   │
                        │ • ai_tasks  │
                        └─────────────┘
```

---

## 🔑 Key Concepts

### 1. Prompts Are Pure Templates

**What They Contain:**
- Messages (system, assistant, user)
- Model settings (temperature, max_tokens, etc.)
- Variable definitions with defaults
- UI hints (input types, validation)

**What They DON'T Contain:**
- Context awareness (no knowledge of workspace, project, etc.)
- Business logic
- Auto-fetched data

**Example Prompt:**
```json
{
  "name": "Generate Project Brief",
  "messages": [
    {
      "role": "system",
      "content": "You are a project management expert."
    },
    {
      "role": "user",
      "content": "Create a project brief for {{client_name}} with deadline {{deadline}}."
    }
  ],
  "variable_defaults": [
    { "name": "client_name", "default": "Client", "type": "text" },
    { "name": "deadline", "default": "Not specified", "type": "date" }
  ]
}
```

---

### 2. Actions Wrap Prompts with Context

**What They Add:**
- **Broker Mappings**: Connect variable names to broker IDs
- **Hardcoded Values**: Force specific values regardless of context
- **Context Scopes**: Define what context is needed (workspace, project, etc.)
- **Execution Config**: How to run (auto_run, show_variables, etc.)

**Example Action:**
```json
{
  "name": "Generate Project Brief for Current Project",
  "prompt_builtin_id": "prompt-uuid-here",
  "broker_mappings": {
    "client_name": "broker-uuid-company-name",
    "deadline": "broker-uuid-project-deadline"
  },
  "hardcoded_values": {
    "tone": "professional"
  },
  "context_scopes": ["workspace", "project"],
  "execution_config": {
    "auto_run": true,
    "show_variables": false,
    "apply_variables": true
  }
}
```

---

### 3. Variable Resolution Flow

```
┌─────────────────┐
│ Prompt Default  │ ──▶ "Client"
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Broker Value    │ ──▶ "Acme Corp" (overrides default)
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Hardcoded Value │ ──▶ (none for this var)
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ User Input      │ ──▶ "ACME Corporation" (final override)
└─────────────────┘
         │
         ▼
    FINAL VALUE: "ACME Corporation"
```

**Precedence (Highest to Lowest):**
1. **User Input** - Always wins if provided
2. **Hardcoded** - From action definition
3. **Broker** - From context resolution
4. **Default** - From prompt definition

---

## 🔄 Execution Paths

### Path A: Direct Prompt Execution (No Action)

```typescript
// User runs prompt directly from UI
dispatch(startPromptInstance({
  promptId: 'prompt-uuid',
  variables: {
    client_name: 'Manually entered',
    deadline: '2025-12-31'
  }
}));

// Result: Uses provided values + prompt defaults
```

**When to use:**
- Testing prompts
- One-off executions
- When context isn't available/needed
- Manual data entry preferred

---

### Path B: Action Execution (Context-Aware)

```typescript
// User triggers action from shortcut or UI
dispatch(startPromptAction({
  actionId: 'action-uuid',
  context: {
    userId: 'user-uuid',
    workspaceId: 'workspace-uuid',
    projectId: 'project-uuid'
  },
  userProvidedVariables: {
    // Optional overrides
    client_name: 'Override if needed'
  }
}));

// Result: 
// 1. Resolves brokers for context
// 2. Maps broker values to variables
// 3. Applies hardcoded overrides
// 4. Merges user overrides
// 5. Executes with final values
```

**When to use:**
- Shortcuts (context-aware execution)
- Workflow automation
- Reducing manual input
- Consistent business logic

---

## 🎯 Why This Architecture?

### ✅ Benefits

1. **Separation of Concerns**
   - Prompts = reusable templates
   - Actions = business logic wrappers

2. **Flexibility**
   - Same prompt can have multiple actions
   - Different context mappings per action
   - Easy A/B testing

3. **Maintainability**
   - Edit prompt → all actions use new version
   - Edit action → doesn't affect prompt
   - Clear ownership boundaries

4. **User Experience**
   - Auto-fill from context when possible
   - Manual input only when necessary
   - Transparent behavior

5. **No Breaking Changes**
   - Existing prompts work as-is
   - Actions are additive
   - Backward compatible

---

## 🔧 Implementation Details

### Action Execution Flow (Detailed)

```typescript
async function executeAction(actionId, context, userVars) {
  // 1. Load action from cache or database
  const action = await loadAction(actionId);
  
  // 2. Load referenced prompt
  const prompt = await loadPrompt(action.prompt_id);
  
  // 3. Extract broker IDs from action
  const brokerIds = Object.values(action.broker_mappings);
  
  // 4. Resolve brokers for context
  const brokerValues = await resolveBrokersForContext(brokerIds, context);
  
  // 5. Map broker values to variable names
  const resolvedVars = {};
  for (const [varName, brokerId] of Object.entries(action.broker_mappings)) {
    if (brokerValues[brokerId]) {
      resolvedVars[varName] = brokerValues[brokerId];
    }
  }
  
  // 6. Build final variables with precedence
  const finalVars = {
    // Start with prompt defaults (lowest priority)
    ...getPromptDefaults(prompt),
    
    // Override with broker values
    ...resolvedVars,
    
    // Override with hardcoded values
    ...action.hardcoded_values,
    
    // Override with user input (highest priority)
    ...userVars
  };
  
  // 7. Execute via standard engine
  return await dispatch(startPromptInstance({
    promptId: prompt.id,
    variables: finalVars,
    executionConfig: action.execution_config
  }));
}
```

---

## 🔗 Shortcuts Integration

### Current: Shortcuts → Prompts
```sql
prompt_shortcuts.prompt_builtin_id → prompt_builtins.id
```

### New: Shortcuts → Prompts OR Actions
```sql
-- Either (not both):
prompt_shortcuts.prompt_builtin_id → prompt_builtins.id
prompt_shortcuts.action_id → prompt_actions.id
```

**Execution Logic:**
```typescript
if (shortcut.action_id) {
  // Context-aware execution
  await dispatch(startPromptAction({
    actionId: shortcut.action_id,
    context: getCurrentContext(),
    userProvidedVariables: getUserInput()
  }));
} else if (shortcut.prompt_builtin_id) {
  // Direct prompt execution
  await dispatch(startPromptInstance({
    promptId: shortcut.prompt_builtin_id,
    variables: getUserInput()
  }));
}
```

---

## 📊 Database Schema Summary

### Core Tables (Already Exist)
- ✅ `prompts` - User prompts
- ✅ `prompt_builtins` - System prompts
- ✅ `ai_runs` - Execution tracking
- ✅ `ai_tasks` - API call tracking
- ✅ `brokers` - Broker definitions
- ✅ `broker_values` - Context values

### New Tables (Migration Required)
- 🆕 `prompt_actions` - Action definitions
- 🔄 `prompt_shortcuts` - Add `action_id` column

---

## 🚀 Migration Strategy

### Phase 1: Foundation
1. Create `prompt_actions` table
2. Build broker resolution service
3. Test resolution in isolation

### Phase 2: Core
1. Create action types & services
2. Implement Redux caching
3. Build execution thunk

### Phase 3: Integration
1. Create test pages
2. End-to-end testing
3. Fix any issues

### Phase 4: Polish
1. Add to shortcuts
2. UI components
3. Documentation

---

## 💡 Example Use Cases

### Use Case 1: Project Brief Generator

**Prompt (Pure):**
```
Variables: client_name, project_type, deadline, budget
```

**Action A (For Project Manager):**
```
Context: workspace + project
Brokers: 
  - client_name → workspace.company_name
  - deadline → project.deadline
  - budget → project.budget
User must provide: project_type
```

**Action B (For Sales):**
```
Context: workspace + opportunity
Brokers:
  - client_name → opportunity.company_name
  - budget → opportunity.budget
User must provide: project_type, deadline
```

Same prompt, different contexts, different auto-fill behavior!

---

### Use Case 2: Code Review Request

**Prompt (Pure):**
```
Variables: code, language, focus_area
```

**Action:**
```
Context: workspace + project + ai_task
Brokers:
  - code → task.selected_text
  - language → task.file_extension
Hardcoded:
  - focus_area → "security and performance"
User provides: nothing (fully automated)
```

Result: One-click code review with no manual input!

---

## ✅ Quality Checklist

- [ ] Prompts remain pure (no context coupling)
- [ ] Actions are optional (prompts work standalone)
- [ ] Variable precedence correct
- [ ] Broker resolution tested
- [ ] No breaking changes to existing code
- [ ] Redux caching working
- [ ] Database migration successful
- [ ] RLS policies secure
- [ ] Linter errors fixed
- [ ] Test pages functional

---

**This architecture provides maximum flexibility while maintaining simplicity.**

