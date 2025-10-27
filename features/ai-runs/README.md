# AI Runs Feature

Universal tracking system for ALL AI interactions across the application.

## Overview

This feature provides a complete tracking solution for AI-powered conversations at two levels:

1. **Runs** (ai_runs table) - Conversation/session level
2. **Tasks** (ai_tasks table) - Individual request/response level

## Supported Source Types

- **Prompts** - Template-based AI interactions
- **Chat** - Free-form conversations
- **Applets** - Automated AI workflows
- **Cockpit** - Advanced prompt management
- **Workflows** - Multi-step AI processes
- **Custom** - Any custom AI integration

## Architecture

### Database Tables

- `ai_runs` - Stores conversations with messages, settings, variables
- `ai_tasks` - Stores individual requests with full socket.io response data

### Automatic Features

- ✅ Timestamps auto-updated by database triggers
- ✅ Usage aggregation (tokens, cost) calculated automatically
- ✅ Message count tracked automatically
- ✅ Task completion triggers run updates

### Key Features

- **Complete Tracking**: Every message, every response, every token
- **Cost Tracking**: Provider, endpoint, model stored per task
- **Performance Metrics**: TTFT, total time, token counts
- **Socket.io Integration**: Task IDs map directly to socket events
- **Variable Support**: Both variables and broker values
- **Attachments**: Files, URLs, images, YouTube videos
- **Organization**: Tags, starring, status management

## Usage

### Creating a Run

```typescript
import { useAiRun } from '@/features/ai-runs/hooks/useAiRun';

const { createRun } = useAiRun();

const run = await createRun({
  source_type: 'prompt',
  source_id: promptId,
  name: 'My Conversation',
  settings: { model_id, temperature, ... },
  variable_values: { topic: 'AI', ... },
  broker_values: { currentDate: '2025-10-27', ... }
});
```

### Tracking Tasks

```typescript
const { createTask, updateTask, completeTask } = useAiRun(runId);

// Before submitting to socket.io
const taskId = uuidv4();
await createTask({
  task_id: taskId,
  service: 'chat_service',
  task_name: 'direct_chat',
  provider: 'openai',
  model: 'gpt-4o',
  request_data: {...}
});

// During streaming (debounced)
await updateTask(taskId, {
  response_text: streamingText,
  status: 'streaming'
});

// When complete
await completeTask(taskId, {
  response_text: finalText,
  tokens_total: tokens,
  cost: calculatedCost,
  total_time: time
});
```

### Listing Runs

```typescript
import { useAiRunsList } from '@/features/ai-runs/hooks/useAiRunsList';

const { runs, loadMore, setFilters } = useAiRunsList({
  source_type: 'prompt',
  status: 'active',
  limit: 20
});
```

## File Structure

```
features/ai-runs/
  README.md                    # This file
  types/
    index.ts                   # TypeScript definitions
  services/
    ai-runs-service.ts         # CRUD for runs
    ai-tasks-service.ts        # CRUD for tasks
  hooks/
    useAiRun.ts               # Main hook for runs & tasks
    useAiRunsList.ts          # List/filter runs
  components/
    RunsList.tsx              # List component
    RunItem.tsx               # Single run display
    RunsEmptyState.tsx        # Empty state
  utils/
    name-generator.ts         # Auto-generate names
    cost-calculator.ts        # Calculate costs
    run-helpers.ts            # Helper functions
```

## Implementation Status

### ✅ Phase 1: Foundation (Current)
- [x] Database schema created
- [x] TypeScript types defined
- [ ] Service layer (ai-runs-service, ai-tasks-service)
- [ ] Server actions (ai-runs.actions, ai-tasks.actions)
- [ ] React hooks (useAiRun, useAiRunsList)

### 🔄 Phase 2: Prompt Runner Integration
- [ ] Track runs in PromptRunner
- [ ] Create/update run on messages
- [ ] Track tasks per request
- [ ] Update during streaming
- [ ] Complete tasks properly

### 📋 Phase 3: UI Components
- [ ] RunsList for sidebar
- [ ] Run history view
- [ ] Resume conversations
- [ ] Run management (rename, delete, star)

### 🚀 Phase 4: Expand
- [ ] Integrate with Chat
- [ ] Integrate with Applets
- [ ] Integrate with Cockpit

### 📊 Phase 5: Analytics
- [ ] Usage dashboard
- [ ] Cost tracking
- [ ] Performance monitoring

## Design Principles

1. **No Breaking Changes** - Feature is standalone, existing code unaffected
2. **Simple & Direct** - Database does the work, app just reads/writes
3. **Automatic** - Triggers handle aggregation, timestamps, counts
4. **Universal** - Works for any AI interaction type
5. **Complete** - Every detail captured for full reproducibility

## Key Benefits

- **Cost Tracking**: Know exactly what each conversation costs
- **Performance**: Optimize based on TTFT and total time metrics
- **Reproducibility**: Full request/response history
- **Analytics**: Understand usage patterns
- **Debugging**: Complete trace of all interactions
- **Compliance**: Audit trail of all AI usage

## Database Triggers

The database automatically handles:

1. **updated_at** - Updates on every change
2. **completed_at** - Set when task status = 'completed'
3. **message_count** - Counts messages array length
4. **task_count, total_tokens, total_cost** - Aggregated from tasks
5. **last_message_at** - Updated when tasks complete

## Notes

- Task IDs must match socket.io task IDs exactly
- Cost calculation can be done asynchronously if needed
- Provider + Model tracked per task for accurate cost calculation
- Separate columns for variables and broker values
- All JSONB fields for flexibility
- RLS policies allow permission-based sharing

## Future Enhancements

- Real-time collaboration
- Run branching (fork conversations)
- A/B testing framework
- Automated evaluation
- Export for fine-tuning
- Template creation from runs
- Cost forecasting

