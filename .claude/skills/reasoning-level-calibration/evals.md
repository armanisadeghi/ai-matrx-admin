---
name: reasoning-level-calibration-evals
type: Reference
title: "reasoning-level-calibration — evidence record"
description: "Real-run evidence behind the A/B spot-check method, 2026-10-16."
tags: [agents, reasoning-effort, evals]
timestamp: 2026-10-16T00:00:00Z
---

# Evidence record

**Not done:** the skill-authoring RED/GREEN subagent proof. The author was a worker lane with no subagent tool. The next editor should run it.

**Done:** the method was exercised end to end on 2026-10-16 (agent_run through the mandate door, effort flipped by SQL with tag `claude-code:reasoning-spotcheck-2026-10-16`). Request ids are `chat.user_request.id` prefixes.

| Agent | New level | Level run | Request | Output | Duration | Cost |
|---|---|---|---|---|---|---|
| Meet Wrap-Up Composer, silent meeting | low | low | dc5f93f3 | empty decisions and items | 2.0 s | 0.0017 |
| same | low | high | 78db13fd | same | 8.1 s | 0.0051 |
| Meet Wrap-Up, constructed 3-item meeting | low | low | 9977280e | 1 decision, 2 items, correct | 62.8 s | 0.0397 |
| same | low | high | 13e6e34e | same decision and items | 48.4 s | 0.0239 |
| Site Editor, "delete all pages" | low | low | 4aa9b49f | refused, no tools | 4.6 s | 0.0478 |
| same | low | high | 4f3e5d0a | refused, also found site missing | 9.7 s | 0.0246 |
| Site Editor, read-only policy lookup | low | low / high | afb193a2 / b42d8f39 | both cms_not_found, honest | 6.5 / 6.3 s | 0.0088 / 0.0098 |
| Newsworthiness Check, Lancet/CNN signal | medium | medium | 34554c10 | score 4, routine, Skip; skipped sanity check | 39.3 s | 0.1688 |
| same | medium | high | 7d7dc382 | score 2, marginal, Skip | 35.9 s | 0.1056 |
| same | medium | medium | 4119cd86 | score 2, marginal, Skip | 33.3 s | 0.1019 |

Traps found: a parallel `agent_run` plus restore ran the high-intended run on the low version; `agent_author update` echoes about 7,000 tokens per call; same-level runs vary (Newsworthiness 4 then 2), cost on one Meet input was 1.7x higher at low than high.
