# Prompt Apps System - Technical Overview

## Architecture

### Core Concept
Transform prompts into public, shareable web apps with custom AI-generated UIs. Two execution modes: real-time streaming (authenticated) and polling (public).

### Component Stack
- **Frontend**: Next.js 15 App Router, React 19, TypeScript
- **State**: Redux (authenticated only), local React state (public)
- **Backend**: Supabase PostgreSQL, Socket.IO for streaming
- **UI Generation**: Babel standalone for runtime JSX→JS transformation
- **Security**: Import allowlisting, user-id based RLS

---

## Database Schema

**Tables**: `prompt_apps`, `prompt_app_executions`, `prompt_app_errors`, `prompt_app_rate_limits`

**Key Fields**:
- `user_id`: Owner (FK to auth.users)
- `prompt_id`: Source prompt (FK to prompts)
- `slug`: Public URL identifier (unique)
- `component_code`: React/JSX string (AI-generated)
- `variable_schema`: JSONB array defining UI→prompt variable contract
- `allowed_imports`: Security allowlist (e.g., `["lucide-react", "@/components/ui/button"]`)
- `status`: `'draft' | 'published' | 'archived' | 'suspended'`
- `rate_limit_per_ip`: Anonymous usage limit

**RLS**: Owners CRUD, public SELECT on `status='published'`

**Migration**: `/supabase/migrations/create_prompt_apps_system.sql`
**Fix RLS**: `/supabase/migrations/fix_prompt_apps_rls.sql`

---

## Routes & Renderers

### Public Route (No Redux)
**URL**: `/p/[slug]`  
**Component**: `PromptAppPublicRenderer`  
**Flow**: 
1. Server fetches app by slug (published only)
2. Client renders form instantly (pure React)
3. User submits → POST `/api/public/apps/[slug]/execute` → gets `task_id`
4. Poll `/api/public/apps/response/[taskId]` every 1s until complete
5. Display response via local state

**Performance**: Minimal bundle, fast initial render, no providers needed

### Authenticated Preview (With Redux)
**URL**: `/preview/[id]`  
**Component**: `PromptAppPreview` → `PromptAppRenderer`  
**Flow**:
1. Server validates ownership, fetches app (draft OK)
2. Client uses Redux + Socket.IO for real-time streaming
3. Submit → Redux thunk `createAndSubmitTask` → WebSocket streaming

**Use Case**: Testing drafts, owner preview

### Alternative Access
- `/p/id/[id]` → Redirects to canonical `/p/[slug]` (published only)
- `/preview/[slug]` → Works with slug or ID

---

## Component Rendering Pipeline

### Input
AI-generated JSX/TSX string stored in `component_code`:

```tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
// ...

export default function MyApp({ onExecute, response, isStreaming }) {
  // ...
}
```

### Transformation
1. **Strip imports**: Regex removes `import` statements (provided via scope)
2. **Babel transform**: JSX/TSX → vanilla JS (presets: `['react', 'typescript']`)
3. **Scope injection**: Build object with allowed modules/components
4. **Filter params**: Only valid JS identifiers (regex: `/^[a-zA-Z_$][a-zA-Z0-9_$]*$/`)
5. **new Function()**: Create component with filtered scope
6. **Execute**: Return default export or Component

### Props Provided to Custom UI
```typescript
{
  onExecute: (variables: Record<string, any>) => Promise<void>,
  response: string,              // AI response text
  isStreaming: boolean,          // Currently receiving data
  isExecuting: boolean,          // API call in progress
  error: { type: string; message: string } | null,
  rateLimitInfo: { remaining: number; total: number } | null
}
```

---

## Workflow

### 1. Create App
**Routes**: `/prompt-apps/new` or `/ai/prompts` → "Create App" action  
**Steps**:
1. Select prompt (auto-populates variable schema from `variable_defaults`)
2. Enter metadata: name, slug, tagline, description, category, tags
3. Paste AI-generated component code (or generate via LLM)
4. Configure: rate limits, allowed imports
5. Submit → Saves as `status='draft'`

**Form**: `CreatePromptAppForm` (`features/prompt-apps/components/`)

### 2. Edit/Manage
**Route**: `/prompt-apps/[id]`  
**Component**: `PromptAppEditor`  
**Actions**:
- View stats (executions, users, success rate, avg time)
- Test draft → Opens `/preview/[id]`
- Publish/Unpublish → Toggle `status`
- Delete

### 3. List Apps
**Routes**: `/prompt-apps` or `/apps` (shared view)  
**Features**:
- Grid of user's apps with status badges
- "Edit" button → `/prompt-apps/[id]`
- "Run/Test" button → `/p/[slug]` (published) or `/preview/[id]` (draft)

### 4. Public Execution
**URL**: `https://aimatrx.com/p/story-generator`  
**User Flow**:
1. Loads form (instant, no Redux)
2. Fills variables → Submits
3. Sees streaming response (polling every 1s)
4. Rate limited by fingerprint/IP (default: 5/24h)
5. Prompted to sign up after limit

