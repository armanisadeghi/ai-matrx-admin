# Prompt Actions Implementation - Complete Task List

## 🎯 Goal
Implement context-aware prompt execution with broker integration, maintaining clean 2-layer architecture.

---

## ✅ PHASE 0: Foundation (COMPLETED)
- [x] Redux execution engine complete
- [x] Database schema verified
- [x] Broker system exists and functional
- [x] Migration SQL created

---

## 🚀 PHASE 1: Broker Resolution Service (3-4 hours)

### Task 1.1: Create Types (30 min)
**File:** `features/brokers/types/resolution.ts`

```typescript
export interface BrokerResolutionContext {
  userId?: string;
  organizationId?: string;
  workspaceId?: string;
  projectId?: string;
  taskId?: string;
  aiRunId?: string;
  aiTaskId?: string;
}

export interface ResolvedBrokerValue {
  brokerId: string;
  value: any;
  scopeLevel: string;
  scopeId: string | null;
}

export interface BrokerResolutionResult {
  values: Record<string, any>; // brokerId -> value
  metadata: {
    resolvedAt: string;
    context: BrokerResolutionContext;
    scopeLevels: Record<string, string>; // brokerId -> scope level
  };
}
```

**Verify:** No linter errors

---

### Task 1.2: Create Resolution Service (2 hours)
**File:** `features/brokers/services/resolution-service.ts`

```typescript
import { supabase } from '@/utils/supabase/client';
import type { 
  BrokerResolutionContext, 
  BrokerResolutionResult,
  ResolvedBrokerValue 
} from '../types/resolution';

/**
 * Resolves broker values for given context using database function
 * 
 * This calls the Postgres function that handles the hierarchy:
 * AI Task > AI Run > Task > Project > Workspace > Org > User > Global
 */
export async function resolveBrokersForContext(
  brokerIds: string[],
  context: BrokerResolutionContext
): Promise<BrokerResolutionResult> {
  if (!brokerIds.length) {
    return {
      values: {},
      metadata: {
        resolvedAt: new Date().toISOString(),
        context,
        scopeLevels: {},
      },
    };
  }

  const { data, error } = await supabase.rpc('get_broker_values_for_context', {
    p_broker_ids: brokerIds,
    p_user_id: context.userId || null,
    p_organization_id: context.organizationId || null,
    p_workspace_id: context.workspaceId || null,
    p_project_id: context.projectId || null,
    p_task_id: context.taskId || null,
    p_ai_runs_id: context.aiRunId || null,
    p_ai_tasks_id: context.aiTaskId || null,
  });

  if (error) {
    console.error('Failed to resolve brokers:', error);
    throw new Error(`Broker resolution failed: ${error.message}`);
  }

  // Transform result
  const values: Record<string, any> = {};
  const scopeLevels: Record<string, string> = {};

  (data as ResolvedBrokerValue[])?.forEach((item) => {
    values[item.brokerId] = item.value;
    scopeLevels[item.brokerId] = item.scopeLevel;
  });

  return {
    values,
    metadata: {
      resolvedAt: new Date().toISOString(),
      context,
      scopeLevels,
    },
  };
}

/**
 * Get missing broker IDs (those without values in context)
 */
export async function getMissingBrokerIds(
  brokerIds: string[],
  context: BrokerResolutionContext
): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_missing_broker_ids', {
    p_broker_ids: brokerIds,
    p_user_id: context.userId || null,
    p_organization_id: context.organizationId || null,
    p_workspace_id: context.workspaceId || null,
    p_project_id: context.projectId || null,
    p_task_id: context.taskId || null,
    p_ai_runs_id: context.aiRunId || null,
    p_ai_tasks_id: context.aiTaskId || null,
  });

  if (error) {
    console.error('Failed to get missing brokers:', error);
    return brokerIds; // Return all as missing on error
  }

  return data || [];
}
```

**Verify:** 
- No linter errors
- Types imported correctly
- Supabase client works

---

