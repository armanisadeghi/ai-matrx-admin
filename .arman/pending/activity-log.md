# Activity Log Integration Guide

## Overview

The engine now records every incoming HTTP request as a structured JSON entry and exposes four endpoints for consuming that data. This document tells the **aimatrx.com** web app team exactly what to call and how.

---

## API Reference

### `GET /logs/access`

Returns last-N structured access log entries (snapshot).

**Query params**
| Param | Default | Max | Description |
|---|---|---|---|
| `n` | 100 | 500 | Number of entries to return |

**Response**

```json
{
  "entries": [
    {
      "timestamp": "2026-02-22T08:00:00.123456+00:00",
      "method": "POST",
      "path": "/tools/execute",
      "query": "",
      "origin": "https://aimatrx.com",
      "user_agent": "Mozilla/5.0 ...",
      "status": 200,
      "duration_ms": 42.1
    }
  ]
}
```

---

### `GET /logs/access/stream` ⬅ **Live SSE — use this for real-time**

Server-Sent Events stream. Pushes a new JSON object every time a request completes.

**Auth note:** `EventSource` cannot send `Authorization` headers. Pass your Bearer token as `?token=<jwt>`.

```typescript
const token = supabase.auth.getSession()?.access_token ?? "";
const es = new EventSource(
  `http://localhost:22110/logs/access/stream?token=${encodeURIComponent(token)}`,
);

es.onmessage = (evt) => {
  const entry = JSON.parse(evt.data);
  // entry: { timestamp, method, path, query, origin, user_agent, status, duration_ms }
  console.log(
    `${entry.method} ${entry.path} → ${entry.status} (${entry.duration_ms}ms)`,
  );
};

// Clean up
es.close();
```

Each SSE event delivers a keepalive comment (`: keepalive`) every 15 s when idle — safe to ignore.

---

### `GET /logs/stream`

Raw system.log tail as SSE (plain text, one line per `data:` event). Useful for debugging server internals.

Same `?token=` auth pattern as above.

---

### `GET /logs`

Last-N raw system log lines as a JSON array of strings.

**Query params:** `?n=100` (max 2000)

---

## Local Desktop App

The **Activity** page in the Matrx Local desktop app (`/activity`) already consumes both SSE endpoints:

- **HTTP Requests tab** — live-streamed structured access log (method, path, status, duration, origin)
- **System Log tab** — raw tailed `system.log` with ERROR/WARNING/INFO color-coding

No changes needed in the desktop app.

---

## What the Web App Needs To Do

If you want to add an Activity panel to **aimatrx.com** (e.g. a drawer that shows live requests to the local engine), here is the complete integration:

```typescript
// hooks/use-engine-activity.ts
import { useEffect, useState, useRef } from "react";
import { useSession } from "@/hooks/use-session"; // your auth hook

export interface AccessEntry {
  timestamp: string;
  method: string;
  path: string;
  query: string;
  origin: string;
  user_agent: string;
  status: number;
  duration_ms: number;
}

export function useEngineActivity(engineUrl: string | null) {
  const { session } = useSession();
  const [entries, setEntries] = useState<AccessEntry[]>([]);
  const esRef = useRef<EventSource | null>(null);

  // Load recent history
  useEffect(() => {
    if (!engineUrl || !session?.access_token) return;
    fetch(`${engineUrl}/logs/access?n=100`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((d) => d?.entries && setEntries(d.entries));
  }, [engineUrl, session?.access_token]);

  // Live stream
  useEffect(() => {
    if (!engineUrl || !session?.access_token) return;
    const url = `${engineUrl}/logs/access/stream?token=${encodeURIComponent(session.access_token)}`;
    const es = new EventSource(url);
    esRef.current = es;
    es.onmessage = (evt) => {
      try {
        const entry: AccessEntry = JSON.parse(evt.data);
        setEntries((prev) => [...prev.slice(-499), entry]);
      } catch {}
    };
    return () => {
      es.close();
      esRef.current = null;
    };
  }, [engineUrl, session?.access_token]);

  return entries;
}
```

Then just render the entries however you like. The `origin` field tells you which domain made the call (e.g. `https://aimatrx.com` vs `http://localhost:3000`).

---

## File Map

| File                                           | What changed                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `app/common/access_log.py`                     | **NEW** — structured JSON logger with ring buffer + SSE subscriber support                          |
| `app/api/routes.py`                            | Fixed `GET /logs` path bug; added `GET /logs/access`, `GET /logs/stream`, `GET /logs/access/stream` |
| `app/api/auth.py`                              | Added `?token=` query-param fallback for SSE auth                                                   |
| `app/main.py`                                  | Updated `log_requests` middleware to call `access_log.record()` with timing                         |
| `desktop/src/pages/Activity.tsx`               | Replaced with two-tab real-time viewer                                                              |
| `desktop/src/components/layout/AppSidebar.tsx` | Added **Activity** nav item                                                                         |
