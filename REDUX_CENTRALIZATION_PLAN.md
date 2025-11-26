# Redux Centralization Plan
## AI Code Editor & Prompt Execution System Refactoring

**Date:** Nov 25, 2025  
**Goal:** Move business logic from React components/hooks into Redux (actions, thunks, utilities) for better centralization, testability, and reusability.

---

## 🔍 Current Architecture Analysis

### What's Working Well ✅
1. **Isolated State Maps** - `currentInputs`, `resources`, `uiState` prevent re-renders
2. **Selector Architecture** - Memoized selectors provide stable references
3. **Thunk Structure** - Clean async logic in thunks (executeMessage, startInstance, etc.)
4. **Message Management** - Centralized in Redux with proper tracking

### Critical Issues 🚨

#### 1. **Resource Management Duplication**
**Problem:** Resources exist in Redux but components manage them locally
- `useAICodeEditor`: `const [resources, setResources] = useState<Resource[]>([]);`
- `PromptInput`: Local resource state management
- Upload logic scattered across components

**Impact:** 
- State synchronization issues
- Difficult to test
- Can't easily access resources from other parts of the app

#### 2. **Special Variables in Hooks**
**Problem:** Auto-population logic in `useAICodeEditor` effects
- Manual population in `useEffect` (lines 162-186)
- Happens after instance creation
- Not reusable for other code editor instances

**Impact:**
- Not centralized
- Can't reuse logic elsewhere
- Harder to test

#### 3. **Response Processing in Hooks**
**Problem:** Complex code edit parsing/validation in `useAICodeEditor`
- Parsing: `parseCodeEdits(rawAIResponse)` (line 243)
- Validation: `validateEdits(currentCode, parsed.edits)` (line 252)
- Application: `applyCodeEdits(currentCode, parsed.edits)` (line 281)

**Impact:**
- Can't use this logic outside the hook
- Hard to test independently
- Can't create alternate UIs

#### 4. **File Upload in Components**
**Problem:** Upload logic in `PromptInput` component
- `useFileUploadWithStorage` hook usage
- Paste handling in component
- No centralized upload tracking

**Impact:**
- Can't reuse upload logic
- No central upload state management
- Difficult to add features like progress tracking

#### 5. **Variable Expansion State**
**Problem:** Sometimes Redux, sometimes local
- Redux has `uiState[runId].expandedVariable`
- Some components use local state

**Impact:**
- Inconsistent state management
- Can't persist UI state easily

---

## 🎯 Refactoring Strategy

### Phase 1: Resource Management Centralization (HIGH PRIORITY)

#### 1.1 Create Resource Utilities
**File:** `lib/redux/prompt-execution/utils/resourceUtils.ts`

```typescript
/**
 * Resource management utilities
 * Handles all resource operations including uploads
 */

import type { Resource } from '@/features/prompts/types/resource';

// Upload utilities
export async function uploadFileResource(
  file: File,
  bucket: string,
  path: string,
  uploadFn: (files: File[]) => Promise<any[]>
): Promise<Resource> {
  const results = await uploadFn([file]);
  if (!results || results.length === 0) {
    throw new Error('Upload failed');
  }
  
  return {
    type: 'file',
    data: results[0]
  };
}

export async function uploadImageResource(
  file: File,
  bucket: string,
  path: string,
  uploadFn: (files: File[]) => Promise<any[]>
): Promise<Resource> {
  const results = await uploadFn([file]);
  if (!results || results.length === 0) {
    throw new Error('Upload failed');
  }
  
  return {
    type: 'image_url',
    data: {
      url: results[0].url,
      filename: file.name
    }
  };
}

// Resource validation
export function validateResource(resource: Resource): boolean {
  // Add validation logic
  return true;
}

// Resource serialization for API
export function serializeResourcesForAPI(resources: Resource[]): string {
  return resources.map((resource, index) => {
    if (resource.type === 'file') {
      const filename = resource.data.filename || resource.data.details?.filename || 'file';
      return `[Attachment ${index + 1}: ${filename}]`;
    } else if (resource.type === 'image_url') {
      return `[Image ${index + 1}: ${resource.data.url}]`;
    } else if (resource.type === 'file_url') {
      const filename = resource.data.filename || 'file';
      return `[File URL ${index + 1}: ${filename}]`;
    } else if (resource.type === 'webpage') {
      return `[Webpage ${index + 1}: ${resource.data.title || resource.data.url}]`;
    } else if (resource.type === 'youtube') {
      return `[YouTube ${index + 1}: ${resource.data.title || resource.data.videoId}]`;
    }
    return `[Resource ${index + 1}]`;
  }).filter(Boolean).join('\n');
}
```