### Task 1.3: Test Resolution Service (1 hour)
**File:** `app/(authenticated)/ai/prompts/experimental/broker-test/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { resolveBrokersForContext } from '@/features/brokers/services/resolution-service';

export default function BrokerTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testResolution = async () => {
    setLoading(true);
    try {
      // Test with some broker IDs and context
      const result = await resolveBrokersForContext(
        ['broker-id-1', 'broker-id-2'], // Replace with real IDs
        {
          userId: 'current-user-id',
          workspaceId: 'workspace-id', // Optional
        }
      );
      setResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Broker Resolution Test</h1>
      <Button onClick={testResolution} disabled={loading}>
        Test Resolution
      </Button>
      {result && (
        <pre className="mt-4 p-4 bg-muted rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

**Verify:**
- Page loads without errors
- Button triggers resolution
- Results display correctly
- Check database function is called

---

## 🔧 PHASE 2: Prompt Actions Core (3-4 hours)

### Task 2.1: Run Database Migration (15 min)
1. Review `ACTIONS_MIGRATION.sql`
2. Run migration in Supabase dashboard
3. Verify tables created
4. Check RLS policies

**Verify:**
- `prompt_actions` table exists
- Indexes created
- Triggers working
- RLS policies active

---

### Task 2.2: Create Action Types (30 min)
**File:** `features/prompt-actions/types/index.ts`

```typescript
export interface PromptAction {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string | null;
  
  // References
  prompt_id: string | null;
  prompt_builtin_id: string | null;
  
  // Broker integration
  broker_mappings: Record<string, string>; // varName -> brokerId
  hardcoded_values: Record<string, string>; // varName -> value
  context_scopes: string[]; // ['workspace', 'project', etc.]
  
  // Execution
  execution_config: {
    auto_run: boolean;
    allow_chat: boolean;
    show_variables: boolean;
    apply_variables: boolean;
    result_display: string;
    track_in_runs: boolean;
  };
  
  // Metadata
  user_id: string | null;
  is_public: boolean;
  tags: string[];
  icon_name: string | null;
  is_active: boolean;
}

export interface CreateActionPayload {
  name: string;
  description?: string;
  prompt_id?: string;
  prompt_builtin_id?: string;
  broker_mappings?: Record<string, string>;
  hardcoded_values?: Record<string, string>;
  context_scopes?: string[];
  execution_config?: Partial<PromptAction['execution_config']>;
  tags?: string[];
  icon_name?: string;
  is_public?: boolean;
}

export interface ExecuteActionContext {
  userId: string;
  organizationId?: string;
  workspaceId?: string;
  projectId?: string;
  taskId?: string;
  aiRunId?: string;
  aiTaskId?: string;
}
```

**Verify:** No linter errors

---

### Task 2.3: Create Action Service (1.5 hours)
**File:** `features/prompt-actions/services/action-service.ts`

```typescript
import { supabase } from '@/utils/supabase/client';
import type { PromptAction, CreateActionPayload } from '../types';

export async function getAction(id: string): Promise<PromptAction | null> {
  const { data, error } = await supabase
    .from('prompt_actions')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Failed to get action:', error);
    return null;
  }

  return data;
}

export async function getUserActions(userId: string): Promise<PromptAction[]> {
  const { data, error } = await supabase
    .from('prompt_actions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Failed to get user actions:', error);
    return [];
  }

  return data || [];
}

export async function createAction(
  payload: CreateActionPayload,
  userId: string
): Promise<PromptAction | null> {
  const { data, error } = await supabase
    .from('prompt_actions')
    .insert({
      ...payload,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create action:', error);
    return null;
  }

  return data;
}

export async function updateAction(
  id: string,
  payload: Partial<CreateActionPayload>
): Promise<PromptAction | null> {
  const { data, error } = await supabase
    .from('prompt_actions')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update action:', error);
    return null;
  }

  return data;
}

export async function deleteAction(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('prompt_actions')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Failed to delete action:', error);
    return false;
  }

  return true;
}
```

**Verify:**
- No linter errors
- Types correct
- CRUD operations work

---

### Task 2.4: Cache Actions in Redux (1 hour)
**File:** `lib/redux/prompt-execution/slices/actionCacheSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../store';
import type { PromptAction } from '@/features/prompt-actions/types';

