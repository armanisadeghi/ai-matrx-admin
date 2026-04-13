---
name: treasure-map-docs
description: >-
  Create concise, expert-oriented "Treasure Map" documentation that reveals
  non-obvious architecture, hidden relationships, and system flows. Use when
  the user asks to document a feature, system, flow, or codebase area — or
  when they mention treasure map, overview doc, onboarding doc, architecture
  summary, or secret sauce documentation.
---

# Treasure Map Documentation

## Core Philosophy

A treasure map doesn't give you boats, shovels, or step-by-step directions.
It tells an expert treasure hunter **where to dig**.

Your reader is a senior developer (or expert agent) with full codebase access.
They can read code, trace calls, and understand patterns on their own. What
they *can't* do quickly is discover the **non-obvious**: hidden relationships,
implicit conventions, runtime flows that span many files, and architectural
decisions that only emerge after hours of exploration.

**Your job**: Compress days of discovery into minutes of reading.

## The Three Rules

### 1. Expert Terminology Is Compression

A single precise term (`middleware chain`, `fan-out`, `hydration`, `saga`,
`projection`) can replace entire paragraphs of explanation. Use domain and
framework terminology freely — never define what experts already know.

- ✅ "The orchestrator fans out to subagents via Celery tasks"
- ❌ "The orchestrator, which is responsible for coordinating work, sends
  individual pieces of work to smaller agents called subagents by placing
  messages on a task queue using a library called Celery"

### 2. Only Include What's Expensive to Discover

Before writing *any* line, ask:

> "Would an expert with the codebase open figure this out in under 10 minutes?"

If **yes** → leave it out. If **no** → it belongs in the doc.

**Include:**
- Cross-module flows that touch 4+ files
- Implicit contracts (e.g., "field X must be set before service Y runs")
- Non-obvious side effects and ordering dependencies
- Where the *real* logic lives vs. where you'd *expect* it
- Runtime behavior that isn't apparent from static code reading
- Key entry points and their divergence points

**Exclude:**
- Function signatures (they can read the code)
- Standard CRUD explanations
- Framework boilerplate behavior
- Anything obvious from file/folder naming

### 3. Brevity Is Load-Bearing

Every sentence must earn its place. A long treasure map gets skimmed and
loses its power. Aim for **one page that replaces a week of spelunking** —
not five pages that feel thorough.

If a section grows beyond a few lines, you're explaining instead of pointing.
Stop and refactor into a pointer:

- ✅ "`RequestProcessor.resolve_agents()` quietly mutates the context dict — downstream services assume `ctx['agents']` is populated."
- ❌ A paragraph explaining what `resolve_agents` does and how dicts work.

## Document Structure

Use this skeleton. Every section is optional — only include sections that
have non-obvious content worth mapping.

```markdown
# [System/Feature Name] — Treasure Map

## What This Is
[1–2 sentences. What does this system/feature do at the highest level.]

## Entry Points
[Where requests/triggers come in. Note divergence points between similar
routes or paths early — experts need to know where things fork.]

## Core Flow
[The non-obvious journey. Focus on what crosses boundaries: module → module,
sync → async, service → service. Use a compact numbered flow or a small
diagram. Call out where the real logic lives when it's not where you'd expect.]

## Key Relationships & Hidden Contracts
[The expensive-to-discover stuff: implicit dependencies, ordering
requirements, shared state, mutation points, things that must be true
but aren't enforced by types or interfaces.]

## Key Files
[A tight table: file path | one-line role. Only files a reader must know to
start working — not a full inventory. 8–12 entries is the sweet spot.]

| File | Role |
|------|------|
| `path/to/file.py` | What it owns |
```

## Writing Process

1. **Explore fully first.** Read the code, trace the flows, understand the
   system end-to-end before writing a single line. You cannot map treasure
   you haven't found.

2. **List every discovery.** Brain-dump everything non-obvious you found.

3. **Ruthlessly filter.** Cut anything an expert would find in < 10 minutes.
   Cut anything that restates what code already says clearly.

4. **Compress.** Convert remaining items into expert-terminology pointers.
   One line per insight where possible.

5. **Structure.** Arrange into the skeleton above. Drop empty sections.

6. **Length check.** If the doc exceeds ~80 lines of content, you've over-
   explained. Cut further or split into a brief main doc + one reference
   file (see [examples.md](examples.md) for guidance).

## Anti-Patterns

| ❌ Don't | ✅ Do Instead |
|----------|--------------|
| Explain what a decorator is | Use the word "decorator" and move on |
| List every file in a directory | Point to the 2–3 files that matter |
| Describe obvious REST semantics | Note only where routes diverge from convention |
| Write a tutorial | Write a map |
| Add context "just in case" | Trust your reader or remove the section |
| Repeat information across sections | State it once, in the most relevant section |