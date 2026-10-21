---
name: feature-pages
subject: policies/feature-pages
type: Skill
title: "feature-pages — every feature has the same pages"
description: "The page contract for any feature: front door, /all list, /new create page, record pages, sub-features, derived breadcrumbs. Use when adding, moving or renaming a route or menu entry, building a list, create or record page, adding a create popup or window, writing breadcrumbs, or bringing a feature or domain to the standard."
tags: [ui-shell, routes, navigation, breadcrumbs]
timestamp: 2026-10-21T00:00:00Z
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/feature-pages/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# feature-pages — every feature has the same pages

<!-- rules:stamp -->
> Rules from `common-docs/policies/feature-pages.md` — edit there, never here (`python3 common-docs/meta/scripts/one_home.py --write`).

1. **Every feature declares a kind** (collection, workspace, tool) and has exactly that kind's pages; a missing or extra page fails `pnpm check:feature-pages` (matrx-frontend). Existing gaps sit in a shrink-only baseline; a new feature has none.
2. **The list lives at `/all`**, built on `EntityListPage`. `/<feature>` is the front door: guests see the marketing page, signed-in people are redirected to `/all` on the server.
3. **Create is a page.** Every collection has `/<feature>/new`. A quick create is the same shared create body inside the window panel component, with "Open full page"; a second create form anywhere is a defect.
4. **A container is the only thing that comes before a feature in an address.** Never add a domain word to an address that has no container.
5. **Every page declares its surface** (manifest + `surfaceName`) so agents can see and work on it; a page with no surface fails the guard.
6. **Page tops are templates only**: `ModuleLanding`, `EntityListPage`, `RecordPageHeader`, or the full-bleed workspace header (`features/shell/FEATURE.md` § Page-top templates).
7. **Breadcrumbs are derived, never typed.** One breadcrumb builds the trail from the address, the domain tree and the menu, in pretty names, with one override list for routes that need a different label. A record crumb shows the record's key, else its name column (`platform.entity_types.title_column`), else the last characters of its id with the one copy-id component. Every crumb opens its siblings in a dropdown (the Scopes and Admin pattern). A hand-typed trail fails the guard.
8. **Each menu entry points at a front door or `/all`, never at a bespoke page**; renaming or moving a page updates the menu, links and breadcrumbs in the same commit.
<!-- rules:stamp-end -->

Contract and reasons: `common-docs/policies/feature-pages.md`.

## Procedure

1. **Find the feature in the domain tree** and its kind (collection, workspace, tool). Not in the tree? Ask, never invent a feature.
2. **Reuse before building.** Model pages: `/agents` (front door → `/agents/all`), `/agents/all` (`EntityListPage`), `/projects/new` (one shared create body: by hand, AI guide, paste; same body in `CreateProjectWindow`), any `RecordPageHeader` page.
3. **Build exactly the kind's pages**, each on its template, each with a surface manifest.
4. **Breadcrumbs:** never pass a hand-written trail. Record pages supply only the record (key, name or id); the shell derives the rest.
5. **Move, never fork.** When a list moves from `/<feature>` to `/all`, the old address becomes the front door; update every menu entry, link and redirect in the same commit (`git grep` the old href).
6. **Run** `pnpm check:feature-pages` and `pnpm check:page-top`, then open each page signed out and signed in.
