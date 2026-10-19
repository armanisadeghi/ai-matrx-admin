---
name: feature-visibility-surface
subject: skills/feature-visibility-surface
description: "A live demo or admin page shipped with every feature whose results the user would otherwise not see. Use when building or extending a server-side capability, service, registry, or pipeline, or adding a backend endpoint or feature with no UI, whose output only shows in logs, the DB, or an agent run, or when the user says there's no way to see it or asks 'how do I test this'."
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/feature-visibility-surface/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# Ship a visibility surface with every feature

> **A feature the user can't see is a feature you'll both burn turns guessing about.**
> Every new capability ships with a place the user can open to watch it work — built in
> the SAME change, not "later." This single rule kills the most common waste in this
> codebase: multiple turns where the human has no window into what the server is doing.
> Build the page in the SAME change — it's the next file, not a ticket.

## The rule

When you add or change a server-side capability, also build a **live page** that renders
its real results and lets the user trigger/test it with simple controls. Not a mock — it
reads the **live backend**. The user opens it once and re-checks it after each of your
changes.

## Decide: demo page or admin page (30 seconds)

- **No special privileges to view it?** → a **demo page**. It is not "for users" — it just
  doesn't need admin. In matrx-frontend that's `(dev)/demos/<name>/page.dev.tsx` (auth
  shell) or `(public-demos)/demos/public/<name>/page.tsx` (no auth). Auto-listed at `/demos`.
  Use the `new-route-scaffold` skill to place it.
- **Needs privileged / cross-user / admin data or actions?** → an **admin page** under
  `(admin)/administration/<name>/page.tsx` (super-admin gated at the layout; lower with an
  in-page `selectIsAdmin` seam if org-admins should reach it later).

When unsure, prefer the lower bar (demo) so the user can reach it without ceremony.

## The recipe (two thin pieces)

1. **Backend (aidream): a thin endpoint the page reads.** Usually `GET /<feature>/...`
   returning a typed Pydantic model (the FE generates TS from it). If the feature *does*
   something, add a small authed `POST /<feature>/execute`-style endpoint that runs ONE
   unit and returns a typed receipt — that's what makes the page a **test bench**, not just
   a viewer. Bare router prefix, `response_model=`, no `dict[str, Any]` (see
   `aidream/api/FEATURE.md`). Read endpoints that mirror non-sensitive metadata can be
   unauthenticated; anything that writes runs `acting_as_user` (RLS) and is authed.
2. **Frontend (matrx-frontend): the page.** A small self-contained `features/<name>/`
   feature + the route. Reuse, don't fork: the canonical base URL (`selectResolvedBaseUrl`
   / `apiConfigSlice` — never hardcode), the component-library table/select/loading/empty/
   error states, the admin gate, and any existing renderer (e.g. the `matrx-envelope`
   block renderer for live chips). Runtime-guard the response; show a real loading + error
   state; add a manual Refresh (and light polling) so it reflects the live server with no
   redeploy. A few dropdowns / inputs to drive it beat a wall of text.

## Placement recipe: aidream (server-side features)

The page itself lives in matrx-frontend (the next section); from aidream you ship piece 1
above — the thin typed endpoint — in the same change, and tell the user the URL of the
frontend page that reads it.

## Placement recipe: matrx-frontend (the page)

Self-contained `features/<name>/`:

- **Read the live backend, never hardcode the URL.** Resolve the base from
  `selectResolvedBaseUrl` (`apiConfigSlice`) — the same value every backend call uses, so
  the admin server toggle routes it. Runtime-guard the JSON (untrusted). For authed
  POST/execute calls use the canonical backend client (`lib/api/backend-client.ts` →
  `createAuthenticatedClient`), not a hand-rolled fetch.
- **Make it a test bench, not just a viewer.** A few `Select`/inputs to drive the feature;
  show the REAL result (and, for actions, the receipt). Reuse existing renderers — e.g. the
  `features/matrx-envelope` block renderer for live reference chips — never fork one.
- **Real states + real-time.** Component-library loading/empty/error states (never plain
  "Loading…"), a manual Refresh + light polling so it mirrors the live server with no
  redeploy.
- **Standards.** Semantic tokens only, Lucide icons, no emojis, dense + scannable for an
  admin surface (see `ui-dense` / `data-dense-panels`). No new barrels; import from source.

## Reuse, never fork

The base-URL resolver, the auth/backend client, the component library, the admin gate, and
the envelope renderer all already exist. A visibility surface is assembled from them in
minutes — if you're writing a second fetch layer or a second renderer, stop.

## Worked example (copy its shape)

`/administration/directive-catalog` (matrx-frontend `features/directive-catalog/`) ← `GET
/directives/catalog` + `POST /directives/execute` (aidream `services/directive_catalog` +
`services/directive_apply`): a live grid of every capability, with dropdowns to build and run
one and see the receipt. That is the bar — a place the user goes to instantly see and test
the whole surface.

## Definition of done

- The page opens, reads the **live** backend, and shows the feature's real output.
- The user can **trigger/test** the meaningful path (or, for read-only features, filter and
  inspect it).
- It's reachable (linked from the feature's admin map / `/demos` index) and uses real
  loading/empty/error states.
- You told the user the exact URL to open and what they'll see — in your turn's summary.

If you built a server capability and there's no such page, you're not done — that's the
next file, not a follow-up ticket.
