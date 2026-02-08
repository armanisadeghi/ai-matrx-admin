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

## Redux Architecture

- **Store:** `@/lib/redux/store.ts`
- **Typed hooks:** `useAppDispatch`, `useAppSelector`, `useAppStore` from `@/lib/redux/hooks.ts` — never use untyped versions
- All selectors memoized via `createSelector`
- Small, individual state updates — never large object replacements
- Every property gets a dedicated selector
- If an action/selector doesn't exist, ask before creating one

---

## App Builder System

- **Hierarchy:** App → Applets → Containers (Field Groups) → Fields
- Containers store **compiled field snapshots** (not references)
- Changes to container fields only affect that container's copy
- Recompilation required when updating fields/containers upstream
- Unified save pattern handles both creation and updates, replaces temp IDs
- **Key paths:** `@/lib/redux/app-builder/`, `features/applet/builder/builder.types.ts`

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

## Supabase Clients

- **Client-side:** `import { supabase } from "@/utils/supabase/client"`
- **Server-side:** `import { createClient } from '@/utils/supabase/server'`

---

## Available Commands

Run `/command-name` for specialized workflows. See `.claude/commands/` for: `/web-design`, `/nextjs-patterns`
