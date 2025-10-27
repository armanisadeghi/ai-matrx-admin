# AI Runs - Save Flow Explained

## 🔄 What Triggers Saves & When

### The Complete Flow (Step by Step)

#### 1. User Sends First Message

**What Happens:**
```typescript
// In PromptRunner.tsx -> handleSendTestMessage()

1. Check: Is this the first message?
2. If YES → Create run in database
   - Auto-generate name from message content
   - Save variable values
   - Save model settings
   - Returns run object immediately
   
3. Use the RETURNED run (not state) to create task
4. Create task record in database
   - Links to run via run_id
   - Task ID matches socket.io taskId
   - Saves request data
   
5. Add user message to run.messages array
   - Saves to database immediately
   
6. Submit task to socket.io
```

**Console Output:**
```
✅ Run created: {run-id} - {auto-generated-name}
✅ Task created: {task-id}
✅ User message added to run
```

**Database Changes:**
```sql
-- New record in ai_runs
INSERT INTO ai_runs (name, messages, settings, variable_values, ...)
VALUES ('Your message preview...', [user_message], {...}, {...}, ...);

-- New record in ai_tasks
INSERT INTO ai_tasks (task_id, run_id, service, request_data, ...)
VALUES ('{uuid}', '{run-id}', 'chat_service', {...}, ...);
```

#### 2. AI Streams Response

**What Happens:**
```typescript
// Debounced updates every 500ms

1. Task status → 'streaming'
2. response_text field updates with accumulated text
```

**Database Changes:**
```sql
-- Update task with streaming text (debounced)
UPDATE ai_tasks 
SET response_text = '{accumulated-text}',
    status = 'streaming'
WHERE task_id = '{task-id}';
```

#### 3. Response Completes

**What Happens:**
```typescript
// In useEffect watching isResponseEnded

1. Calculate final stats (tokens, timing, cost)
2. Complete the task
   - Status → 'completed'
   - Save final response_text
   - Save tokens_total, cost, timing
   
3. DATABASE TRIGGER FIRES AUTOMATICALLY:
   - ai_runs.task_count += 1
   - ai_runs.total_tokens += task.tokens_total
   - ai_runs.total_cost += task.cost
   - ai_runs.last_message_at = NOW()
   
4. Add assistant message to run.messages array
```

**Console Output:**
```
✅ Task completed: {task-id}
✅ Assistant message added to run
```

**Database Changes:**
```sql
-- Complete the task
UPDATE ai_tasks 
SET status = 'completed',
    response_text = '{final-text}',
    tokens_total = 1234,
    cost = 0.0123,
    time_to_first_token = 500,
    total_time = 2000,
    completed_at = NOW()
WHERE task_id = '{task-id}';

-- Trigger automatically updates run
UPDATE ai_runs
SET task_count = task_count + 1,
    total_tokens = total_tokens + 1234,
    total_cost = total_cost + 0.0123,
    last_message_at = NOW(),
    updated_at = NOW()
WHERE id = '{run-id}';

-- Add assistant message
UPDATE ai_runs
SET messages = messages || '[{assistant_message}]'::jsonb
WHERE id = '{run-id}';
```

#### 4. User Sends Follow-up Message

**What Happens:**
```typescript
// Same flow as step 1, but:

1. Run already exists (skip creation)
2. Create new task
3. Add user message to run
4. Submit to socket
5. Wait for completion
6. Complete task → trigger fires → aggregates update
7. Add assistant message
```

---

## 🐛 What Was Wrong Before

### The Bug
```typescript
// BEFORE (broken):
if (isFirstMessage && !run) {
    await createRun({...});  // ← Creates run, updates state
}

// ...later in code...
if (run) {  // ← State hasn't updated yet! run is still null
    await createTask({...});  // ← Never executes!
    await addMessage({...});  // ← Never executes!
}
```

### The Fix
```typescript
// AFTER (working):
let currentRun = run;
if (isFirstMessage && !run) {
    currentRun = await createRun({...});  // ← Get returned value
}

// ...later in code...
if (currentRun) {  // ← Uses the fresh value, not stale state
    await createTask({...});  // ← Executes!
    await addMessage({...});  // ← Executes!
}
```

