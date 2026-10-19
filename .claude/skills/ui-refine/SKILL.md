---
name: ui-refine
subject: platform/ui-shell
description: "Refine UI posture — improve an existing screen without reinventing it. Use when the current page is roughly right but needs polish (hierarchy, spacing, labels, loading/empty/error states, mobile breakage), or when consistency with the rest of the app matters more than novelty."
---

# ui-refine — improve what's there, don't reinvent it

<!-- rules:stamp -->
> Rules from `common-docs/systems/platform/ui-shell/FEATURE.md` — edit there, never here (`python3 common-docs/meta/scripts/one_home.py --write`).

1. **Delete means archive, everywhere.** A delete that does not archive is a defect.
2. **A menu regroup ships as a side-by-side demo page** with a what-goes-where list, never as a
   direct change.
3. **Every surface mounts the canonical menu.** Use `NonEditableContextMenu` or
   `EditableContextMenu` from `features/context-menu-v3/`. Never use a bespoke `DropdownMenu` or a
   raw `contextmenu` handler, and never keep both.
4. **A menu without a source is a defect.** A menu with no `contentSource`, `entity` or
   `surfaceName` opens with every verb dark. Fix these before unwired surfaces.
5. **Lists built on `EntityListPage` inherit the row menu** through `ItemContextMenu`. They need
   their own wiring only for surface-specific sections.
6. **A window or overlay mounts its own menu.** It never delegates to the page under it.
7. **Reuse the domain's action registry.** Never create a second one.
8. **Secret-bearing surfaces follow `VaultContextMenu`.** Pass `getApplicationScope`, force
   `selection: ""`, put names and field keys in the content (never values or notes), and pass no
   `entity`.
9. **Done means the menu opens clean.** The console shows no `INERT MENU` or
   `VALUE MAPPING GAP` scream.
10. **Chat is a universal agent host.** Never bind a page-agent roster to it.
11. **Anything with an id shows it through the one canonical id component** (display plus one-click
    copy, in `@ai-matrx/design-system`). Never hand-built id text, never Copy ID buried in a menu;
    Peek carries it for every record, and a guard refuses new hand-built id displays.
12. **Flagship and first-run screens get a bespoke elevated stage**, not the 28px app-chrome controls:
    display type, giant inputs, a living background, real-data animation, inside the feature folder
    with theme and motion tokens. The brief names the champions; 3+ screenshot-critique rounds
    precede any showing.
13. **Before a link goes to Arman, every screen on its path is walked at the Steve Jobs bar** by an
    Opus reviewer who fixes what it finds, then a fresh user walk confirms.
14. **Admin tables filter, search and sort on the server** (controlled mode, footer total = server
    total), and people are picked by name or email, never by an id input.
15. **Wasted vertical space is the worst sin:** header rows collapse into the app header or one
    toolbar, buttons are mostly icons with short text, a button can carry status and action
    together, and every status shown is backed by real state.
16. **A new output style or menu layout is a NEW function used only by the new path.** Never thin or
    rewrite a shared builder (`buildAgentPayload`, the Alchemy menus) that other hosts go through.
    Before changing one, diff the old render path element by element against a baseline commit and
    keep every element a home; when tests fail after a redesign, read every deleted assertion, since
    each is a lost feature. Guard the real host shape, and fix forward, never revert.
17. **A page fetches only what it shows, each thing once.** Layouts fetch a few core things, a route
    makes one or two first-paint reads, and nothing else (DMs, realtime, connections, Google, large
    packages) loads until something engages it. Every removed fetch ships its on-engagement load,
    proven by clicking it; small late reads are one function called lazily after full paint. Guard:
    `pnpm check:page-load`.
<!-- rules:stamp-end -->

**Your one specialty: making an existing UI *meaningfully* better while keeping the user's mental model.** "Better" is a visible quality leap, never a timid reskin. You are ruthless about the things that quietly drag a UI down — and you fix them, not paper over them:
- **Wasted space.** A big box with a tiny icon marooned in the middle of it is *not* compact — it's the opposite of your job. Shrink the box itself, not just its contents.
- **Layout shift / jitter.** A section that changes size as its state or input changes is a defect. Give it a stable footprint.
- **Ragged wraps.** A row of 5 that breaks to 4 + 1, or cards so wide they wrap to a second row, waste a row and read as broken. Size things so a group fits one clean row.
- **Hidden controls.** "Reveal the rest behind an off-to-the-side collapsible or dropdown" is usually a failure — users won't find it. Keep options discoverable *in place*, in line.

If a fresh eye wouldn't instantly see it got tighter, cleaner, and more aligned, you didn't refine it — you just touched it.

## The result this gives

A confident improvement to what already exists: same systems, same concepts, executed much better. **Safest, most consistent, lowest-variance** posture. You keep the user's mental model intact and raise the bar — cleaner hierarchy, better spacing, fixed rough edges, polished states. You do **not** reinvent the paradigm.

Run this when the current page is roughly right and you want it sharpened without surprises, or when consistency with the rest of the app outranks novelty.

## Read first

- `.claude/ui-skills/shared/ground-rules.md` — the non-negotiable floor (above all: **build it real, never fake**).
- `.claude/ui-skills/shared/design-system-anchors.md` — exact tokens / glass / components to reuse.

## Interview first — 2-3 questions, in plain conversation, skippable

> **Only when a person asked you, live, to redesign this page.** In a page pass, a campaign, or any run with no one waiting on your reply, skip the interview entirely: answer these questions yourself from the page, its FEATURE.md and the best product doing the same job, log your answers, and go (`page-pass` step 0).

Ask. Skip if the user already covered it. These keep your refinement aimed at the real target:

1. **What specifically is wrong with the current page / what must change?** — refinement targets the real pain; don't guess at it.
2. **What's working and must be kept?** — preserving the good is your strength; make the list explicit so you don't sand it off.
3. **Any existing page, pattern, or component in the app this should stay consistent with?**

## How you work

- **Study the current implementation closely.** Keep its structure and the user's mental model. You are sharpening, not replacing.
- **Model your polish after a great product solving the same problem** — borrow its refinements (spacing rhythm, type hierarchy, state design), not a new paradigm. Name the reference (ruled set + bones-not-skin: ground-rules §4).
- **Fix the rough edges that drag quality down:** ugly machine labels (`some_underscore_key`) humanized for humans; cramped headers given room (e.g. the back button and title share a row when there's space); inconsistent spacing put on the 4/8/16/24/32 scale; weak or missing loading / empty / error states made real; mobile breakage fixed.
- **Reuse app primitives aggressively** — it's the fastest path to consistency (`MatrxDataTable`, `EntityListPage`, official cards/sheets, `SuspenseLoader` / `Skeleton`).

## Guardrail

"Improve" must mean *meaningfully* better, not a timid reskin. High floor is the goal, not low effort — if a fresh eye wouldn't notice the page got better, you didn't refine it, you just touched it.
