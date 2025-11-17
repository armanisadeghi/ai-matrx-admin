# Database Schema - What Needs to Be Added

## ✅ Existing Tables - NO CHANGES NEEDED

The Redux execution engine works with your **EXISTING** database:
- ✅ `prompts` - Already has everything needed
- ✅ `prompt_builtins` - System prompts
- ✅ `ai_runs` - Already has `variable_values`, `broker_values`, `messages`, etc.
- ✅ `ai_tasks` - Already has `task_id`, `run_id`, all metrics, etc.

**NO DATABASE CHANGES REQUIRED FOR CORE FUNCTIONALITY!**

---

## 🆕 Optional: Scoped Variables Feature

These tables enable automatic variable population ({{user_name}}, {{org_name}}, etc.)  
**This is OPTIONAL and can be added later if desired.**

### `user_variables` table (OPTIONAL)
**Purpose:** Store user-level automatic variables

**Schema:**
```sql
CREATE TABLE user_variables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, key)
);

CREATE INDEX idx_user_variables_user_id ON user_variables(user_id);
```

**Example Data:**
```sql
-- Auto-populated by system
INSERT INTO user_variables (user_id, key, value, description) VALUES
  ('user-uuid', 'user_name', 'John Doe', 'User full name'),
  ('user-uuid', 'user_email', 'john@example.com', 'User email'),
  ('user-uuid', 'user_timezone', 'America/New_York', 'User timezone'),
  ('user-uuid', 'user_locale', 'en-US', 'User locale');
```

**RLS Policy:**
```sql
ALTER TABLE user_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own variables"
  ON user_variables FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own variables"
  ON user_variables FOR UPDATE
  USING (auth.uid() = user_id);
```

**Status:** 🆕 **Optional - Only if you want this feature**

---

### `org_variables` table (OPTIONAL)
**Purpose:** Store organization-level variables

**Schema:**
```sql
CREATE TABLE org_variables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(org_id, key)
);

CREATE INDEX idx_org_variables_org_id ON org_variables(org_id);
```

**Example Data:**
```sql
INSERT INTO org_variables (org_id, key, value, description) VALUES
  ('org-uuid', 'org_name', 'Acme Corp', 'Organization name'),
  ('org-uuid', 'org_industry', 'Technology', 'Industry'),
  ('org-uuid', 'org_website', 'https://acme.com', 'Company website');
```

**RLS Policy:**
```sql
ALTER TABLE org_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view org variables"
  ON org_variables FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );
```

**Status:** 🆕 **Optional - Only if you want this feature**

---

### `project_variables` table (OPTIONAL)
**Purpose:** Store project-level variables

**Schema:**
```sql
CREATE TABLE project_variables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(project_id, key)
);

CREATE INDEX idx_project_variables_project_id ON project_variables(project_id);
```

**Example Data:**
```sql
INSERT INTO project_variables (project_id, key, value, description) VALUES
  ('proj-uuid', 'project_name', 'AI Assistant', 'Project name'),
  ('proj-uuid', 'project_code', 'AI-ASST', 'Project code'),
  ('proj-uuid', 'project_stage', 'development', 'Current stage');
```

**RLS Policy:**
```sql
ALTER TABLE project_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view project variables"
  ON project_variables FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM user_projects WHERE user_id = auth.uid()
    )
  );
```

**Status:** 🆕 **Optional - Only if you want this feature**

---

## 📝 Migration Scripts

### Create Scoped Variables Tables

```sql
-- Migration: create_scoped_variables_tables
-- Description: Add user/org/project variables for automatic prompt population

-- 1. User Variables
CREATE TABLE IF NOT EXISTS user_variables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_variables_user_id ON user_variables(user_id);

ALTER TABLE user_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own variables"
  ON user_variables FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own variables"
  ON user_variables FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. Org Variables (optional - only if org system exists)
-- CREATE TABLE IF NOT EXISTS org_variables (...);

-- 3. Project Variables (optional - only if project system exists)
-- CREATE TABLE IF NOT EXISTS project_variables (...);
```

---

## 🔄 Integration Points

### 1. Prompt Execution Flow

```
Component
  ↓
startPromptInstance thunk
  ↓
Fetch prompt from `prompts` table (if not cached)
  ↓
Fetch scoped variables from `user_variables`, `org_variables`, `project_variables`
  ↓
Create instance in Redux
  ↓
executeMessage thunk
  ↓
Create run in `ai_runs` table (if track_in_runs: true)
  ↓
Create task in `ai_tasks` table
  ↓
Submit to socket.io
  ↓
Stream response
  ↓
completeExecution thunk
  ↓
Update `ai_tasks` with final stats
Update `ai_runs` with messages
```

### 2. Variable Resolution Priority

```
1. Computed variables (current_date, etc.) - Highest priority
   ↓
2. User-provided variables (from UI)
   ↓
3. Project-scoped variables
   ↓
4. Org-scoped variables
   ↓
5. User-scoped variables
   ↓
6. Prompt defaults - Lowest priority
```

---

## ✅ Pre-Flight Checklist

Before deploying the prompt execution engine:

- [ ] Verify `prompts` table exists and has all required columns
- [ ] Verify `ai_runs` table exists and has all required columns
- [ ] Verify `ai_tasks` table exists and has all required columns
- [ ] Create `user_variables` table (run migration)
- [ ] (Optional) Create `org_variables` table if org system exists
- [ ] (Optional) Create `project_variables` table if project system exists
- [ ] Set up RLS policies for all new tables
- [ ] Create indexes for performance
- [ ] Test database permissions
- [ ] Populate initial user variables from user profile

---

## 🧪 Testing Queries

### Verify Prompt Cache Works
```sql
SELECT id, name, created_at 
FROM prompts 
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC 
LIMIT 10;
```

### Verify Run Tracking Works
```sql
SELECT r.id, r.name, r.total_tokens, r.total_cost, 
       COUNT(t.task_id) as task_count
FROM ai_runs r
LEFT JOIN ai_tasks t ON t.run_id = r.id
WHERE r.user_id = 'your-user-id'
GROUP BY r.id
ORDER BY r.created_at DESC 
LIMIT 10;
```

### Verify Scoped Variables Work
```sql
-- User variables
SELECT * FROM user_variables WHERE user_id = auth.uid();

-- Org variables (if table exists)
SELECT ov.* FROM org_variables ov
JOIN user_organizations uo ON uo.org_id = ov.org_id
WHERE uo.user_id = auth.uid();
```

---

## 🚨 Important Notes

1. **Cost Calculation**: The server should calculate actual cost in `ai_tasks` table based on model pricing. The Redux engine sets it to 0 initially.

2. **Message Storage**: Messages are stored in BOTH:
   - `ai_runs.messages` (JSONB array - full conversation)
   - Redis via socket.io (temporary streaming)

3. **Task Tracking**: Every message creates a new task. Use `run_id` to group tasks into conversations.

4. **Scoped Variables**: These are OPTIONAL. The system works without them, but they enable powerful auto-population features.

5. **Performance**: All fetches use indexes. Prompt cache lives in Redux (fetch once per session). Scoped variables cache in Redux (fetch once per session).

---

**All database integrations are properly designed and ready for implementation!** ✅