**The Issue:** React state updates are asynchronous. When we call `createRun()`, it updates the `run` state in the hook, but that change doesn't propagate immediately. By using the return value directly (`currentRun`), we bypass the state update delay.

---

## ✅ How to Verify It's Working

### 1. Check Browser Console

After sending a message, you should see:
```
✅ Run created: b12c821e-b643-4cf8-8bf8-68291264dfb4 - I want to become an nba basketball player
✅ Task created: a7f3b2c1-...
✅ User message added to run
✅ Task completed: a7f3b2c1-...
✅ Assistant message added to run
```

**If you see:**
- `⚠️ No run available to create task` → Run creation failed
- `❌ Error creating task` → Task creation failed
- `❌ Error completing task` → Task completion failed

### 2. Check Database - ai_runs Table

```sql
SELECT 
  id,
  name,
  message_count,  -- Should be > 0
  task_count,     -- Should be > 0
  total_tokens,   -- Should be > 0
  total_cost,
  messages,       -- Should have array of messages
  created_at
FROM ai_runs
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result:**
```json
{
  "id": "b12c821e-...",
  "name": "I want to become an nba basketball player",
  "message_count": 2,  // ← Should be 2+ (user + assistant)
  "task_count": 1,     // ← Should be 1+
  "total_tokens": 150, // ← Should be > 0
  "total_cost": 0.001, // ← Should be > 0
  "messages": [        // ← Should have messages!
    {
      "role": "user",
      "content": "I want to become an nba basketball player",
      "timestamp": "2025-10-27T20:23:48.329Z"
    },
    {
      "role": "assistant",
      "content": "That's an ambitious goal! Here's what you need...",
      "taskId": "a7f3b2c1-...",
      "timestamp": "2025-10-27T20:23:52.847Z",
      "metadata": {
        "tokens": 150,
        "cost": 0.001,
        "timeToFirstToken": 500,
        "totalTime": 2000
      }
    }
  ]
}
```

### 3. Check Database - ai_tasks Table

```sql
SELECT 
  task_id,
  run_id,
  service,
  task_name,
  model,
  status,           -- Should be 'completed'
  response_text,    -- Should have the AI response
  tokens_total,     -- Should be > 0
  cost,             -- Should be > 0
  time_to_first_token,
  total_time,
  created_at
FROM ai_tasks
WHERE run_id = '{your-run-id}'
ORDER BY created_at DESC;
```

**Expected Result:**
```json
{
  "task_id": "a7f3b2c1-...",
  "run_id": "b12c821e-...",
  "service": "chat_service",
  "task_name": "direct_chat",
  "model": "gpt-4o",
  "status": "completed",  // ← Should be completed
  "response_text": "That's an ambitious goal...",  // ← Should have text
  "tokens_total": 150,  // ← Should be > 0
  "cost": 0.001,        // ← Should be calculated
  "time_to_first_token": 500,
  "total_time": 2000
}
```

### 4. Verify Aggregations Match

```sql
-- Get run totals
SELECT 
  id,
  task_count,
  total_tokens,
  total_cost
FROM ai_runs 
WHERE id = '{your-run-id}';

-- Get sum from tasks
SELECT 
  run_id,
  COUNT(*) as task_count,
  SUM(tokens_total) as total_tokens,
  SUM(cost) as total_cost
FROM ai_tasks 
WHERE run_id = '{your-run-id}'
GROUP BY run_id;
```

**The numbers should match!** If they don't, the trigger isn't firing correctly.

---

## 🔍 Debugging Guide

### Problem: Messages Array is Empty

**Symptoms:**
```json
{
  "messages": [],  // ← Empty!
  "message_count": 0
}
```

**Check:**
1. Look for `✅ User message added to run` in console
2. Look for `✅ Assistant message added to run` in console
3. If missing, look for error messages

**Possible Causes:**
- `addMessage()` is failing silently
- RLS policy preventing updates
- User not authenticated
- Run doesn't exist

**Debug SQL:**
```sql
-- Try manually adding a message
UPDATE ai_runs
SET messages = '[{"role":"test","content":"test","timestamp":"2025-10-27T20:00:00.000Z"}]'::jsonb
WHERE id = '{your-run-id}';