#### 1.2 Create Resource Thunks
**File:** `lib/redux/prompt-execution/thunks/resourceThunks.ts`

```typescript
/**
 * Resource management thunks
 * Centralizes all resource operations including uploads
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '../../store';
import { addResource, removeResource, setResources } from '../slice';
import { uploadFileResource, uploadImageResource } from '../utils/resourceUtils';
import type { Resource } from '@/features/prompts/types/resource';

// Upload file and add to resources
export const uploadAndAddFileResource = createAsyncThunk<
  Resource,
  {
    runId: string;
    file: File;
    bucket: string;
    path: string;
    uploadFn: (files: File[]) => Promise<any[]>;
  },
  { dispatch: AppDispatch; state: RootState }
>(
  'promptExecution/uploadAndAddFileResource',
  async ({ runId, file, bucket, path, uploadFn }, { dispatch }) => {
    const resource = await uploadFileResource(file, bucket, path, uploadFn);
    dispatch(addResource({ runId, resource }));
    return resource;
  }
);

// Upload image and add to resources
export const uploadAndAddImageResource = createAsyncThunk<
  Resource,
  {
    runId: string;
    file: File;
    bucket: string;
    path: string;
    uploadFn: (files: File[]) => Promise<any[]>;
  },
  { dispatch: AppDispatch; state: RootState }
>(
  'promptExecution/uploadAndAddImageResource',
  async ({ runId, file, bucket, path, uploadFn }, { dispatch }) => {
    const resource = await uploadImageResource(file, bucket, path, uploadFn);
    dispatch(addResource({ runId, resource }));
    return resource;
  }
);

// Batch add resources
export const addMultipleResources = createAsyncThunk<
  void,
  { runId: string; resources: Resource[] },
  { dispatch: AppDispatch; state: RootState }
>(
  'promptExecution/addMultipleResources',
  async ({ runId, resources }, { dispatch }) => {
    resources.forEach(resource => {
      dispatch(addResource({ runId, resource }));
    });
  }
);
```

#### 1.3 Update executeMessage to Use Resources from Redux
**File:** `lib/redux/prompt-execution/thunks/executeMessageThunk.ts`

```typescript
// Add to executeMessage thunk (around line 110)

// ========== STEP 3.5: Add Resources to Message ==========
const resources = selectResources(state, runId);

if (resources.length > 0) {
  const resourceContext = serializeResourcesForAPI(resources);
  if (resourceContext) {
    userMessageContent = resourceContext + 
      (userMessageContent ? '\n\n' + userMessageContent : '');
  }
}
```

#### 1.4 Refactor Components to Use Redux Resources

**AICodeEditorModal.tsx Changes:**
```typescript
// BEFORE:
const [resources, setResources] = useState<Resource[]>([]);

// AFTER:
const resources = useAppSelector(state => 
  runId ? selectResources(state, runId) : []
);

const handleResourceAdd = useCallback((resource: Resource) => {
  if (runId) {
    dispatch(addResource({ runId, resource }));
  }
}, [runId, dispatch]);

const handleResourceRemove = useCallback((index: number) => {
  if (runId) {
    dispatch(removeResource({ runId, index }));
  }
}, [runId, dispatch]);
```

**PromptInput.tsx Changes:**
```typescript
// Accept runId as prop
interface PromptInputProps {
  runId?: string; // Add this
  // ... rest of props
  
  // REMOVE these (now handled by Redux):
  resources?: Resource[];
  onResourcesChange?: (resources: Resource[]) => void;
}

// Inside component:
const resources = useAppSelector(state => 
  runId ? selectResources(state, runId) : []
);

const handleResourceAdd = useCallback((resource: Resource) => {
  if (runId) {
    dispatch(addResource({ runId, resource }));
  }
}, [runId, dispatch]);
```

---

### Phase 2: Special Variables Auto-Population (HIGH PRIORITY)

#### 2.1 Create Special Variables Thunk
**File:** `lib/redux/prompt-execution/thunks/specialVariablesThunk.ts`

