# Migration Guide: Component Logic → Redux

**Purpose:** Step-by-step guide for migrating existing component logic to Redux.

---

## 📋 Pre-Migration Checklist

Before starting any migration:
- [ ] Create feature branch: `feature/redux-centralization-phase-X`
- [ ] Set up feature flag (if applicable)
- [ ] Write tests for existing behavior
- [ ] Document current API contracts
- [ ] Review with team

---

## 🎯 Migration Phases

### Phase 1: Resource Management ⭐ START HERE

**Goal:** Move resource management from component state to Redux.

**Estimated Time:** 3-5 days

**Risk Level:** LOW (resources already in Redux, just unused)

#### Step 1.1: Create Resource Utilities (Day 1)

```bash
# Create new files
touch lib/redux/prompt-execution/utils/resourceUtils.ts
touch lib/redux/prompt-execution/thunks/resourceThunks.ts
```

**Implementation checklist:**
- [ ] Create `resourceUtils.ts` with helper functions
- [ ] Create `resourceThunks.ts` with async operations
- [ ] Write unit tests for utilities
- [ ] Document functions with JSDoc

**Testing:**
```typescript
// lib/redux/prompt-execution/utils/__tests__/resourceUtils.test.ts
import { serializeResourcesForAPI } from '../resourceUtils';

describe('resourceUtils', () => {
  describe('serializeResourcesForAPI', () => {
    it('serializes file resources correctly', () => {
      const resources = [
        { type: 'file', data: { filename: 'test.pdf' } }
      ];
      expect(serializeResourcesForAPI(resources)).toContain('test.pdf');
    });
  });
});
```

#### Step 1.2: Create PromptInputV2 (Day 2-3)

```bash
# Copy existing component
cp features/prompts/components/PromptInput.tsx \
   features/prompts/components/PromptInputV2.tsx
```

**Refactoring checklist:**
- [ ] Replace props: `resources`, `onResourcesChange` → `runId`
- [ ] Add Redux selectors for resources
- [ ] Replace local state with Redux actions
- [ ] Update resource handlers to dispatch actions
- [ ] Test with existing consumers

**Key Changes:**
```typescript
// REMOVE these props:
interface PromptInputProps {
  resources?: Resource[];  // ❌ REMOVE
  onResourcesChange?: (resources: Resource[]) => void;  // ❌ REMOVE
}

// ADD this prop:
interface PromptInputV2Props {
  runId: string;  // ✅ ADD
}
```

#### Step 1.3: Update AICodeEditorModal (Day 3-4)

**File:** `features/code-editor/components/AICodeEditorModal.tsx`

**Changes:**
1. Remove local resource state
2. Pass `runId` to PromptInputV2
3. Update resource handlers

**Before/After:**
```typescript
// BEFORE
const [resources, setResources] = useState<Resource[]>([]);

<PromptInput
  resources={resources}
  onResourcesChange={setResources}
/>

// AFTER
<PromptInputV2
  runId={runId}
/>
```

#### Step 1.4: Update executeMessage Thunk (Day 4)

**File:** `lib/redux/prompt-execution/thunks/executeMessageThunk.ts`

**Add resource handling:**
```typescript
// Around line 110, before building message
import { serializeResourcesForAPI } from '../utils/resourceUtils';

// Get resources from Redux
const resources = selectResources(state, runId);

// Add to message if present
if (resources.length > 0) {
  const resourceContext = serializeResourcesForAPI(resources);
  if (resourceContext) {
    userMessageContent = resourceContext + '\n\n' + userMessageContent;
  }
}
```

#### Step 1.5: Testing & Rollout (Day 5)

**Test Checklist:**
- [ ] Upload file resource
- [ ] Add URL resource
- [ ] Remove resource
- [ ] Multiple resources
- [ ] Paste image
- [ ] Resource preview
- [ ] Message with resources executes correctly
- [ ] Resources persist across re-renders
- [ ] Redux DevTools shows correct state

**Rollout:**
1. Deploy with feature flag OFF
2. Test in staging
3. Enable for internal users
4. Monitor for 48 hours
5. Enable for all users
6. Remove old code after 1 week

---

### Phase 2: Special Variables ⭐ NEXT

**Goal:** Auto-populate special variables via thunk.

**Estimated Time:** 2-3 days

**Risk Level:** LOW (logic already exists, just moving it)

#### Step 2.1: Create Special Variables Thunk (Day 1)

```bash
touch lib/redux/prompt-execution/thunks/specialVariablesThunk.ts
```

**Implementation:**
- [ ] Create `populateSpecialVariables` thunk
- [ ] Add to exports in `index.ts`
- [ ] Write tests
- [ ] Document usage

#### Step 2.2: Update startInstanceThunk (Day 1)

**File:** `lib/redux/prompt-execution/thunks/startInstanceThunk.ts`

**Changes:**
1. Add `codeContext` to `StartInstancePayload`
2. Call `populateSpecialVariables` if `codeContext` provided

