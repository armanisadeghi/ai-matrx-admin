# Architectural Decisions & Answers

## 🎯 Executive Summary

**Decision: Implement Two-Layer Architecture (Prompts + Actions)**

This approach maintains prompt purity while enabling context-aware execution through actions. Shortcuts can reference either prompts (direct execution) or actions (context-aware execution).

---

## ✅ Answers to Your Questions

### 1. Shortcuts Architecture Understanding

**Understanding Confirmed:** 
- Shortcuts can point to `prompt_builtin_id` OR `action_id` (not both)
- Actions are designed to be compatible with this model
- Migration adds `action_id` column to `prompt_shortcuts` table
- Check constraint ensures one target type at a time

**Schema Integration:**
```sql
-- New field
ALTER TABLE prompt_shortcuts 
ADD COLUMN action_id UUID REFERENCES prompt_actions(id) ON DELETE CASCADE;

-- New constraint
ALTER TABLE prompt_shortcuts
ADD CONSTRAINT prompt_shortcuts_target_check CHECK (
  (prompt_builtin_id IS NOT NULL AND action_id IS NULL) OR
  (prompt_builtin_id IS NULL AND action_id IS NOT NULL)
);
```

---

### 2. Actions Database Design

**Decision:** Create `prompt_actions` table with:
- References to either `prompts` or `prompt_builtins`
- `broker_mappings` (JSONB): `{variableName: brokerId}`
- `hardcoded_values` (JSONB): `{variableName: value}`
- `context_scopes` (TEXT[]): Required context types
- `execution_config` (JSONB): Execution preferences
- Full RLS policies for security
- Optimized indexes for performance

**See:** `ACTIONS_MIGRATION.sql` for complete schema

---

### 3. Task Organization

**Decision:** Create comprehensive phase-based task list

**See:** `ACTIONS_IMPLEMENTATION.md` for complete breakdown

**Summary:**
- **Phase 1:** Broker Resolution Service (3-4 hours)
- **Phase 2:** Prompt Actions Core (3-4 hours)
- **Phase 3:** Action Execution Thunk (3-4 hours)
- **Phase 4:** Integration & Polish (2-3 hours)

**Total Estimate:** 11-15 hours for Phases 1-3 + parts of Phase 4

---

### 4. Variable Resolution Precedence

**CORRECTED Understanding:**

```
Priority Order (Highest to Lowest):
1. User Input       ← Manual override (highest)
2. Hardcoded Value  ← From action definition
3. Broker Value     ← From context resolution
4. Prompt Default   ← From prompt definition (lowest)
```

**Example Flow:**

```typescript
// Prompt defines
variable_defaults = {
  client_name: { default: "Client" }
}

// Broker resolves from context
brokerValues = {
  client_name: "Acme Corp"
}

// Action hardcodes
hardcoded_values = {
  // None for this variable
}

// User provides
userInput = {
  client_name: "ACME Corporation"
}

// RESULT: "ACME Corporation" (user input wins)
```

**Key Insight:** 
- If broker provides value → user doesn't see input field (unless they explicitly open variables)
- If broker doesn't provide value → user MUST provide it
- If user doesn't provide → use prompt default

---

### 5. Testing Route & Non-Breaking Changes

**Decision:** Use `app/(authenticated)/ai/prompts/experimental/`

**Test Pages Created:**
1. `experimental/broker-test/` - Test broker resolution
2. `experimental/action-test/` - Test full action execution