```typescript
/**
 * Special Variables Thunk
 * Auto-populates special variables for code editor builtins
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '../../store';
import { updateVariables } from '../slice';
import { selectInstance } from '../selectors';
import { selectCachedPrompt } from '../../slices/promptCacheSlice';
import {
  buildSpecialVariables,
  getRequiredSpecialVariables,
  logSpecialVariablesUsage,
  type CodeEditorContext
} from '@/features/code-editor/utils/specialVariables';

export const populateSpecialVariables = createAsyncThunk<
  void,
  {
    runId: string;
    codeContext: CodeEditorContext;
  },
  { dispatch: AppDispatch; state: RootState }
>(
  'promptExecution/populateSpecialVariables',
  async ({ runId, codeContext }, { dispatch, getState }) => {
    const state = getState();
    const instance = selectInstance(state, runId);
    
    if (!instance) {
      throw new Error('Instance not found');
    }
    
    const cachedPrompt = selectCachedPrompt(state, instance.promptId);
    
    if (!cachedPrompt) {
      throw new Error('Prompt not found');
    }
    
    const promptVariables = cachedPrompt.variableDefaults || [];
    const requiredSpecialVars = getRequiredSpecialVariables(promptVariables);
    
    if (requiredSpecialVars.length === 0) {
      return; // No special variables needed
    }
    
    const specialVars = buildSpecialVariables(codeContext, requiredSpecialVars);
    logSpecialVariablesUsage(cachedPrompt.name, specialVars);
    
    // Update all special variables at once
    dispatch(updateVariables({ runId, variables: specialVars }));
  }
);
```

#### 2.2 Integrate into startInstanceThunk
**File:** `lib/redux/prompt-execution/thunks/startInstanceThunk.ts`

```typescript
// Add optional parameter
export interface StartInstancePayload {
  // ... existing fields
  codeContext?: CodeEditorContext; // Add this
}

// In the thunk (after instance creation):
if (codeContext) {
  await dispatch(populateSpecialVariables({ runId, codeContext }));
}
```

#### 2.3 Update useAICodeEditor to Use Centralized Logic

```typescript
// BEFORE: Manual useEffect population (lines 162-186)

// AFTER: Single thunk call
useEffect(() => {
  if (runId && cachedPrompt) {
    dispatch(populateSpecialVariables({
      runId,
      codeContext: {
        currentCode,
        selection,
        context,
      }
    }));
  }
}, [runId, cachedPrompt, currentCode, selection, context, dispatch]);
```

---

### Phase 3: Response Processing Utilities (MEDIUM PRIORITY)

#### 3.1 Create Response Processing Utilities
**File:** `lib/redux/prompt-execution/utils/codeEditorResponseUtils.ts`

```typescript
/**
 * Code Editor Response Processing Utilities
 * Handles parsing, validation, and application of code edits
 */

import { parseCodeEdits, validateEdits } from '@/features/code-editor/utils/parseCodeEdits';
import { applyCodeEdits } from '@/features/code-editor/utils/applyCodeEdits';
import { getDiffStats } from '@/features/code-editor/utils/generateDiff';

export interface ProcessedCodeResponse {
  success: boolean;
  edits?: ReturnType<typeof parseCodeEdits>;
  modifiedCode?: string;
  diffStats?: {
    additions: number;
    deletions: number;
    changes: number;
  };
  error?: string;
  warnings?: string[];
}

export function processCodeResponse(
  aiResponse: string,
  currentCode: string
): ProcessedCodeResponse {
  // Step 1: Parse
  const parsed = parseCodeEdits(aiResponse);
  
  if (!parsed.success || parsed.edits.length === 0) {
    return {
      success: false,
      error: 'No code edits found in response'
    };
  }
  
  // Step 2: Validate
  const validation = validateEdits(currentCode, parsed.edits);
  
  if (!validation.valid) {
    let errorMsg = `Invalid code edits:\n\n`;
    errorMsg += `The AI provided ${parsed.edits.length} edit(s), but some SEARCH patterns don't match.\n\n`;
    
    if (validation.warnings.length > 0) {
      errorMsg += `✓ ${validation.warnings.length} edit(s) will use fuzzy matching\n`;
    }
    
    errorMsg += `✗ ${validation.errors.length} edit(s) failed validation\n\n`;
    errorMsg += validation.errors.join('\n');
    
    return {
      success: false,
      edits: parsed,
      error: errorMsg,
      warnings: validation.warnings
    };
  }
  
  // Step 3: Apply
  const result = applyCodeEdits(currentCode, parsed.edits);
  
  if (!result.success) {
    let errorMsg = `Error applying edits:\n\n`;
    result.errors.forEach((err, i) => {
      errorMsg += `${i + 1}. ${err}\n`;
    });
    
    return {
      success: false,
      edits: parsed,
      error: errorMsg,
      warnings: result.warnings
    };
  }
  
  // Step 4: Calculate diff stats
  const diffStats = getDiffStats(currentCode, result.code || '');
  
  return {
    success: true,
    edits: parsed,
    modifiedCode: result.code || '',
    diffStats,
    warnings: result.warnings
  };
}
```

#### 3.2 Create Code Editor Processing Thunk
**File:** `lib/redux/prompt-execution/thunks/processCodeEditorResponseThunk.ts`

```typescript
/**
 * Code Editor Response Processing Thunk
 * Processes AI response for code editor (parse, validate, apply)
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '../../store';
import { processCodeResponse, type ProcessedCodeResponse } from '../utils/codeEditorResponseUtils';

export const processCodeEditorResponse = createAsyncThunk<
  ProcessedCodeResponse,
  {
    runId: string;
    aiResponse: string;
    currentCode: string;
  },
  { dispatch: AppDispatch; state: RootState }
>(
  'promptExecution/processCodeEditorResponse',
  async ({ aiResponse, currentCode }) => {
    return processCodeResponse(aiResponse, currentCode);
  }
);
```

#### 3.3 Add Code Editor State to Slice
**File:** `lib/redux/prompt-execution/slice.ts`

```typescript
// Add to PromptExecutionState interface
export interface PromptExecutionState {
  // ... existing fields
  
  // Code editor specific state
  codeEditorState: {
    [runId: string]: {
      currentCode: string;
      processedResponse: ProcessedCodeResponse | null;
      state: 'input' | 'processing' | 'review' | 'applying' | 'complete' | 'error';
    };
  };
}

// Add reducers
setCodeEditorState: (
  state,
  action: PayloadAction<{
    runId: string;
    editorState: 'input' | 'processing' | 'review' | 'applying' | 'complete' | 'error';
  }>
) => {
  if (state.codeEditorState[runId]) {
    state.codeEditorState[runId].state = editorState;
  }
},

setCodeEditorProcessedResponse: (
  state,
  action: PayloadAction<{
    runId: string;
    response: ProcessedCodeResponse;
  }>
) => {
  if (state.codeEditorState[runId]) {
    state.codeEditorState[runId].processedResponse = response;
  }
},
```

---

### Phase 4: File Upload Centralization (MEDIUM PRIORITY)

#### 4.1 Create Upload Service
**File:** `lib/services/uploadService.ts`

```typescript
/**
 * Centralized Upload Service
 * Handles all file uploads with progress tracking
 */

