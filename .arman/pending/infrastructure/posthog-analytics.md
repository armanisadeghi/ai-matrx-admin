# PostHog — Analytics, Feature Flags & Session Replay

**Category:** Yes — This Project (ai-matrx-admin)
**Status:** Partially implemented

---

## What's Done

- `posthog-js` and `posthog-node` installed
- `providers/PostHogProvider.tsx` — client-side PostHog init with:
  - Auto-pageview tracking for App Router (manual capture via route change detection)
  - Session recording (inputs masked, 10% sample rate)
  - User identification helper functions
- `app/layout.tsx` — `PostHogProvider` wraps the root layout inside `Suspense`
- `app/Providers.tsx` — `identifyUser()` called on mount when user is authenticated

---

## Required Setup (5 minutes)

### 1. Create PostHog Account
1. Go to [posthog.com](https://posthog.com) — sign up (free tier: 1M events/month)
2. Create a new project: `AI Matrx Admin`
3. Copy your **Project API Key** (starts with `phc_`)
4. Note the **API host** (US: `https://us.i.posthog.com`, EU: `https://eu.i.posthog.com`)

### 2. Add Environment Variables

**Vercel Dashboard → Settings → Environment Variables:**
```
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Also add to `.env.local` for local development. Without `NEXT_PUBLIC_POSTHOG_KEY`, the provider renders a no-op wrapper — safe in development.

---

## What You Get Immediately

Once the env vars are set and deployed:

1. **Pageview tracking** — every route change captured
2. **Session recordings** — watch user flows, find UI issues
3. **User identification** — events linked to authenticated user IDs
4. **Funnels** — track drop-off in your key flows (signup → first prompt → first output)
5. **Retention** — see who comes back, and what keeps them engaged

---

## Feature Flags (No More `if (user.id === 'xyz')`)

### Server-Side (API Routes / Server Components)

```typescript
// lib/feature-flags.ts
import { PostHog } from "posthog-node";

let posthogServer: PostHog | null = null;

export function getPostHogServer(): PostHog {
  if (!posthogServer) {
    posthogServer = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogServer;
}

export async function isFeatureEnabled(flag: string, userId: string): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return false;
  const ph = getPostHogServer();
  return (await ph.isFeatureEnabled(flag, userId)) ?? false;
}
```

### Client-Side

```typescript
import { useFeatureFlagEnabled } from "posthog-js/react";

function MyComponent() {
  const newSearchEnabled = useFeatureFlagEnabled("new-search-ui");
  
  if (newSearchEnabled) {
    return <NewSearchUI />;
  }
  return <OldSearchUI />;
}
```

### Create a Feature Flag in PostHog Dashboard
1. PostHog → Feature Flags → New Flag
2. Key: `new-search-ui`
3. Roll out to: 20% of users (or specific user IDs / cohorts)
4. No code deploy needed to change rollout percentage

---

## Custom Event Tracking

Track key actions throughout the app:

```typescript
import posthog from "posthog-js";

// Track a prompt execution
posthog.capture("prompt_executed", {
  model: "gpt-4o",
  app_id: appId,
  execution_time_ms: duration,
  is_public: true,
});

// Track canvas creation
posthog.capture("canvas_created", {
  template_used: templateId,
});

// Track AI model selection
posthog.capture("ai_model_selected", {
  model: selectedModel,
  context: "chat" | "prompt_app" | "batch",
});
```

---

## Pending Tasks

### Core Setup
- [ ] Create PostHog project, copy API key + host
- [ ] Add `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` to Vercel + `.env.local`
- [ ] Deploy and verify pageviews appear in PostHog dashboard

### Event Tracking
- [ ] Track `prompt_executed` with model, execution time, app_id
- [ ] Track `canvas_created`, `canvas_opened`
- [ ] Track `ai_model_selected` when user changes model
- [ ] Track `feature_used` for major features (notes, tasks, messages, etc.)
- [ ] Track `export_completed` for any data export action
- [ ] Track errors: `api_error` with route + status code (complements Sentry)

### Feature Flags
- [ ] Create `lib/feature-flags.ts` with server-side PostHog client
- [ ] Identify any current `if (user.id === '...')` hacks and replace with flags
- [ ] Add flag: `new-typesense-search` for rolling out search when ready
- [ ] Add flag: `posthog-session-recording` for gradual replay rollout

### Session Replay
- [ ] Adjust `session_recording.sampleRate` — currently at 10%, increase when comfortable with privacy implications
- [ ] Verify recordings show up in PostHog → Session Replay after first login
- [ ] Check that passwords and sensitive inputs are properly masked

### Funnel Analysis
- [ ] Set up funnels in PostHog dashboard for:
  - Registration → first prompt → first canvas (activation)
  - App open → prompt executed → returned next day (retention)