**Non-Breaking Strategy:**
- Existing prompt execution completely unchanged
- Actions are **additive only**
- All new Redux slices (no modifications to existing)
- New thunks (don't touch existing ones)
- Optional integration points

**Verification:**
- Existing `PromptRunPage.tsx` still works
- Existing `PromptRunner.tsx` still works
- All current execution paths remain functional
- New paths exist alongside old ones

---

## 🏗️ Architecture Details

### Layer 1: Prompts (Pure Templates)

**What They Are:**
- Messages with variables
- Model settings
- Variable definitions with defaults
- UI hints for inputs

**What They're NOT:**
- Context-aware
- Business logic containers
- Auto-fetching data sources

---

### Layer 2: Actions (Context Wrappers)

**What They Are:**
- References to prompts
- Broker mappings (variable → broker ID)
- Hardcoded overrides
- Context requirements
- Execution preferences

**What They Do:**
1. Load referenced prompt
2. Resolve brokers for current context
3. Map broker values to variable names
4. Apply hardcoded overrides
5. Merge user input
6. Execute via standard engine

---

## 🔄 Execution Paths

### Path A: Direct Prompt Execution
```typescript
// Existing functionality (unchanged)
dispatch(startPromptInstance({
  promptId: 'uuid',
  variables: { /* user provides all */ }
}));
```

**Use When:**
- Testing prompts
- Manual execution
- No context available
- One-off runs

---

### Path B: Action Execution
```typescript
// New functionality (additive)
dispatch(startPromptAction({
  actionId: 'uuid',
  context: {
    userId: '...',
    workspaceId: '...',
    projectId: '...'
  },
  userProvidedVariables: { /* optional overrides */ }
}));
```

**Use When:**
- Shortcuts
- Automation
- Context-aware execution
- Reducing manual input

---

## 🎯 Why This Architecture?

### ✅ Advantages

1. **Separation of Concerns**
   - Prompts = reusable templates
   - Actions = business logic

2. **Flexibility**
   - One prompt → many actions
   - Different contexts per action
   - Easy to test and iterate

3. **No Breaking Changes**
   - Existing code untouched
   - New features additive
   - Backward compatible

4. **User Experience**
   - Auto-fill when possible
   - Manual input only when needed
   - Transparent behavior

5. **Maintainability**
   - Clear ownership boundaries
   - Edit prompt → all actions updated
   - Edit action → prompt unchanged

---

## 📋 Implementation Phases

### ✅ Phase 1: Broker Resolution (3-4 hours)
**Deliverables:**
- `features/brokers/types/resolution.ts`
- `features/brokers/services/resolution-service.ts`
- Test page for broker resolution

**Success Criteria:**
- Can resolve brokers for context
- Hierarchy works correctly
- Test page demonstrates functionality

---

### ✅ Phase 2: Actions Core (3-4 hours)
**Deliverables:**
- Database migration (run in Supabase)
- `features/prompt-actions/types/index.ts`
- `features/prompt-actions/services/action-service.ts`
- `lib/redux/prompt-execution/slices/actionCacheSlice.ts`
- Integration with rootReducer

**Success Criteria:**
- Actions table created
- CRUD operations work
- Actions cached in Redux
- No linter errors

---

### ✅ Phase 3: Execution Engine (3-4 hours)
**Deliverables:**
- `lib/redux/prompt-execution/thunks/startPromptActionThunk.ts`
- Test page for action execution
- Export from index.ts

**Success Criteria:**
- Actions execute end-to-end
- Variable precedence correct
- Runs/tasks created properly
- No breaking changes

---

### ✅ Phase 4: Polish (2-3 hours)
**Deliverables:**
- `features/prompt-actions/hooks/usePromptAction.ts`
- Comprehensive testing
- Bug fixes

**Success Criteria:**
- All test cases pass
- Linter errors fixed
- Documentation complete
- Ready for production use

---

## 🚀 Getting Started

### Step 1: Review Documents
- ✅ `TWO_LAYER_ARCHITECTURE.md` - Understand the system
- ✅ `ACTIONS_MIGRATION.sql` - Review database changes
- ✅ `ACTIONS_IMPLEMENTATION.md` - See task breakdown

### Step 2: Run Migration
```sql
-- In Supabase SQL Editor
-- Copy entire ACTIONS_MIGRATION.sql
-- Execute
-- Verify tables created
```

### Step 3: Start Phase 1
- Create broker types
- Create resolution service
- Test in isolation

### Step 4: Continue Through Phases
- Follow task list in `ACTIONS_IMPLEMENTATION.md`
- Check linter after each file
- Test frequently

---

## 🎯 Success Metrics

- [ ] All 15 tasks completed
- [ ] Zero linter errors
- [ ] Test pages functional
- [ ] Variable precedence correct
- [ ] No breaking changes
- [ ] Database migration successful
- [ ] Broker resolution works
- [ ] Action execution works
- [ ] Runs/tasks tracked properly
- [ ] Documentation complete

---

## 📝 Notes for Implementation

### Critical Points

1. **Variable Precedence:**
   - Implementation in `startPromptActionThunk.ts`
   - Test thoroughly with all combinations

2. **Broker Resolution:**
   - Uses existing database function
   - Returns hierarchy-aware values
   - Handle missing values gracefully

3. **Redux Caching:**
   - Check cache before fetching
   - Smart thunks avoid redundant calls
   - Stale detection optional (future)

4. **No Breaking Changes:**
   - Test existing prompt execution after each phase
   - Keep old paths functional
   - New features additive only

5. **Quality Control:**
   - Run linter after each file
   - Fix errors immediately
   - Test in browser frequently
   - Use Redux DevTools

---

## 🔮 Future Enhancements (Post-MVP)

### Phase 5: UI Components
- Action builder/editor
- Visual broker mapper
- Context selector
- Variable preview

### Phase 6: Shortcuts Integration
- UI for selecting actions
- Context detection
- Keyboard shortcuts

### Phase 7: Advanced Features
- Action templates
- Action sharing
- Versioning
- Analytics
- A/B testing

---

## ❓ Open Questions (None!)

All questions answered. Architecture decided. Task list complete.

**Ready to implement!** 🚀