import type { Resource } from '@/features/prompts/types/resource';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  bucket: string;
  path: string;
  onProgress?: (progress: UploadProgress) => void;
}

export class UploadService {
  async uploadFile(
    file: File,
    options: UploadOptions
  ): Promise<Resource> {
    // Implementation here
    // This would wrap your existing upload logic
    // but provide centralized progress tracking
    
    throw new Error('Not implemented');
  }
  
  async uploadMultipleFiles(
    files: File[],
    options: UploadOptions
  ): Promise<Resource[]> {
    return Promise.all(
      files.map(file => this.uploadFile(file, options))
    );
  }
}

export const uploadService = new UploadService();
```

#### 4.2 Create Upload Thunks with Progress
**File:** `lib/redux/prompt-execution/thunks/uploadThunks.ts`

```typescript
/**
 * Upload thunks with progress tracking
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '../../store';
import { addResource } from '../slice';
import { uploadService } from '@/lib/services/uploadService';

// Add upload progress to state
export const uploadFileWithProgress = createAsyncThunk<
  void,
  {
    runId: string;
    file: File;
    bucket: string;
    path: string;
  },
  { dispatch: AppDispatch; state: RootState }
>(
  'promptExecution/uploadFileWithProgress',
  async ({ runId, file, bucket, path }, { dispatch }) => {
    const resource = await uploadService.uploadFile(file, {
      bucket,
      path,
      onProgress: (progress) => {
        // Dispatch progress updates if needed
        // dispatch(setUploadProgress({ runId, fileId: file.name, progress }));
      }
    });
    
    dispatch(addResource({ runId, resource }));
  }
);
```

---

### Phase 5: Clipboard Integration (LOW PRIORITY)

#### 5.1 Create Clipboard Middleware
**File:** `lib/redux/middleware/clipboardMiddleware.ts`

```typescript
/**
 * Clipboard Middleware
 * Handles paste events globally and dispatches appropriate actions
 */

import type { Middleware } from '@reduxjs/toolkit';
import { uploadFileWithProgress } from '../prompt-execution/thunks/uploadThunks';

