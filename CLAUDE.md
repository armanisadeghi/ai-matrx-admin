# CLAUDE.md — AI Matrx Admin

Large-scale Next.js no-code AI app builder and admin dashboard. Desktop-first, mobile-responsive. Redux for state management, Supabase for database.

---

## File Organization

- **General dirs:** `/components`, `/hooks`, `/utils`, `/constants`, `/types`, `/providers`
- **Feature dirs:** `/features/[feature-name]/` containing: `index.ts`, `types.ts`, `components/`, `hooks/`, `service.ts`, `utils.ts`, `constants.ts`, `state/`
- **Route example:** `app/(authenticated)/notes/page.tsx` → Feature: `features/notes/`
- One README.md per feature, created **only after code is tested** — never multiple .md files
- Never save files to project root

---

## Tech Stack & Architecture

Always use the latest stable release of every package — no deprecated APIs. All output is production-grade.

**Web:** Next.js 16.1 (App Router) + React 19.2 + TypeScript 5.9 + Tailwind CSS 4.1 (CSS-first config, `@theme` directives)
**Mobile:** Expo 54 (React Native 0.81) + React 19.1 + TypeScript 5.9 — iOS 26+ (Liquid Glass) | Android 16+ (Material 3 Expressive)
**Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime) — Next.js API routes are the single source of truth for all business logic
**Realtime:** Supabase Broadcast for ephemeral messaging/presence; Postgres Changes only when RLS authorization is needed
**Video/Audio:** LiveKit (requires `npx expo prebuild`, not Expo Go compatible)
**Payments:** Stripe
**Infrastructure:** Vercel (web), App Store / Play Store (mobile), Turbopack (default bundler), pnpm 10.28

**Python microservices** only when TypeScript hits a capability wall (heavy PDF/OCR, bulk statistical analysis, local NLP at scale, advanced image/video processing). Deploy as isolated services behind Next.js API routes.

**Core principles:**
- Dynamic rendering by default — opt into caching with `'use cache'`, invalidate with `cacheTag()` / `revalidateTag()`
- Server Components by default; Client Components only for interactivity
- React Compiler enabled (`reactCompiler: true`) — no manual `useMemo`/`useCallback`/`React.memo`
- `proxy.ts` replaces `middleware.ts` — auth checks, route guards, redirects only
- Supabase-generated types as source of truth — end-to-end type safety, strict mode, no `any`
- Every async operation has structured error handling — never swallow errors

**Supabase clients:**
- Client-side: `import { supabase } from "@/utils/supabase/client"`
- Server-side: `import { createClient } from '@/utils/supabase/server'`

---

## Agent Feedback API

MCP server and REST endpoint for cross-project issue tracking. Agents submit bugs, features, and suggestions.

- **MCP:** `app/api/mcp/[transport]/route.ts` — 10 tools (submit, triage, comment, resolve, etc.)
- **REST:** `app/api/agent/feedback/route.ts` — POST with `{ action, ...params }`, same auth
- **Auth:** Bearer token against `AGENT_API_KEY` env var (`lib/services/agent-auth.ts`)
- **Service layer:** `lib/services/agent-feedback.service.ts` — uses `createAdminClient()` to bypass RLS

---

## Redux Architecture

- **Store:** `@/lib/redux/store.ts`
- **Typed hooks:** `useAppDispatch`, `useAppSelector`, `useAppStore` from `@/lib/redux/hooks.ts` — never use untyped versions
- All selectors memoized via `createSelector`
- Small, individual state updates — never large object replacements
- Every property gets a dedicated selector
- If an action/selector doesn't exist, ask before creating one

---

## Prompt Apps System

- **Concept:** Transform prompts into public, shareable AI-powered mini-apps with custom UIs
- **Execution modes:** Real-time streaming (authenticated via Redux + Socket.IO) and polling (public, no Redux)
- **Component pipeline:** AI-generated JSX/TSX → Babel transform → `new Function()` with scoped imports
- **Security:** Import allowlisting, variable validation, RLS (owner CRUD, public SELECT on published)
- **Rate limiting:** Fingerprint + IP tracking, configurable per app, DB triggers enforce limits
- **Public URL:** `/p/[slug]` — minimal bundle, no Redux, server-side metadata for SEO
- **Key paths:** `features/prompt-apps/`, `app/(authenticated)/prompt-apps/`, `app/(public)/p/[slug]/`
- **DB tables:** `prompt_apps`, `prompt_app_executions`, `prompt_app_errors`, `prompt_app_rate_limits`

---

## Official Component Library

- **Components:** `components/official/`
- **Demos:** `app/(authenticated)/admin/official-components/component-displays/`
- **Registry:** `app/(authenticated)/admin/official-components/parts/component-list.tsx`
- Components must work immediately on import — no local styling modifications
- NEVER delete existing components — ALWAYS preserve functionality

---

## UI/UX Standards

- **Icons:** Lucide React only — no emojis
- **Backgrounds:** `bg-textured` for main backgrounds
- **Dialogs:** Never use browser `alert()`/`confirm()`/`prompt()` — use `@/components/ui/alert-dialog`
- **Loading:** Use component library loading states — no plain text "Loading..."
- **Layout:** Space-efficient, minimal padding/gaps
- **Page wrapper:** `<div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">`

---

## Mobile Layout (Responsive Web)

- Use `h-dvh`, `min-h-dvh` — **never** `h-screen`
- `pb-safe` on all fixed bottom elements
- Header height: `--header-height` (2.5rem)
- Input font-size ≥ 16px to prevent iOS zoom
- Use `<PageSpecificHeader>` for header injection

---

## Navigation Feedback

- `useTransition` + `startTransition` for all route navigation
- Loading overlay with spinner on active element
- Disable all interactive elements during transitions
- Prevent duplicate clicks via state check

---

## Design Tokens

- **Semantic classes:** `bg-card`, `bg-muted`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `text-primary`, `border-border`
- **Colors:** primary (blue), secondary (purple), destructive, success, warning, info
- **Elevations:** `--elevation-1/2/3`
- **Gradients:** `--gradient-1/2/3`
- Full variable definitions in `app/globals.css`
- CSS migration guide: `.cursor/rules/css-updates.mdc`

---

## Available Commands

Run `/command-name` for specialized workflows. See `.claude/commands/` for: `/web-design`, `/nextjs-patterns`
