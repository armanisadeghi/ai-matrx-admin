---
name: reasoning-scores-format
type: Reference
title: "reasoning-level-calibration — scores file format"
description: "Row shape of the reasoning scores JSON and its summary file."
tags: [agents, reasoning-effort, spend]
timestamp: 2026-10-16T00:00:00Z
---

# Scores file format

One JSON array, one object per scored agent. Example file: [the 2026-10-16 scores file](https://www.aimatrx.com/files/f/0de391f4-d229-4f3d-ba2b-585075889d45) (496 rows) and its `-summary.md`.

| Key | Meaning |
|---|---|
| `id` | agent id (`agent.definition.id`) |
| `name` | agent name |
| `group` | `agent_made` (agents created by agents, recalibrated) or `comparison` (Arman's agents, scored but never changed) |
| `creator` | creator email |
| `model` | model name the agent runs on |
| `current_effort` | effort before any change: minimal, none, low, medium, auto, high, max |
| `score` | scorer's need: low, medium, high, very_high |
| `confidence` | 0 to 1 |
| `reason` | one sentence naming the task feature that drove the score |
| `is_test_or_copy` | true for test agents, copies, numbered duplicates |

The summary file holds counts per group, the score versus current-effort cross-tab, the 15 highest-scored agents, and (comparison group) where the scorer and the owner disagree. Mapping from `score` to a setting is in SKILL.md section 3.
