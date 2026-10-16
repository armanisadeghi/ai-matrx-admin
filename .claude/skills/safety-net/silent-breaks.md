---
type: Register
title: "Silent breaks — the approved places a real test hides a piece"
description: "Arman's approved list of things that break without an error. Every real test hides pieces of its answer behind these, so a missing piece names the break. Only Arman adds or approves a row."
tags: [testing, safety-net, real-tests, register]
timestamp: 2026-10-15T00:00:00Z
---

# Silent breaks

**Only Arman adds a row.** Agents propose rows in chat, never here.

**How a test uses this:** one question whose right answer needs several pieces, each hidden behind a
different row below. If any piece is missing, the answer is wrong, and the missing piece names the row
that broke. Hide pieces so nothing hints that they matter: no telling names, no early mention.

**Row format.** One row per break, each cell one short line. IDs are never reused.

| ID | Breaks silently | Hide the piece | Pass only if | Seen |
|---|---|---|---|---|
| SB-01 | Context size limit not honored (agent setting, surface rule, user override) | A fact at characters 300–350 of a context item, with the limit at 350 (default 200); the item's name and first 200 characters give no hint that more follows | The answer uses the fact | 2026-10-15: a setting saved with empty fields made its 400 fall to 200 on every path |

## Test concepts

One row per concept: the question, which rows hide its pieces, and the one right answer.

| ID | Question | Pieces (row → where) | Right answer |
|---|---|---|---|
