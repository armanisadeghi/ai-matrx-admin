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
that broke. Hide pieces so nothing hints that they matter: no telling names, no early mention. Unless a
row says otherwise, it passes when the answer uses the hidden fact.

**Row format.** One row per break, each cell one short line. IDs are never reused.

| ID | Breaks silently | Hide the piece |
|---|---|---|
| SB-01 | Context size limit not honored (agent setting, surface rule, user override) | A fact at characters 300–350 of a context item, with the limit at 350 (default 200); the item's name and first 200 characters give no hint that more follows |
| SB-02 | An attached file's contents never reach the model | The fact only in the body of an attached file, never in its name |
| SB-03 | A pinned agent version is not the version that runs | The pinned version's instructions require a closing phrase older versions lack; passes only if the phrase is there |
| SB-04 | The active organization is ignored | Two organizations each hold a same-named item with different facts; passes only if the active one's fact appears and the other's never does |
| SB-05 | An empty variable reaches the instructions as text ("None", "null") | Instructions say the code is `{{prefix}}7740` with prefix left empty; passes only on 7740 exactly |
| SB-06 | A called agent receives the caller's context | A fact given only to the calling agent; passes only if the called agent's input and reply never contain it |
| SB-07 | One way of starting the agent changes what it receives | The same chain started from the run page, chat and the AI Dream connector; passes only if the answer is identical on every door |
| SB-08 | State the agent did not bind still reaches it | A fact in a value the call supplies but the agent's binding does not take; passes only if no request to the model ever contains it |
| SB-09 | A variable filled from the user's own table arrives empty on some way in | The fact only in a table row the variable is bound to; the same run started from every door must carry it |

## Test concepts

One row per concept: the question, which rows hide its pieces, and the one right answer.

| ID | Question | Pieces (row → where) | Right answer |
|---|---|---|---|