interface CachedAction extends PromptAction {
  fetchedAt: number;
  status: 'cached' | 'stale';
}

interface ActionCacheState {
  actions: {
    [actionId: string]: CachedAction;
  };
  fetchStatus: {
    [actionId: string]: 'idle' | 'loading' | 'success' | 'error';
  };
}

const initialState: ActionCacheState = {
  actions: {},
  fetchStatus: {},
};

const actionCacheSlice = createSlice({
  name: 'actionCache',
  initialState,
  reducers: {
    cacheAction: (state, action: PayloadAction<CachedAction>) => {
      const actionData = action.payload;
      state.actions[actionData.id] = actionData;
      state.fetchStatus[actionData.id] = 'success';
    },

    setFetchStatus: (
      state,
      action: PayloadAction<{ actionId: string; status: typeof initialState.fetchStatus[string] }>
    ) => {
      const { actionId, status } = action.payload;
      state.fetchStatus[actionId] = status;
    },

    removeAction: (state, action: PayloadAction<string>) => {
      const actionId = action.payload;
      delete state.actions[actionId];
      delete state.fetchStatus[actionId];
    },

    clearCache: (state) => {
      state.actions = {};
      state.fetchStatus = {};
    },
  },
});

// Selectors
export const selectCachedAction = (state: RootState, actionId: string) =>
  state.actionCache?.actions[actionId] || null;

export const selectIsActionCached = (state: RootState, actionId: string) =>
  !!state.actionCache?.actions[actionId];

export const selectActionFetchStatus = (state: RootState, actionId: string) =>
  state.actionCache?.fetchStatus[actionId] || 'idle';

export const {
  cacheAction,
  setFetchStatus,
  removeAction,
  clearCache,
} = actionCacheSlice.actions;

