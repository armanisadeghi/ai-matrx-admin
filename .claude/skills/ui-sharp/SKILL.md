---
name: ui-sharp
subject: platform/ui-shell
description: "Lean, sharp UI posture — the everyday default for building or redesigning a UI. Use when asked to build or make a page, panel, list, form, or dashboard good, cleaner, or nicer, or for a fast confident refresh where the agent uses its judgment instead of asking for a spec."
---

# ui-sharp — the lean, inviting redesign

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
<!-- rules:stamp-end -->

**Your one specialty: making a UI feel effortless.** Not a flavor you add if there's time — it is the whole job. Every cut and every layout choice serves that one feeling. If a first glance doesn't say *"oh, this is easy,"* you haven't delivered your specialty yet — go again.

## The result this gives

A fast, clean, **inviting** UI. Sharp, minimal, confident. The user's first reaction is *"I could do this"* — not "I need a tutorial." You keep what works, cut the clutter, elevate the rest, and then you stop. You don't gold-plate and you don't reinvent the paradigm. This is the everyday default for "make this page good."

## Read first

- `.claude/ui-skills/shared/ground-rules.md` — the non-negotiable floor (above all: **build it real, never fake**).
- `.claude/ui-skills/shared/design-system-anchors.md` — exact tokens / glass / components to reuse.
- [project-conventions.md](project-conventions.md) (in this skill; absorbed the former `modern-web-design-expert` skill) — the "how to write conformant CSS" layer: migration priorities (fluid `clamp()` type, `@container` queries, `@starting-style` entrance animations, shadcn wrappers), textures/scrollbars, layout components, and key-file map. Applies to every ui-* posture, not just this one.

## Color: three text states, never a fourth gray

Text is `text-foreground` (content, every action), `text-muted-foreground` (labels, meta, menu group
labels, placeholders) or `text-disabled-foreground` (a disabled control, via its `disabled` prop).
Never `/60`, `opacity-*` on text, `text-gray-*`, or a restyled menu label: "gray on gray on gray"
is the defect Arman banned on 2026-10-14. Check both themes; `pnpm findings` fails a new one. Body:
the style guide (`../common-docs/systems/platform/ui-shell/STYLE-GUIDE.md`, Color).

## Interview first — 2 questions, in plain conversation, skippable

> **Only when a person asked you, live, to redesign this page.** In a page pass, a campaign, or any run with no one waiting on your reply, skip the interview entirely: answer these questions yourself from the page, its FEATURE.md and the best product doing the same job, log your answers, and go (`page-pass` step 0).

Give the user one moment to aim you, then go. Ask, keep it to ~2 sharp questions, and **skip entirely** if they already told you or said "just go" — lean means trusting yourself for the rest.

1. **Who is this for, and what's the one job they came here to do?** (sets the persona and the single thing that must be effortless)
2. **Is there a product or app whose feel you want this to evoke?** (your reference model — if they don't have one, *you* pick it and name it)

Why exactly these two: your failure mode in lean mode is cutting something they actually needed, or modeling after the wrong thing. These two cover both. Don't ask more.

## How you work

- **Name the real product you're modeling after, out loud**, then build toward it. This is the single biggest quality lever — "make it modern/beautiful" averages to the generic AI mean; "model it after macOS Reminders / Linear / Stripe" inherits real layout, density, and interaction for free (ruled set + the bones-not-skin rule: ground-rules §4).
- **Cut hard:** kill narration, restated page titles, redundant chrome, card-in-card nesting. Surface the primary job; tuck secondary detail one interaction away (hover, expand, drawer).
- **Density with clarity** at the persona's level. One confident accent. Our glass where it invites, not everywhere.
- Make the **primary action unmistakable**. Make first glance say *easy*.
- Then **stop.** The win is sharp + inviting + done — not maximal.

## Guardrail

Inviting ≠ empty. Sparse, centered, under-filled, padding-to-fill is a *different* failure, not "clean." The target is **dense-but-calm**: a lot of useful information, made to feel effortless through hierarchy and spacing — the way Apple and Linear do it.
