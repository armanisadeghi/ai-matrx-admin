# AGENTS.md

## Cursor Cloud specific instructions

### Overview

AI Matrx is a Next.js 16 (Turbopack) no-code AI app builder. Single Next.js service; the Python FastAPI backend ("App Matrx Engine") is an external dependency not in this repo.

### Starting the dev server

The `pnpm dev` script uses Windows-style `set` syntax which does not work on Linux. On Linux/Cloud VMs, start the dev server with:

```bash
NODE_OPTIONS=--dns-result-order=ipv4first npx next dev --port 3000
```

The server starts in ~3-4 seconds with Turbopack.

### Lint

`next lint` was removed in Next.js 16. The project has `.eslintrc.json` (legacy format) but `eslint@latest` resolved to v9 which requires `eslint.config.js`. Linting is currently broken due to this incompatibility. If you need static analysis, use `pnpm type-check` (`tsc --noEmit`) instead — note it is slow on this large codebase.

### Environment variables

Secrets are managed via Doppler (`pnpm env:pull`). In Cursor Cloud, secrets are injected as environment variables automatically. Key required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`. No `.env.local` file is needed when env vars are injected.

### Native build dependencies

The `canvas` and `sharp` npm packages require system libraries. On Ubuntu: `build-essential libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev`.

### Node.js version

The Dockerfile specifies Node.js 20. Use `nvm use 20` or ensure Node 20 is active.

### Package manager

pnpm 10.29.2 — install via `corepack enable && corepack prepare pnpm@10.29.2 --activate`.

### Key commands

See `package.json` `scripts` for all available commands. Key ones:
- **Dev:** `NODE_OPTIONS=--dns-result-order=ipv4first npx next dev` (Linux-compatible)
- **Build:** `pnpm build` (runs manifest generation + next build)
- **Type check:** `pnpm type-check` (slow, large codebase)
- **Generate Supabase types:** `pnpm types`

### External services (not in this repo)

- **Python FastAPI backend** (AME): AI chat, agents, research. Connected via `NEXT_PUBLIC_BACKEND_URL` + Socket.IO. Not required for the Next.js frontend to start.
- **Supabase**: Remote managed service — auth, database, storage, realtime.
- **Upstash Redis**: Rate limiting.