```typescript
// After instance creation (around line 155)
if (codeContext) {
  await dispatch(populateSpecialVariables({ runId, codeContext }));
}
```

#### Step 2.3: Refactor useAICodeEditor (Day 2)

**File:** `features/code-editor/hooks/useAICodeEditor.ts`

**Changes:**
1. Remove special variable population `useEffect` (lines 162-186)
2. Add single call to thunk
3. Remove duplicate logic in `handleSubmit`

```typescript
// REMOVE lines 162-186

// ADD this simpler effect:
useEffect(() => {
  if (runId) {
    dispatch(populateSpecialVariables({
      runId,
      codeContext: { currentCode, selection, context }
    }));
  }
}, [runId, currentCode, selection, context, dispatch]);
```

#### Step 2.4: Testing (Day 2-3)

**Test Cases:**
- [ ] `current_code` variable populated
- [ ] `selection` variable populated
- [ ] `context` variable populated
- [ ] Variables updated on code change
- [ ] Works with multiple instances
- [ ] Logs show correct special variables

---

### Phase 3: Response Processing 🔧

**Goal:** Centralize code edit processing.

**Estimated Time:** 4-5 days

**Risk Level:** MEDIUM (complex logic, core functionality)

#### Step 3.1: Create Response Utils (Day 1-2)

```bash
touch lib/redux/prompt-execution/utils/codeEditorResponseUtils.ts
touch lib/redux/prompt-execution/thunks/processCodeEditorResponseThunk.ts
```

**Implementation:**
- [ ] Create `processCodeResponse` utility
- [ ] Create `processCodeEditorResponse` thunk
- [ ] Add comprehensive error handling
- [ ] Write extensive tests (critical!)

#### Step 3.2: Add Code Editor State to Slice (Day 2)

**File:** `lib/redux/prompt-execution/slice.ts`

**Add to state:**
```typescript
interface PromptExecutionState {
  // ... existing
  codeEditorState: {
    [runId: string]: {
      processedResponse: ProcessedCodeResponse | null;
      state: EditorState;
    };
  };
}
```

**Add reducers:**
- `setCodeEditorState`
- `setCodeEditorProcessedResponse`
- `clearCodeEditorState`

#### Step 3.3: Refactor useAICodeEditor (Day 3-4)

**Remove:**
- Local state: `parsedEdits`, `modifiedCode`, `errorMessage`
- Complex processing `useEffect` (lines 241-301)

**Add:**
- Call to `processCodeEditorResponse` thunk
- Selectors for processed response from Redux

#### Step 3.4: Testing (Day 4-5)

**Test Matrix:**
- [ ] Valid code edits
- [ ] Invalid code edits
- [ ] Fuzzy matching
- [ ] Multiple edits
- [ ] No code edits (conversation only)
- [ ] Syntax errors
- [ ] Edge cases (empty code, huge files, etc.)

---

### Phase 4: File Upload Service 📤

**Goal:** Centralized upload with progress tracking.

**Estimated Time:** 3-4 days

**Risk Level:** MEDIUM (new infrastructure)

#### Step 4.1: Create Upload Service (Day 1)

```bash
touch lib/services/uploadService.ts
```

**Features:**
- [ ] Single file upload
- [ ] Multiple file upload
- [ ] Progress tracking
- [ ] Error handling
- [ ] Retry logic

#### Step 4.2: Create Upload Thunks (Day 2)

```bash
touch lib/redux/prompt-execution/thunks/uploadThunks.ts
```

**Thunks to create:**
- `uploadFileWithProgress`
- `uploadMultipleFiles`
- `cancelUpload`

#### Step 4.3: Add Upload State to Slice (Day 2)

**Add to state:**
```typescript
uploadProgress: {
  [runId: string]: {
    [fileId: string]: {
      loaded: number;
      total: number;
      status: 'pending' | 'uploading' | 'complete' | 'error';
    };
  };
}
```

#### Step 4.4: Update Components (Day 3)

**Components to update:**
- PromptInputV2
- ResourcePickerButton
- Any component that uploads files

**Add progress UI:**
- Upload progress bars
- Cancel button
- Error states

#### Step 4.5: Testing (Day 3-4)

**Test Cases:**
- [ ] Upload single file
- [ ] Upload multiple files
- [ ] Progress tracking accurate
- [ ] Cancel upload
- [ ] Upload error handling
- [ ] Large file upload
- [ ] Network interruption

---

## 🛠️ Tools & Scripts

### Feature Flag Setup

```typescript
// lib/redux/slices/featureFlagsSlice.ts
export const selectUseReduxResources = (state: RootState) =>
  state.featureFlags.useReduxResources ?? false;

export const selectUseReduxSpecialVars = (state: RootState) =>
  state.featureFlags.useReduxSpecialVars ?? false;
```

### Component Switcher

```typescript
// Use this pattern during migration
export function PromptInputSwitcher(props: PromptInputProps) {
  const useV2 = useAppSelector(selectUseReduxResources);
  
  if (useV2 && props.runId) {
    return <PromptInputV2 {...props} />;
  }
  
  return <PromptInput {...props} />;
}
```