---

## API Endpoints

### Execute Prompt App
**POST** `/api/public/apps/[slug]/execute`  
**Body**: `{ variables: {}, fingerprint: string, metadata: {} }`  
**Response**: `{ success: boolean, task_id: string, rate_limit: {} }`  
**Logic**:
1. Fetch app + prompt
2. Check rate limits (RLS + triggers handle)
3. Replace variables in prompt messages
4. Create `ai_task` + `ai_run`
5. Submit to Socket.IO backend
6. Return `task_id` for polling

### Poll Response (Public)
**GET** `/api/public/apps/response/[taskId]`  
**Response**: `{ response: string, completed: boolean, error: string | null }`  
**Logic**: Query `ai_tasks` table, extract `result.response` or `result.text`

---

## Security

### Import Allowlisting
Only modules in `allowed_imports` are provided to custom code:
- `react` (always)
- `lucide-react` (icons)
- `@/components/ui/*` (ShadCN components)

Invalid imports throw errors, preventing arbitrary code execution.

### RLS Policies
- **prompt_apps**: Users SELECT own + published; INSERT/UPDATE/DELETE own only
- **executions/errors**: Users view own app data only
- **rate_limits**: System-managed

### Variable Validation
- UI sends any variables → Backend uses only those in `variable_schema`
- Missing variables → Default to empty string
- Extra variables → Ignored
- Mismatches logged in `prompt_app_errors` for debugging

---

## AI Guidelines

**File**: `features/prompt-apps/AI_UI_BUILDER_GUIDELINES.md`  
**Purpose**: Instructions for Claude Sonnet to generate compliant UI code  
**Key Rules**:
- Use only allowed imports
- Expect specific props: `onExecute`, `response`, `isStreaming`, etc.
- Call `onExecute(variables)` on submit
- Render `response` with `EnhancedChatMarkdown` or custom display
- Handle `error` and `rateLimitInfo` gracefully

---

## Key Files

### Features
- `features/prompt-apps/components/`
  - `PromptAppPublicRenderer.tsx` - Public, no Redux
  - `PromptAppRenderer.tsx` - Authenticated, Redux+Socket.IO
  - `PromptAppPreview.tsx` - Client wrapper for preview
  - `PromptAppEditor.tsx` - Management UI
  - `CreatePromptAppForm.tsx` - Creation form
  - `CreatePromptAppModal.tsx` - Modal wrapper

### Routes
- `app/(public)/p/[slug]/page.tsx` - Public execution
- `app/(authenticated)/preview/[id]/page.tsx` - Owner preview
- `app/(authenticated)/prompt-apps/` - Management pages

### API
- `app/api/public/apps/[slug]/execute/route.ts` - Execute endpoint
- `app/api/public/apps/response/[taskId]/route.ts` - Polling endpoint

### Database
- `supabase/migrations/create_prompt_apps_system.sql` - Schema
- `supabase/migrations/fix_prompt_apps_rls.sql` - RLS fixes
- `features/prompt-apps/types/index.ts` - TypeScript types

### Documentation
- `features/prompt-apps/README.md` - Feature overview
- `features/prompt-apps/AI_UI_BUILDER_GUIDELINES.md` - AI instructions
- `app/(authenticated)/ai/prompts/PROMPT_APPS_SYSTEM.md` - Detailed specs

---

## Performance Optimizations

1. **Public route**: No Redux bundle (~200KB saved)
2. **Server-side metadata**: SEO-friendly, pre-rendered
3. **Code splitting**: Preview uses dynamic imports
4. **Polling interval**: 1s (tunable), auto-stops on completion/timeout
5. **Babel caching**: Memoized transformation via `useMemo`

---

## Development

### Create App
1. Go to `/ai/prompts` → Select prompt → "Create App"
2. Or `/prompt-apps/new` → Manual creation

### Test Draft
Click "Test" button → Opens `/preview/[id]` with full debugging

### Publish
Editor page → "Publish App" → Now live at `/p/[slug]`

### Debug
- Check browser console for `Creating component with params: [...]`
- Errors show in UI with detailed messages
- Server logs in terminal
- Query `prompt_app_errors` table for historical issues

---

## Rate Limiting

**Anonymous**: Tracked by fingerprint + IP, default 5 executions per 24h  
**Authenticated**: Higher limit (100/24h by default)  
**Override**: Adjust `rate_limit_per_ip` / `rate_limit_authenticated` per app  
**Enforcement**: Database triggers + `prompt_app_rate_limits` table

---

## Future Enhancements

- Auto-generate UI from prompt schema (Claude API integration)
- In-browser code editor with live preview
- Analytics dashboard (execution trends, error rates)
- Monetization (premium limits, white-label)
- App gallery/marketplace
- Version control for component code
- A/B testing different UIs