-- If this fails, it's an RLS or permissions issue
```

### Problem: Counts Are Zero

**Symptoms:**
```json
{
  "task_count": 0,
  "total_tokens": 0,
  "total_cost": 0,
  "message_count": 0
}
```

**Check:**
1. Are tasks being created? Check `ai_tasks` table
2. Are tasks completing? Check `status` field
3. Is the trigger firing? Check database logs

**Debug:**
```sql
-- Check if tasks exist
SELECT COUNT(*) FROM ai_tasks WHERE run_id = '{your-run-id}';

-- Check task status
SELECT status, COUNT(*) 
FROM ai_tasks 
WHERE run_id = '{your-run-id}'
GROUP BY status;

-- Manually trigger aggregation
UPDATE ai_tasks 
SET status = status  -- No-op update to fire trigger
WHERE run_id = '{your-run-id}' AND status = 'completed';
```

### Problem: Task Creation Fails

**Symptoms:**
```
❌ Error creating task or adding message: ...
```

**Common Causes:**
1. **Foreign key violation** - run_id doesn't exist
2. **Duplicate task_id** - UUID collision (very rare)
3. **RLS policy** - User doesn't have permission
4. **Missing fields** - Required field is null

**Debug:**
```sql
-- Check if run exists
SELECT id FROM ai_runs WHERE id = '{run-id}';

-- Check if task_id already exists
SELECT task_id FROM ai_tasks WHERE task_id = '{task-id}';

-- Try creating manually
INSERT INTO ai_tasks (run_id, user_id, task_id, service, task_name, request_data)
VALUES ('{run-id}', auth.uid(), gen_random_uuid(), 'chat_service', 'direct_chat', '{}'::jsonb);
```

---

## 📝 Summary of Save Operations

### What Gets Saved & When

| Operation | When | What | Where |
|-----------|------|------|-------|
| **Create Run** | First message | name, settings, variables | `ai_runs` table |
| **Create Task** | Before socket submit | task_id, request_data | `ai_tasks` table |
| **Add User Message** | After task created | user message object | `ai_runs.messages` |
| **Update Task (streaming)** | Every 500ms | response_text, status | `ai_tasks.response_text` |
| **Complete Task** | Response ends | final text, tokens, cost | `ai_tasks.status = completed` |
| **Update Aggregates** | Task completes | counts, totals | `ai_runs` (via trigger) |
| **Add Assistant Message** | After completion | assistant message | `ai_runs.messages` |

### Database Triggers (Automatic)

1. **update_ai_runs_updated_at** - Updates `updated_at` on every change
2. **update_ai_tasks_updated_at** - Updates `updated_at` and sets `completed_at`
3. **update_run_aggregates_from_task** - Adds tokens/cost/counts when task completes
4. **update_ai_runs_message_count** - Updates `message_count` when messages change

### Key Points

✅ Run is created **before** task  
✅ Task is created **before** socket submission  
✅ User message is added **immediately** after task creation  
✅ Task updates **during streaming** (debounced)  
✅ Task completes **after response ends**  
✅ Aggregates update **automatically via trigger**  
✅ Assistant message added **after task completion**  

---

## 🎯 Expected Console Output

**Perfect run:**
```
✅ Run created: abc123... - User's first message
✅ Task created: def456...
✅ User message added to run
[... streaming happens ...]
✅ Task completed: def456...
✅ Assistant message added to run
```

**Any deviation from this indicates a problem!**

---

## 🚀 After the Fix

With the fixes I just applied:

1. ✅ Run is captured immediately (return value, not state)
2. ✅ Task is created with valid run_id
3. ✅ Messages are added to the array
4. ✅ Console logging shows exactly what's happening
5. ✅ Better error handling with try-catch blocks
6. ✅ Warnings for missing runs

**Try it now:**
1. Open browser console
2. Run a prompt
3. Send a message
4. Watch for the ✅ checkmarks
5. Check database for complete data

**It should all work now!** 🎉