### Testing Helper

```typescript
// test/utils/reduxTestUtils.ts
export function createMockStore(initialState = {}) {
  return configureStore({
    reducer: {
      promptExecution: promptExecutionReducer,
      // ... other reducers
    },
    preloadedState: initialState
  });
}

export function withReduxProvider(component: React.ReactElement, store: any) {
  return <Provider store={store}>{component}</Provider>;
}
```

---

## 📊 Progress Tracking

### Phase 1: Resource Management
- [x] Planning complete
- [ ] Utils created
- [ ] Thunks created
- [ ] PromptInputV2 created
- [ ] AICodeEditorModal updated
- [ ] executeMessage updated
- [ ] Tests passing
- [ ] Deployed to staging
- [ ] Rolled out to production

### Phase 2: Special Variables
- [x] Planning complete
- [ ] Thunk created
- [ ] startInstance updated
- [ ] useAICodeEditor refactored
- [ ] Tests passing
- [ ] Deployed

### Phase 3: Response Processing
- [x] Planning complete
- [ ] Utils created
- [ ] Slice updated
- [ ] Hook refactored
- [ ] Tests passing
- [ ] Deployed

### Phase 4: File Upload
- [x] Planning complete
- [ ] Service created
- [ ] Thunks created
- [ ] Components updated
- [ ] Tests passing
- [ ] Deployed

---

## 🚨 Rollback Procedures

### If something goes wrong:

#### Phase 1 Rollback
```typescript
// Disable feature flag
dispatch(setFeatureFlag({ useReduxResources: false }));

// Or environment variable
NEXT_PUBLIC_USE_REDUX_RESOURCES=false
```

#### Phase 2 Rollback
```typescript
// Special variables thunk is additive, just stop calling it
// Old logic still works
```

#### Phase 3 Rollback
```typescript
// Keep both processing paths active
// Switch based on feature flag
const useReduxProcessing = useAppSelector(selectUseReduxProcessing);
```

#### Emergency Rollback
```bash
# Revert to previous deployment
git revert <commit-hash>
git push
# Deploy previous version
```

---

## 📞 Support & Questions

### During Migration:

**Questions about architecture:**
- Review `REDUX_CENTRALIZATION_PLAN.md`
- Check `REDUX_ARCHITECTURE_EXAMPLES.md`
- Ask in #engineering-redux channel

**Running into issues:**
1. Check existing tests
2. Look at Redux DevTools
3. Review commit history
4. Ask team for help

**Need to extend the plan:**
1. Document what you need
2. Update this guide
3. Share with team
4. Get approval before proceeding

---

## ✅ Definition of Done

For each phase, check all boxes:

### Code Quality
- [ ] TypeScript types complete (no `any`)
- [ ] JSDoc comments on public APIs
- [ ] Error handling implemented
- [ ] Edge cases handled

### Testing
- [ ] Unit tests for utilities (>80% coverage)
- [ ] Integration tests for thunks
- [ ] E2E tests for critical paths
- [ ] Manual testing checklist completed

### Documentation
- [ ] Function/thunk documentation
- [ ] Usage examples added
- [ ] Migration notes updated
- [ ] README updated (if applicable)

### Code Review
- [ ] PR created with detailed description
- [ ] Tests passing in CI
- [ ] Two approvals received
- [ ] No merge conflicts

### Deployment
- [ ] Deployed to staging
- [ ] Smoke tests passed
- [ ] Deployed to production
- [ ] Monitoring shows no issues
- [ ] Feature flag enabled (if applicable)

---

## 🎓 Learning from Migration

### After Each Phase:

**Retrospective Questions:**
1. What went well?
2. What was harder than expected?
3. What would we do differently?
4. What did we learn about our codebase?
5. How can we improve the next phase?

**Document:**
- Unexpected challenges
- Solutions that worked well
- Patterns to replicate
- Pitfalls to avoid

**Share:**
- Write team update
- Update this guide with learnings
- Share wins in team meeting

---

## 🎯 Success Criteria

### Overall Migration Success:

**Quantitative:**
- [ ] 30%+ reduction in component LOC
- [ ] 80%+ test coverage
- [ ] No performance regression
- [ ] Zero production bugs in first week

**Qualitative:**
- [ ] Team finds new code easier to work with
- [ ] Debugging is faster with Redux DevTools
- [ ] New features are easier to add
- [ ] Code reviews are faster

**Business:**
- [ ] No user-reported issues
- [ ] No downtime
- [ ] Team velocity increased
- [ ] Technical debt reduced

---

## 📚 Additional Resources

- [Redux Style Guide](https://redux.js.org/style-guide/)
- [Redux Toolkit Tutorials](https://redux-toolkit.js.org/tutorials/overview)
- [Testing Redux Applications](https://redux.js.org/usage/writing-tests)
- [React-Redux Performance](https://react-redux.js.org/api/hooks#performance)

---

**Good luck with the migration! 🚀**

_Last updated: Nov 25, 2025_

