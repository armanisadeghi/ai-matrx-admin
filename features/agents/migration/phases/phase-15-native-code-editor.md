# Phase 15 — Native Code Editor Rebuild

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 14
**Unblocks:** —

## Goal

Replace the Phase 6 quick wrapper with a VSCode-style code experience built natively on agent tools. Open files, cursor position, selection, diagnostics, and workspace tree become **context slots** the agent reads directly. File edits happen via agent **tools** that return diffs/new versions.

This is the architecture that lets the same system power a real VSCode extension later.

## Success criteria
- [ ] Context slots for: open files, active file content, cursor, selection, diagnostics, workspace symbols.
- [ ] Agent tools: `read_file`, `write_file`, `apply_patch`, `create_file`, `delete_file`, `list_dir`.
- [ ] `features/code-editor/` components refactored to consume agent tool output, not prompt output.
- [ ] `applyCodeEdits`, `parseCodeEdits`, `generateDiff` either retired or folded into the tool layer.
- [ ] Phase 6 wrapper comments removed; Phase 6 code either deleted or absorbed.

## Change log
| Date | Who | Change |
|---|---|---|
