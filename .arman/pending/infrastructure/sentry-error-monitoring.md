# Sentry — Error Monitoring

**Category:** Yes — This Project (Next.js) + Python/FastAPI
**Status:** Partially implemented in ai-matrx-admin

---

## What's Done (ai-matrx-admin)

- `@sentry/nextjs` installed
- `sentry.client.config.ts` — client-side init with Session Replay (5% sessions, 100% on error)
- `sentry.server.config.ts` — server-side init with tracing
- `sentry.edge.config.ts` — edge runtime init
- `next.config.js` wrapped with `withSentryConfig` (source maps, auto-instrumentation)
- `app/global-error.tsx` — calls `Sentry.captureException(error)`
- `components/next-js/loading-error-not-found.tsx` — calls `Sentry.captureException(error)`

## Pending — ai-matrx-admin

### Required Setup (10 minutes)
- [ ] Create Sentry account at sentry.io
- [ ] Create project: `ai-matrx-admin` (Next.js)
- [ ] Add environment variables to Vercel:
  ```
  NEXT_PUBLIC_SENTRY_DSN=https://xxxx@oXXXXX.ingest.sentry.io/XXXXX
  SENTRY_ORG=your-org-slug
  SENTRY_PROJECT=ai-matrx-admin
  SENTRY_AUTH_TOKEN=sntrys_xxxx  # For source map uploads in CI
  NEXT_PUBLIC_SENTRY_ENV=production
  ```
- [ ] Add same env vars to `.env.local` for local development (DSN only needed, others optional locally)
- [ ] Deploy once to verify errors appear in Sentry dashboard

### Nice to Have
- [ ] Set up Sentry Alerts: notify on first occurrence of new errors
- [ ] Add `Sentry.setUser({ id, email })` after login so errors are tied to users
- [ ] Add custom context to long-running operations: `Sentry.setContext('ai_run', { taskId, model })`
- [ ] Add Vercel integration (one-click in Sentry dashboard → Integrations)

### Add User Context After Login
In your auth callback or Redux auth slice:
```typescript
import * as Sentry from "@sentry/nextjs";

// After successful login:
Sentry.setUser({ id: user.id, email: user.email });

// On logout:
Sentry.setUser(null);
```

---

## Part 2 — Python/FastAPI (matrx-engine)

### Install

```bash
uv add sentry-sdk[fastapi]
```

### Setup in `engine/main.py`

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
import os

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    environment=os.environ.get("SENTRY_ENV", "production"),
    traces_sample_rate=0.1,
    integrations=[
        FastApiIntegration(transaction_style="endpoint"),
        StarletteIntegration(),
    ],
    # Associate errors with users from JWT
    before_send=lambda event, hint: event,
)
```

### Attach User from JWT

```python
import sentry_sdk
from fastapi import Depends

async def get_current_user(token: str = Depends(oauth2_scheme)):
    user = verify_supabase_token(token)
    sentry_sdk.set_user({"id": user["sub"], "email": user.get("email")})
    return user
```

### Environment Variables (Coolify)

```bash
SENTRY_DSN=https://xxxx@oXXXX.ingest.sentry.io/XXXXX
SENTRY_ENV=production
```

> Create a **separate Sentry project** for `matrx-engine` (Python) so errors are organized by service.

---

## What You Get

- Every unhandled exception in Next.js API routes, Server Components, and Client Components is captured
- Stack traces with source maps (minified JS → original TypeScript)
- Session replay for debugging UI errors (you can watch what the user did before the crash)
- Performance tracing for slow API routes and DB queries
- Error grouping + deduplication so you're not flooded with the same error 1000 times
- Python FastAPI exceptions fully captured with request context