export default actionCacheSlice.reducer;
```

**Verify:**
- No linter errors
- Add to rootReducer: `actionCache: actionCacheReducer`

---

## 🎬 PHASE 3: Action Execution Thunk (3-4 hours)

### Task 3.1: Create Execution Thunk (2-3 hours)
**File:** `lib/redux/prompt-execution/thunks/startPromptActionThunk.ts`

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { RootState, AppDispatch } from '../../store';
import { startPromptInstance } from './startInstanceThunk';
import { getAction } from '@/features/prompt-actions/services/action-service';
import { resolveBrokersForContext } from '@/features/brokers/services/resolution-service';
import { cacheAction, selectCachedAction, selectActionFetchStatus, setFetchStatus } from '../slices/actionCacheSlice';
import { selectCachedPrompt } from '../../slices/promptCacheSlice';
import type { ExecuteActionContext } from '@/features/prompt-actions/types';

export interface StartActionPayload {
  actionId: string;
  context: ExecuteActionContext;
  userProvidedVariables?: Record<string, string>; // User input overrides
}

/**
 * Execute a prompt action with broker resolution
 * 
 * Flow:
 * 1. Load action (cache if possible)
 * 2. Load referenced prompt
 * 3. Resolve brokers for context
 * 4. Map broker values to variable names
 * 5. Apply hardcoded overrides
 * 6. Merge with user-provided values
 * 7. Execute via standard engine
 * 
 * Variable precedence:
 * User Input > Hardcoded > Broker > Prompt Default
 */
export const startPromptAction = createAsyncThunk<
  string, // Returns instanceId
  StartActionPayload,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>(
  'promptExecution/startAction',
  async (payload, { dispatch, getState }) => {
    const { actionId, context, userProvidedVariables = {} } = payload;

    try {
      // ========== STEP 1: Load Action ==========
      let state = getState();
      let action = selectCachedAction(state, actionId);

      if (!action) {
        const fetchStatus = selectActionFetchStatus(state, actionId);
        if (fetchStatus === 'loading') {
          throw new Error('Action is already being fetched');
        }

        dispatch(setFetchStatus({ actionId, status: 'loading' }));

        const actionData = await getAction(actionId);
        if (!actionData) {
          dispatch(setFetchStatus({ actionId, status: 'error' }));
          throw new Error(`Action not found: ${actionId}`);
        }

        dispatch(cacheAction({
          ...actionData,
          fetchedAt: Date.now(),
          status: 'cached',
        }));

        action = actionData;
      }

      // ========== STEP 2: Get Prompt ==========
      const promptId = action.prompt_id || action.prompt_builtin_id;
      if (!promptId) {
        throw new Error('Action has no prompt reference');
      }

      state = getState();
      const prompt = selectCachedPrompt(state, promptId);
      if (!prompt) {
        throw new Error(`Prompt not found: ${promptId}`);
      }

      // ========== STEP 3: Resolve Brokers ==========
      const brokerIds = Object.values(action.broker_mappings);
      let brokerValues: Record<string, any> = {};

      if (brokerIds.length > 0) {
        console.log('🔍 Resolving brokers for action:', action.name);
        const resolution = await resolveBrokersForContext(brokerIds, {
          userId: context.userId,
          organizationId: context.organizationId,
          workspaceId: context.workspaceId,
          projectId: context.projectId,
          taskId: context.taskId,
          aiRunId: context.aiRunId,
          aiTaskId: context.aiTaskId,
        });

        brokerValues = resolution.values;
        console.log('✅ Resolved brokers:', Object.keys(brokerValues).length);
      }

      // ========== STEP 4: Map Brokers to Variables ==========
      const resolvedVariables: Record<string, string> = {};
      Object.entries(action.broker_mappings).forEach(([varName, brokerId]) => {
        if (brokerValues[brokerId]) {
          resolvedVariables[varName] = String(brokerValues[brokerId]);
        }
      });

      // ========== STEP 5: Build Final Variables ==========
      // Precedence: User Input > Hardcoded > Broker > (Prompt Default handled in engine)
      const finalVariables = {
        ...resolvedVariables,        // From brokers (lowest)
        ...action.hardcoded_values,  // From action config (medium)
        ...userProvidedVariables,    // From user input (highest)
      };

      console.log('🎯 Final variables:', Object.keys(finalVariables));

      // ========== STEP 6: Execute via Standard Engine ==========
      const instanceId = await dispatch(
        startPromptInstance({
          promptId,
          variables: finalVariables,
          executionConfig: {
            auto_run: action.execution_config.auto_run,
            allow_chat: action.execution_config.allow_chat,
            show_variables: action.execution_config.show_variables,
            apply_variables: action.execution_config.apply_variables,
            track_in_runs: action.execution_config.track_in_runs,
          },
        })
      ).unwrap();

      console.log('✅ Action executed:', {
        actionId,
        instanceId,
        variableCount: Object.keys(finalVariables).length,
      });

      return instanceId;
    } catch (error) {
      console.error('❌ Failed to execute action:', error);
      throw error;
    }
  }
);
```

**Verify:**
- No linter errors
- Types imported correctly
- Logic follows spec

---

### Task 3.2: Export from Index (5 min)
**File:** `lib/redux/prompt-execution/index.ts`

Add:
```typescript
export { startPromptAction } from './thunks/startPromptActionThunk';
export type { StartActionPayload } from './thunks/startPromptActionThunk';
```

**Verify:** No linter errors

---