export const clipboardMiddleware: Middleware = store => next => action => {
  // Handle clipboard events
  // This allows centralized clipboard handling
  
  return next(action);
};
```

---

## 📋 Implementation Checklist

### Phase 1: Resources (Week 1)
- [ ] Create `resourceUtils.ts` with upload/serialization utilities
- [ ] Create `resourceThunks.ts` with upload thunks
- [ ] Update `executeMessageThunk.ts` to use Redux resources
- [ ] Refactor `AICodeEditorModal` to use Redux resources
- [ ] Create `PromptInputV2` component using Redux resources
- [ ] Test resource management end-to-end
- [ ] Update documentation

### Phase 2: Special Variables (Week 1)
- [ ] Create `specialVariablesThunk.ts`
- [ ] Update `startInstanceThunk.ts` to accept codeContext
- [ ] Refactor `useAICodeEditor` to use thunk
- [ ] Test special variable population
- [ ] Update documentation

### Phase 3: Response Processing (Week 2)
- [ ] Create `codeEditorResponseUtils.ts`
- [ ] Create `processCodeEditorResponseThunk.ts`
- [ ] Add code editor state to slice
- [ ] Refactor `useAICodeEditor` to use utilities
- [ ] Test response processing
- [ ] Update documentation

### Phase 4: File Upload (Week 2)
- [ ] Create `uploadService.ts`
- [ ] Create `uploadThunks.ts` with progress
- [ ] Integrate with resource management
- [ ] Test uploads with progress
- [ ] Update documentation

### Phase 5: Testing & Migration (Week 3)
- [ ] Write unit tests for all utilities
- [ ] Write integration tests for thunks
- [ ] Migrate all components to use Redux
- [ ] Remove duplicate logic from hooks
- [ ] Performance testing
- [ ] Update all documentation

---

## 🎨 New Component Architecture

### Before:
```
Component (manages resources, uploads, special vars)
  ↓
Hook (manages state, logic, effects)
  ↓
Redux (just data storage)
```

### After:
```
Component (dispatch actions, select state)
  ↓
Redux Thunks (business logic)
  ↓
Utilities (pure functions)
  ↓
Redux State (single source of truth)
```

---

## 🔄 Migration Strategy

### Option A: Gradual (Recommended)
1. Create new Redux utilities/thunks alongside existing code
2. Create `PromptInputV2` that uses Redux
3. Test thoroughly with new component
4. Gradually migrate old components
5. Remove old local state management

### Option B: Big Bang
1. Refactor everything at once
2. Higher risk but faster completion
3. Requires extensive testing before deployment

**Recommendation:** Option A - Gradual migration with feature flags

---

## 📊 Expected Benefits

### Performance
- ✅ Fewer re-renders (Redux already optimized)
- ✅ Better memoization opportunities
- ✅ Centralized state updates

### Developer Experience
- ✅ Easier to test (pure utilities)
- ✅ Easier to debug (Redux DevTools)
- ✅ Easier to extend (add new features to thunks)
- ✅ Better code reuse

### Maintainability
- ✅ Single source of truth
- ✅ Clear separation of concerns
- ✅ Less duplicate code
- ✅ Easier to onboard new developers

### Features Enabled
- ✅ Resource management from anywhere in app
- ✅ Upload progress tracking
- ✅ Undo/redo for resources
- ✅ Persistent draft state
- ✅ Multi-instance resource sharing

---

## 🚨 Potential Risks & Mitigation

### Risk 1: Performance Regression
**Mitigation:** 
- Keep input handling local (already doing this)
- Use proper memoization in selectors
- Profile before and after

### Risk 2: Increased Complexity
**Mitigation:**
- Clear documentation
- Consistent patterns
- Helper functions for common operations

### Risk 3: Breaking Changes
**Mitigation:**
- Gradual migration
- Feature flags
- Comprehensive testing
- Backward compatibility layer

---

## 📝 Notes

- This plan maintains the current `currentInputs[runId]` pattern for performance
- Components can still use local state for purely UI concerns (animation state, etc.)
- The goal is to move BUSINESS LOGIC to Redux, not ALL state
- Redux DevTools will make debugging much easier
- Time to First Token (TTFT) won't be affected by these changes

---

## 🎯 Success Metrics

1. **Code Reduction:** 30%+ reduction in component code
2. **Test Coverage:** 80%+ coverage for utilities/thunks
3. **Performance:** No regression in TTFT or render times
4. **Bug Reduction:** Fewer state sync issues
5. **Developer Velocity:** Faster feature development

---

## Next Steps

1. **Review this plan** with the team
2. **Prioritize phases** based on immediate needs
3. **Create detailed tickets** for Phase 1
4. **Set up feature flags** for gradual rollout
5. **Begin implementation** with Phase 1

