# Axiom — Unified Structured Logging

**Category:** Yes — Both Projects (Next.js + Python/FastAPI)
**Status:** Not yet implemented

---

## Decision: Axiom for Both

Axiom covers both Vercel (Next.js) and Docker/Coolify (Python/FastAPI) natively:
- Next.js: `@axiomhq/nextjs` auto-instruments serverless functions via Vercel Log Drains
- Python: `axiom-py` SDK ships structured logs directly to Axiom from FastAPI

This gives you a **single pane of glass** for all logs across the entire stack.

---

## Part 1 — Next.js (ai-matrx-admin)

### Install

```bash
pnpm add @axiomhq/nextjs @axiomhq/winston
```

### Environment Variables

```bash
AXIOM_TOKEN=xaat-xxxxxxxxxxxx
AXIOM_DATASET=ai-matrx-prod
```

### Setup: `next.config.ts`

```typescript
import { withAxiom } from '@axiomhq/nextjs';

export default withAxiom({
  // existing next config
});
```

### Replace `console.log` with Axiom Logger

Create `lib/logger.ts`:

```typescript
import { Logger } from '@axiomhq/nextjs';

export const log = new Logger();
// Usage: log.info('event', { userId, action, metadata })
// Usage: log.error('error', { error: err.message, stack: err.stack })
```

### API Route Instrumentation

```typescript
import { withAxiom, AxiomRequest } from '@axiomhq/nextjs';

export const POST = withAxiom(async (req: AxiomRequest) => {
  req.log.info('api.call', { route: '/api/chat', userId });
  // handler logic
});
```

### Vercel Log Drain (Captures everything automatically)

1. Go to Vercel → Project Settings → Log Drains
2. Add drain: Axiom (select from integrations)
3. All `console.log`, errors, and request logs flow to Axiom automatically

---

## Part 2 — Python/FastAPI (matrx-engine)

### Install

```bash
uv add axiom-py
```

### Setup: `engine/core/logging.py`

```python
import axiom_py
from axiom_py import Client
import structlog
import os
from datetime import datetime

axiom_client = Client(os.environ["AXIOM_TOKEN"])
DATASET = os.environ.get("AXIOM_DATASET", "ai-matrx-prod")

def log_event(level: str, message: str, **fields):
    axiom_client.ingest_events(
        dataset=DATASET,
        events=[{
            "_time": datetime.utcnow().isoformat() + "Z",
            "level": level,
            "message": message,
            "service": "matrx-engine",
            **fields
        }]
    )

def log_info(message: str, **fields):
    log_event("info", message, **fields)

def log_error(message: str, **fields):
    log_event("error", message, **fields)

def log_warning(message: str, **fields):
    log_event("warning", message, **fields)
```

### FastAPI Middleware

```python
from fastapi import Request
import time

@app.middleware("http")
async def axiom_logging_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000
    
    log_info("http.request", 
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=round(duration_ms, 2),
        user_agent=request.headers.get("user-agent", ""),
    )
    return response
```

### Environment Variables (Docker/Coolify)

```bash
AXIOM_TOKEN=xaat-xxxxxxxxxxxx
AXIOM_DATASET=ai-matrx-prod
```

---

## Querying in Axiom

Both services log to the same dataset. Filter by service:

```
service == "matrx-engine" | level == "error"
service == "ai-matrx-admin" | status_code >= 500
```

---

## Pending Tasks

- [ ] Sign up at axiom.co and create dataset `ai-matrx-prod`
- [ ] Add `AXIOM_TOKEN` to Vercel env vars and Coolify secrets
- [ ] Install `@axiomhq/nextjs` in ai-matrx-admin
- [ ] Configure Vercel Log Drain for automatic capture
- [ ] Install `axiom-py` in matrx-engine
- [ ] Create `engine/core/logging.py` with the logger
- [ ] Add FastAPI middleware for HTTP request logging
- [ ] Replace critical `print()` statements with structured log calls
- [ ] Set up Axiom alerts: error rate > 1%, latency p95 > 2s
