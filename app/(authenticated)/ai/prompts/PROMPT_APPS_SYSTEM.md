# Prompt Apps System
## Public Shareable AI-Powered Mini-Apps with Custom UIs

---

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Execution Flow](#execution-flow)
5. [Security & Rate Limiting](#security--rate-limiting)
6. [Component Guidelines](#component-guidelines)
7. [API Reference](#api-reference)
8. [Implementation Examples](#implementation-examples)

---

## Overview

**Prompt Apps** allow users to turn their AI prompts into shareable public web applications with custom UIs. Users can create beautiful, branded experiences that anyone can access without authentication (with smart rate limiting to prevent abuse and encourage signups).

### Key Features

✅ **Custom UI Generation** - AI (Claude Sonnet) generates React components based on user requirements  
✅ **Public URLs** - Each app gets `aimatrx.com/p/{slug}`  
✅ **No Auth Required** - Initial access is free to maximize reach  
✅ **Smart Rate Limiting** - IP/fingerprint-based limits with account upgrade path  
✅ **Real-time Streaming** - Socket.IO streaming with Redux state management  
✅ **Prompt Privacy** - Prompt details stay private, only UI is public  
✅ **Usage Analytics** - Track executions, errors, costs, and user behavior  
✅ **Sandboxed Execution** - Secure component rendering with allowlisted imports  

---

## System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER CREATES PROMPT APP                                      │
│    - Creates prompt (private)                                    │
│    - AI generates custom UI component                            │
│    - Publishes to public URL                                     │
└───────────────────┬─────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│ 2. PUBLIC USER VISITS APP                                        │
│    - No login required                                           │
│    - Custom UI renders (sandboxed)                               │
│    - Fills in form/interacts with UI                             │
│    - Clicks "Generate" or similar                                │
└───────────────────┬─────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│ 3. EXECUTION REQUEST                                             │
│    POST /api/public/apps/{slug}/execute                          │
│    Body: { variables: {...}, fingerprint: "..." }               │
│    - Rate limit check (IP/fingerprint)                           │
│    - Variable validation                                         │
│    - Fetch prompt (private, server-side only)                    │
│    - Resolve variables in messages                               │
│    - Generate task_id                                            │
│    - Return: { task_id, chat_config, rate_limit }               │
└───────────────────┬─────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│ 4. CLIENT SUBMITS TO SOCKET.IO                                   │
│    dispatch(createAndSubmitTask({                                │
│      service: "chat_service",                                    │
│      taskName: "direct_chat",                                    │
│      taskData: { chat_config },                                  │
│      customTaskId: task_id                                       │
│    }))                                                           │
└───────────────────┬─────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│ 5. PYTHON BACKEND STREAMS RESPONSE                               │
│    - LLM generates response                                      │
│    - Streams chunks via Socket.IO                                │
│    - Redux accumulates text                                      │
│    - Component displays real-time                                │
└───────────────────┬─────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│ 6. ANALYTICS & TRACKING                                          │
│    - Execution recorded in database                              │
│    - Usage stats updated                                         │
│    - Errors tracked                                              │
│    - Rate limits enforced                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Database**: Supabase (PostgreSQL) - Stores apps, executions, errors, rate limits
2. **State Management**: Redux - Handles Socket.IO responses and streaming
3. **Real-time**: Socket.IO - Python backend to Next.js frontend
4. **Component Rendering**: Babel transformation + sandboxed execution
5. **AI Generation**: Claude Sonnet generates UI components following strict guidelines

---

## Database Schema

### Core Tables

#### `prompt_apps`

Main table storing published apps:

```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- prompt_id: UUID (FK → prompts) -- Private, never exposed
- slug: TEXT UNIQUE -- URL: aimatrx.com/p/{slug}
- name: TEXT
- tagline: TEXT
- description: TEXT
- category: TEXT
- tags: TEXT[]
- preview_image_url: TEXT
- component_code: TEXT -- React/JSX as string
- component_language: TEXT -- 'react' | 'html'
- variable_schema: JSONB -- [{name, type, required, default}]
- allowed_imports: JSONB -- ["react", "lucide-react", "@/components/ui/button"]
- layout_config: JSONB
- styling_config: JSONB
- status: TEXT -- 'draft' | 'published' | 'archived' | 'suspended'
- is_verified: BOOLEAN
- is_featured: BOOLEAN
- rate_limit_per_ip: INTEGER -- Default: 5
- rate_limit_window_hours: INTEGER -- Default: 24
- rate_limit_authenticated: INTEGER -- Default: 100
- total_executions: INTEGER
- unique_users_count: INTEGER
- success_rate: DECIMAL(5,2)
- avg_execution_time_ms: INTEGER
- total_tokens_used: INTEGER
- total_cost: DECIMAL(10,4)
- created_at, updated_at, published_at, last_execution_at
```

#### `prompt_app_executions`

Track every execution (anonymous + authenticated):

```sql
- id: UUID (PK)
- app_id: UUID (FK → prompt_apps)
- user_id: UUID (FK → auth.users, NULL for anonymous)
- fingerprint: TEXT -- Browser fingerprint
- ip_address: INET
- user_agent: TEXT
- task_id: UUID -- Socket.IO task ID
- variables_provided: JSONB -- What UI sent
- variables_used: JSONB -- After validation/defaults
- success: BOOLEAN
- error_type: TEXT
- error_message: TEXT
- execution_time_ms: INTEGER
- tokens_used: INTEGER
- cost: DECIMAL(10,6)
- referer: TEXT
- metadata: JSONB
- created_at
```

#### `prompt_app_errors`

Debug and monitor app health:

```sql
- id: UUID (PK)
- app_id: UUID (FK → prompt_apps)
- execution_id: UUID (FK → prompt_app_executions)
- error_type: TEXT -- 'missing_variable', 'invalid_variable_type', etc.
- error_message: TEXT
- error_details: JSONB
- variables_sent: JSONB
- expected_variables: JSONB
- resolved: BOOLEAN
- resolved_at, resolved_by, resolution_notes
- created_at
```

#### `prompt_app_rate_limits`

Enforce usage limits:

```sql
- id: UUID (PK)
- app_id: UUID (FK → prompt_apps)
- user_id: UUID (FK → auth.users) -- For authenticated
- fingerprint: TEXT -- For anonymous
- ip_address: INET -- Fallback
- execution_count: INTEGER
- first_execution_at, last_execution_at, window_start_at
- is_blocked: BOOLEAN
- blocked_until, blocked_reason
- created_at, updated_at
```

#### `prompt_app_categories`

Reference table for categories:

```sql
- id: TEXT (PK) -- 'productivity', 'creative', 'education', etc.
- name: TEXT
- description: TEXT
- icon: TEXT -- Lucide icon name
- sort_order: INTEGER
```

### Views

#### `prompt_app_analytics`

Aggregated metrics for each app:

```sql
- app_id, slug, name, creator_id, status
- total_executions
- executions_24h, executions_7d, executions_30d
- unique_anonymous_users, unique_authenticated_users
- successful_executions, failed_executions, success_rate_percent
- avg_execution_time_ms, median_execution_time_ms, p95_execution_time_ms
- total_tokens, total_cost, avg_cost_per_execution
- first_execution_at, last_execution_at
```

---

## Execution Flow

### Client-Side (Custom UI Component)

```typescript
// Custom UI component
export default function MyApp({ onExecute, response, isStreaming, ... }) {
  const [variables, setVariables] = useState({ topic: '', style: 'casual' });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    // This calls our API
    await onExecute(variables);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Input 
        value={variables.topic}
        onChange={(e) => setVariables({...variables, topic: e.target.value})}
      />
      <Button type="submit">Generate</Button>
      
      {response && <div>{response}</div>}
    </form>
  );
}
```

### API Endpoint

```typescript
// POST /api/public/apps/{slug}/execute
// 1. Check rate limit
const rateLimitResult = await checkRateLimit(appId, userId, fingerprint, ipAddress);
if (!rateLimitResult.allowed) return 429;

// 2. Validate variables
const { validVariables, validationErrors } = validateVariables(variables, schema);
if (validationErrors.length) return 400;

// 3. Fetch prompt (private, server-side only)
const prompt = await supabase.from('prompts').select('*').eq('id', promptId).single();

// 4. Resolve variables in messages
const resolvedMessages = resolveVariablesInMessages(prompt.messages, validVariables);

// 5. Build chat config
const chatConfig = {
  model_id: prompt.settings.model_id,
  messages: resolvedMessages,
  stream: true,
  ...prompt.settings
};

// 6. Return task_id and config
return {
  success: true,
  task_id: uuidv4(),
  chat_config: chatConfig,
  rate_limit: rateLimitResult
};
```

### Socket.IO Submission

```typescript
// PromptAppRenderer.tsx (wrapper component)
const handleExecute = async (variables) => {
  // Call API
  const response = await fetch(`/api/public/apps/${slug}/execute`, {
    method: 'POST',
    body: JSON.stringify({ variables, fingerprint })
  });
  
  const { task_id, chat_config } = await response.json();
  
  // Submit to Socket.IO
  await dispatch(createAndSubmitTask({
    service: "chat_service",
    taskName: "direct_chat",
    taskData: { chat_config },
    customTaskId: task_id
  }));
};
```

---

## Security & Rate Limiting

### Rate Limiting Strategy

**Anonymous Users** (tracked by fingerprint/IP):
- Default: 5 executions per 24 hours
- After hitting limit, show signup prompt
- Simple browser fingerprinting (canvas, user agent, screen)

**Authenticated Users**:
- Default: 100 executions per 24 hours
- Can be increased per app or globally
- Tracked by user_id

**Rate Limit Function** (PostgreSQL):
```sql
check_rate_limit(app_id, user_id, fingerprint, ip_address)
  RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMP, is_blocked BOOLEAN)
```

### Component Security

**Sandboxed Execution**:
1. Component code transformed by Babel (JSX → JS)
2. Executed in controlled scope with `new Function()`
3. Only allowed imports available
4. No access to global scope, `window`, `document`, etc.
5. No network requests except via `onExecute`

**Allowlisted Imports**:
- `react` (useState, useEffect, useMemo, useCallback)
- `lucide-react` (icons only)
- `@/components/ui/*` (ShadCN components)

**Forbidden**:
- No `next/router` or navigation
- No `axios`, `fetch`, or HTTP libraries
- No Redux or state management imports
- No file system access
- No custom hooks from codebase

### Prompt Privacy

- Prompt `id` and content **never** exposed to public
- API fetches prompt server-side only
- Custom UI only sees `variable_schema`
- Users can't reverse-engineer system prompts

---

## Component Guidelines

See full guidelines in: `/features/prompt-apps/AI_UI_BUILDER_GUIDELINES.md`

### Required Props Interface

```typescript
interface PromptAppComponentProps {
  onExecute: (variables: Record<string, any>) => Promise<void>;
  response: string;                    // Real-time streaming text
  isStreaming: boolean;                // Still generating?
  isExecuting: boolean;                // Submitting request?
  error: { type: string, message: string } | null;
  rateLimitInfo: {
    allowed: boolean;
    remaining: number;
    reset_at: string;
    is_blocked: boolean;
  } | null;
  appName: string;
  appTagline?: string;
  appCategory?: string;
}
```

### Component Template

```typescript
export default function CustomApp(props) {
  const { onExecute, response, isStreaming, isExecuting, error } = props;
  const [variables, setVariables] = useState({ /* defaults */ });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    await onExecute(variables);
  };
  
  return (
    <div className="p-6 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Variable inputs */}
        <Button type="submit" disabled={isExecuting}>
          {isExecuting ? 'Generating...' : 'Generate'}
        </Button>
      </form>
      
      {error && <ErrorDisplay error={error} />}
      {response && <ResponseDisplay response={response} />}
    </div>
  );
}
```

---

## API Reference

### Public Endpoints

#### GET `/api/public/apps/{slug}`

Fetch public app metadata (no auth required):

**Response:**
```json
{
  "id": "uuid",
  "slug": "story-generator",
  "name": "AI Story Generator",
  "tagline": "Create amazing stories with AI",
  "description": "Full markdown description...",
  "category": "creative",
  "tags": ["stories", "writing", "creative"],
  "preview_image_url": "https://...",
  "variable_schema": [
    {
      "name": "genre",
      "type": "string",
      "required": true,
      "default": "fantasy"
    }
  ],
  "layout_config": {},
  "styling_config": {},
  "total_executions": 1234,
  "success_rate": 98.5
}
```

#### POST `/api/public/apps/{slug}/execute`

Execute the prompt app (no auth required, rate limited):

**Request:**
```json
{
  "variables": {
    "genre": "fantasy",
    "protagonist": "A young wizard",
    "setting": "Magic academy"
  },
  "fingerprint": "base64_fingerprint",
  "metadata": {
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "task_id": "uuid",
  "chat_config": {
    "model_id": "gpt-4",
    "messages": [...],
    "stream": true
  },
  "rate_limit": {
    "allowed": true,
    "remaining": 4,
    "reset_at": "2024-01-02T00:00:00Z",
    "is_blocked": false
  }
}
```

**Response (Rate Limited):**
```json
{
  "success": false,
  "rate_limit": {
    "allowed": false,
    "remaining": 0,
    "reset_at": "2024-01-02T00:00:00Z",
    "is_blocked": false
  },
  "error": {
    "type": "rate_limit_exceeded",
    "message": "Rate limit exceeded. 0 executions remaining. Resets at 2024-01-02T00:00:00Z.",
    "details": { "reset_at": "...", "is_blocked": false }
  }
}
```

### Authenticated Endpoints

#### POST `/api/apps` - Create new app

```json
{
  "prompt_id": "uuid",
  "slug": "my-app",
  "name": "My AI App",
  "tagline": "Short description",
  "category": "productivity",
  "component_code": "export default function ...",
  "variable_schema": [...],
  "allowed_imports": ["react", "lucide-react"]
}
```

#### PUT `/api/apps/{id}` - Update app

#### DELETE `/api/apps/{id}` - Delete app

#### GET `/api/apps/{id}/analytics` - Get analytics

---

## Implementation Examples

### Example 1: Simple Text Generator

```typescript
export default function TextGenerator({
  onExecute, response, isExecuting, error
}) {
  const [topic, setTopic] = useState('');
  
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <Input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter a topic..."
      />
      <Button 
        onClick={() => onExecute({ topic })}
        disabled={!topic || isExecuting}
      >
        Generate
      </Button>
      {response && <div className="prose">{response}</div>}
    </div>
  );
}
```

### Example 2: Multi-Field Form

```typescript
export default function EmailWriter({
  onExecute, response, isExecuting
}) {
  const [variables, setVariables] = useState({
    recipient: '',
    purpose: '',
    tone: 'professional',
    length: 'medium'
  });
  
  return (
    <form onSubmit={(e) => { e.preventDefault(); onExecute(variables); }}>
      <Input
        value={variables.recipient}
        onChange={(e) => setVariables({...variables, recipient: e.target.value})}
        placeholder="Recipient name"
      />
      <Textarea
        value={variables.purpose}
        onChange={(e) => setVariables({...variables, purpose: e.target.value})}
        placeholder="Email purpose"
      />
      <Select
        value={variables.tone}
        onValueChange={(v) => setVariables({...variables, tone: v})}
      >
        <SelectItem value="professional">Professional</SelectItem>
        <SelectItem value="casual">Casual</SelectItem>
      </Select>
      <Button type="submit">Generate Email</Button>
    </form>
  );
}
```

### Example 3: Interactive Quiz Generator

```typescript
export default function QuizGenerator({ onExecute, response, isStreaming }) {
  const [variables, setVariables] = useState({
    subject: '',
    difficulty: 'medium',
    questionCount: 5,
    includeExplanations: true
  });
  
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Quiz Generator</h2>
      
      <div className="space-y-4">
        <Input
          value={variables.subject}
          onChange={(e) => setVariables({...variables, subject: e.target.value})}
          placeholder="Quiz subject (e.g., World War II)"
        />
        
        <div>
          <Label>Difficulty</Label>
          <div className="flex gap-2 mt-2">
            {['easy', 'medium', 'hard'].map(level => (
              <Button
                key={level}
                variant={variables.difficulty === level ? 'default' : 'outline'}
                onClick={() => setVariables({...variables, difficulty: level})}
              >
                {level}
              </Button>
            ))}
          </div>
        </div>
        
        <div>
          <Label>Number of Questions: {variables.questionCount}</Label>
          <Slider
            value={[variables.questionCount]}
            onValueChange={([v]) => setVariables({...variables, questionCount: v})}
            min={3}
            max={20}
            step={1}
          />
        </div>
        
        <Button 
          onClick={() => onExecute(variables)}
          className="w-full"
        >
          Generate Quiz
        </Button>
      </div>
      
      {response && (
        <div className="mt-6 prose max-w-none">
          {response}
        </div>
      )}
    </Card>
  );
}
```

---

## Deployment Checklist

### Database Setup
- ✅ Run migration: `supabase/migrations/create_prompt_apps_system.sql`
- ✅ Verify RLS policies
- ✅ Set up indexes
- ✅ Test rate limit function

### Environment Variables
```env
NEXT_PUBLIC_SITE_URL=https://aimatrx.com
NEXT_PUBLIC_APP_URL=https://aimatrx.com/p
```

### Routes
- ✅ Public route: `/p/[slug]` (no auth)
- ✅ Public API: `/api/public/apps/[slug]/execute`
- ✅ Public API: `/api/public/apps/[slug]` (GET metadata)
- ✅ Authenticated: `/apps` (manage apps)

### Security
- ✅ Rate limiting enabled
- ✅ Component sandboxing working
- ✅ Allowlist verified
- ✅ Prompt privacy maintained

### Monitoring
- ✅ Analytics view set up
- ✅ Error tracking operational
- ✅ Cost tracking enabled
- ✅ Usage dashboards ready

---

## Next Steps

1. **Build UI Generator Agent** - Train Claude Sonnet with AI_UI_BUILDER_GUIDELINES.md
2. **Create App Builder Interface** - UI for users to create/publish apps
3. **App Gallery** - Browse/search published apps
4. **Analytics Dashboard** - For app creators
5. **Monetization** - Premium features, higher rate limits
6. **Featured Apps** - Curate best apps on homepage
7. **Templates Library** - Pre-built components users can start from

---

## Resources

- **Database Migration**: `/supabase/migrations/create_prompt_apps_system.sql`
- **TypeScript Types**: `/features/prompt-apps/types/index.ts`
- **API Route**: `/app/api/public/apps/[slug]/execute/route.ts`
- **Public Page**: `/app/(public)/p/[slug]/page.tsx`
- **Component Renderer**: `/features/prompt-apps/components/PromptAppRenderer.tsx`
- **AI Guidelines**: `/features/prompt-apps/AI_UI_BUILDER_GUIDELINES.md`

---

**This system turns every prompt into a shareable, beautiful web app. It's our competitive advantage and primary growth driver.** 🚀