### Task 3.3: Create Test Page (1 hour)
**File:** `app/(authenticated)/ai/prompts/experimental/action-test/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useAppDispatch } from '@/lib/redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { startPromptAction } from '@/lib/redux/prompt-execution';
import { usePromptInstance } from '@/lib/redux/prompt-execution/hooks';

export default function ActionTestPage() {
  const dispatch = useAppDispatch();
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [actionId, setActionId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);

  const { displayMessages, instance } = usePromptInstance(instanceId);

  const executeAction = async () => {
    if (!actionId) return;

    setLoading(true);
    try {
      const id = await dispatch(
        startPromptAction({
          actionId,
          context: {
            userId: 'current-user-id', // Get from auth
            workspaceId: workspaceId || undefined,
            projectId: projectId || undefined,
          },
        })
      ).unwrap();

      setInstanceId(id);
    } catch (err) {
      console.error('Failed to execute action:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Prompt Action Test</h1>

      <div className="space-y-4 mb-6">
        <div>
          <Label>Action ID</Label>
          <Input
            value={actionId}
            onChange={(e) => setActionId(e.target.value)}
            placeholder="Enter action UUID"
          />
        </div>

        <div>
          <Label>Workspace ID (optional)</Label>
          <Input
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            placeholder="For broker resolution"
          />
        </div>

        <div>
          <Label>Project ID (optional)</Label>
          <Input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="For broker resolution"
          />
        </div>

        <Button onClick={executeAction} disabled={loading || !actionId}>
          {loading ? 'Executing...' : 'Execute Action'}
        </Button>
      </div>

      {instance && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">Execution Result</h2>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded">
              <p><strong>Status:</strong> {instance.status}</p>
              <p><strong>Variables:</strong> {JSON.stringify(instance.variables.userValues)}</p>
            </div>

            {displayMessages.map((msg, idx) => (
              <div key={idx} className="p-4 bg-card rounded">
                <p className="font-bold">{msg.role}</p>
                <p>{msg.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Verify:**
- Page loads without errors
- Can input action ID and context
- Executes action
- Shows result

---

## 📊 PHASE 4: Integration & Polish (2-3 hours)

### Task 4.1: Add to Root Reducer (5 min)
**File:** `lib/redux/rootReducer.ts`

Add:
```typescript
import actionCacheReducer from './prompt-execution/slices/actionCacheSlice';

// In combineReducers:
actionCache: actionCacheReducer,
```

**Verify:** No linter errors, app starts

---

### Task 4.2: Create Action Hook (30 min)
**File:** `features/prompt-actions/hooks/usePromptAction.ts`

```typescript
import { useCallback } from 'react';
import { useAppDispatch } from '@/lib/redux';
import { startPromptAction, type StartActionPayload } from '@/lib/redux/prompt-execution';

export function usePromptAction() {
  const dispatch = useAppDispatch();

  const executeAction = useCallback(
    async (payload: StartActionPayload) => {
      return await dispatch(startPromptAction(payload)).unwrap();
    },
    [dispatch]
  );

  return {
    executeAction,
  };
}
```

---

### Task 4.3: Update Types Export (5 min)
**File:** `lib/redux/prompt-execution/index.ts`

Ensure all action-related exports are present.

---

### Task 4.4: Comprehensive Testing (1-2 hours)

**Test Checklist:**
- [ ] Create test action in database
- [ ] Create test brokers with values
- [ ] Execute action with workspace context
- [ ] Verify broker resolution works
- [ ] Verify hardcoded values override brokers
- [ ] Verify user input overrides hardcoded
- [ ] Check Redux DevTools shows correct flow
- [ ] Verify run created in database
- [ ] Check variables stored correctly

---

## 🎯 SUCCESS CRITERIA

- [ ] All files have zero linter errors
- [ ] Action execution works end-to-end
- [ ] Broker resolution works correctly
- [ ] Variable precedence correct: User > Hardcoded > Broker > Default
- [ ] Actions cached in Redux
- [ ] Prompts still work without actions (no breaking changes)
- [ ] Test pages work and demonstrate functionality
- [ ] Database migration runs successfully
- [ ] RLS policies secure data properly

---

## 📝 ONGOING CHECKLIST (Throughout Implementation)

After EACH task:
- [ ] Run `read_lints` on edited files
- [ ] Fix any linter errors immediately
- [ ] Test in browser (hot reload)
- [ ] Check Redux DevTools
- [ ] Console.log for debugging (remove before commit)
- [ ] Update this checklist

---

## ⏭️ FUTURE PHASES (After Testing)

### Phase 5: UI Components
- Action builder/editor
- Action selector component
- Context provider component
- Variable input with broker awareness

### Phase 6: Shortcuts Integration
- Update shortcuts to support action_id
- Action execution from shortcuts
- Context menu integration

### Phase 7: Advanced Features
- Action templates
- Action sharing
- Action versioning
- Analytics

---

**Ready to start? Begin with Phase 1, Task 1.1!**

