---
name: docs
subject: policies/document-types
type: Skill
title: "docs — place, edit, dedupe, verify and delete documentation"
description: "The procedure for every doc change in common-docs or a repo's CLAUDE.md, FEATURE.md or SKILL.md. Use when creating, editing, moving or deleting a doc, finding duplicate or disagreeing docs, planting a repo pointer, consolidating a node, or on /docs and the daily docs-steward run."
tags: [meta, docs-system]
timestamp: 2026-10-02T00:00:00Z
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/docs/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# docs — the procedure

<!-- rules:stamp -->
> Rules from `common-docs/policies/document-types.md` — edit there, never here (`python3 common-docs/meta/scripts/one_home.py --write`).

1. **One home per thing.** Everything about a thing lives in its one folder; whatever straddles
   two things has one home and a link from the other.
2. **No duplication.** A fact is written once. Everywhere else links to it or says nothing.
3. **Projects are temporary.** A project exists only while work is tangled across two or more
   homes. Once untangled, it splits into a `projects/` folder inside each home, and each is
   deleted when its work lands. Nothing is left behind.
4. **No changelogs, no history.** Finished work shrinks to a status phrase ("Gmail: live").
   History is git. Delete; never archive.
5. **Write only what isn't already known.** Document what a frontier model and our team would
   not know: the custom, the unique, the hard-won. No generic text, no filler, no file written
   to fill a slot. A feature has as many files as it needs: one or fifty. In a CLAUDE.md, a rule
   is one line plus a link, never a story or quote, and stays only if removing it would make an
   agent err in that repo.
6. **Built things get rules, not descriptions.** Once a UI or system exists, its docs shrink to
   the short list of rules that keep it from breaking.
7. **Arman's words live only in VISION.md.** Each domain, feature, sub-feature, or project may
   have one, holding his words verbatim, kept current. Never quote or attribute him anywhere
   else; add to the vision file instead. Short rule lists are the ideal form. An agent-written
   doc that contradicts his vision is drift, not truth. A doctrine document from his interviews is
   presumed right against the code and other docs; an agent who thinks a clause is wrong tells
   him, and only he amends it.
   One exception: a feature's bug list (`<AREA>-BUGS.md`, skill `bug-list`) quotes the reporter verbatim on each item; the quote leaves when the item is fixed.
8. **Conflicts go in [/operations/conflicts.md](/operations/conflicts.md),** one or two sentences
   per entry, then ask Arman. When he answers, delete the entry (never mark it done), apply the
   answer, and tell him how many remain (show a couple unless mid-urgent work). Entries
   touching your lane: keep asking until each is resolved.
9. **Structure (a preference while we learn):** Domain → Feature → Sub-feature, including Apps and Architecture domains. The database
   tree (`platform.taxonomy_node`) is the main clue, not the final word. Apps and architecture
   are domains too, and groupings the database can't hold (e.g. Publish: podcasts, CMS,
   artifacts) still get a place. Only Arman adds, merges, splits, or renames; agents propose in
   chat.
10. **Arman reads the chat, not docs.** Anything for him is said in the chat.
11. **Working documents belong here; clean up as you go.** Agents keep their working notes in their project or node, and while working collapse each finished step to a status line, delete what can be regenerated, and move Arman's words to VISION.md. A daily sweep cleans what is left. Large binaries and source data (books, datasets) go to file storage and are linked ([how](/systems/files/file-service/STATE.md#platform-work-products)). Release scripts commit everything; never hold files back.

12. **One subject, one home — enforced (law 15).** A subject is a domain-tree node
    (a folder under `systems/`); a policy (`policies/<name>`), an operations folder, a method that
    lives only in its skill (`skills/<name>`), or `<repo>:<dir>` for a subject only one repo has. Its one home doc
    carries `subject: <slug>` in frontmatter; nothing else for that subject does, except its skills,
    which carry the same `subject:` (a list when a skill teaches several; one skill per part, such as
    server and client, never two for one part). VISION.md, plans and project docs never carry it.
    The home writes its rules once, inside a `rules:start` / `rules:end` comment pair (see the
    [docs skill §9](/skills/docs/SKILL.md)); a script stamps them into every skill of the subject, so a
    skill never holds a hand copy of a rule. A ruling heard in chat goes, the same turn, to the node's
    VISION.md (his words) and the home's rules (the rule); a memory note may only point there. Skills
    are published from the committed canonical in `skills/` to every repo; a copy is never edited.
    Guard: `meta/scripts/one_home.py` (pre-commit in common-docs, aidream, matrx-frontend; full run in
    the daily docs sweep) and `meta/scripts/sync_skills.py`.
<!-- rules:stamp-end -->

The rules above are stamped from [the rules of this bundle](/policies/document-types.md); the
[domain tree](/policies/domain-tree.md) places every subject. This skill is how to apply them.

## 1. Place it

1. Find the subject's node in the [domain tree](/policies/domain-tree.md) (Domain → Feature →
   Sub-feature). The doc goes in that node's folder under `systems/`, or in a temporary
   `projects/` folder only while work is tangled across two or more homes.
2. No node fits: add a feature where its domain clearly holds it (same commit, tell Arman), or
   propose the change in chat. Never invent a domain.
3. Something already covers the subject? Edit that file. Never create a parallel doc. The home of a
   subject declares itself: `rg -l '^subject: <node>'` in common-docs and each repo (§9). No home yet: the node's main doc becomes it.
4. A repo keeps only rules tied to a code path in that directory (a trap, an import ban, a file
   map). Everything with meaning (what, why, status, plans, contracts, vision) lives in the node.

Done when: the target path is a node folder and no other file covers the subject.

## 2. Edit = whole-document review

1. Read the whole doc, not the section you came for.
2. Verify every claim you keep or add against live code, the DB, or git. A doc's own "verified"
   is not evidence. What cannot be checked here is marked `UNVERIFIABLE — <what would prove it>`.
3. Put the change where it belongs and merge in place: no addenda, no "Update:" blocks, no
   history, no changelog. Two lines saying one thing become one.
4. Cut what a frontier model already knows and what a command or file read reveals.
5. Never lose a rule: tightening keeps every invariant, path and pointer. Removing a rule is
   something you say out loud in your report.

Done when: the doc reads as one voice and every claim in it is currently true.

## 3. Dedupe and verify (one subject)

1. **Census.** Grep the subject's terms across common-docs and every repo it touches; follow
   one ring of links. List every file that makes claims about it.
2. **Elect the survivor**: the node's file from step 1. It carries `subject: <node>` (§9); a
   loser never keeps it.
3. **Classify each disagreement:** fact vs fact → reality decides, fix the loser; doc vs
   Arman's words → his words win, and code that drifted from them is a finding, not a doc fix;
   his words vs his words, or a disagreement about meaning → step 6, never resolved by you.
4. **Move, never copy.** One source file at a time: merge its unique truth into the survivor,
   `git rm` the source, repoint every inbound reference in every repo, commit all of it in one
   command. A file never exists in two places across a commit.
5. **Prove it.** For every deleted path, grep all repos plus common-docs: it comes back empty.

Never touch: generated files, a `.md` that code reads (grep `.py`/`.ts` for its name first),
a published package README, `inbox/`, a repo's `.arman/`. A spotted duplicate that is not
blocking you is still yours: run this section or dispatch it, never just report it.

## 4. Clean up as you go

Working notes belong in your project or node; nobody cleans them but you and the daily sweep.
Each time a step finishes, in the same commit:

- **Status:** the step becomes one line on its board or main doc ("P27 cutover: landed").
- **Resume point:** one line ("next: steps 2 and 3"); delete it when the lane closes.
- **Evidence:** say how to rerun it (the command); keep only what a later decision needs.
  Censuses, scans, logs and batch-by-batch verification notes are not kept once read.
- **Arman's words** go to the node's VISION.md (§5). Anything for him is shown in the chat.
- **Clean-up-later notes:** working material you must keep for now gets one line at its top saying when and how to cut it ("Once Meet ships, cut to what the spec lacks"). The daily sweep honors and acts on these notes.
- **Finished work** shrinks to a status phrase ("Gmail: live"); finished projects, closed
  handoffs and stale plans are deleted, never archived. Git holds history.

## 5. Arman's words

Any verbatim quote of Arman found outside a `VISION.md` moves, verbatim and dated, into the
closest node's `VISION.md` (create it with `type: Vision`, `authority: owner` if missing), and
the source line is cut. An agent's paraphrase attributed to him is deleted. Never rewrite,
trim or "fix" existing VISION content. You never set `authority: owner` on your own writing.

**A ruling heard in chat** goes there the same turn, verbatim and dated, and the rule it sets goes
into the home's rules block (§9) in the same commit. A Claude memory note may hold one line and the
home's path, never the ruling itself: memory is one machine's, the repos are everyone's.

## 6. Conflicts

A disagreement about intent or a ruling: one or two sentences in
[/operations/conflicts.md](/operations/conflicts.md), then ask Arman in chat. When he answers:
delete the entry, apply the answer, tell him how many remain.

## 7. Repo pointer lines

Every repo that touches the node gets ONE line, in that feature's `FEATURE.md` or else the repo
`CLAUDE.md`, never a stub file and never restated content:
`Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/<path> — read it before touching this feature in ANY repo.`
A renamed or deleted doc orphans its pointers: grep every repo for the old path in the same
session.

Repo checks after a doc change: aidream `python3 scripts/check_doc_links.py` (`--all` for
package CLAUDE.md, PRINCIPLES.md, FOUND_DEFECTS.md, skills) and
`python3 scripts/check_docs_guards.py`; matrx-frontend `pnpm check:docs-guards` and
`pnpm check:doc-claims`. `FOUND_DEFECTS.md` IDs: [defect ownership § Entry IDs](/policies/reality-is-the-referee.md).

## 8. Finish

1. Frontmatter with a non-empty `type` on every new `.md`; bundle-relative links; the folder's
   `index.md` updated.
2. `python3 meta/scripts/okf_lint.py` and `python3 meta/scripts/one_home.py` exit 0. Editing a
   SKILL.md → also the [skill-authoring](/skills/skill-authoring/SKILL.md) rules and
   `python3 meta/scripts/skill_descriptions.py lint`.
3. **Fresh-reader review** for guidance you wrote (CLAUDE.md, SKILL.md, STATE, FEATURE, memory):
   dispatch one fresh `standard` agent with only the file paths and
   [reviewer-brief.md](/skills/docs/reviewer-brief.md) sent verbatim. Apply each `CUT`,
   `REWRITE`, `MOVE`; reject one only with a factual reason; answer each `ASK` from live
   evidence; turn a `GUARD` into code or a `feedback` item.
4. Commit by pathspec (`git commit -m … -- <paths>`), then push per
   [shared-checkout](/policies/shared-checkout.md); never `pull --rebase` a dirty shared checkout.
   Unpushed docs do not exist.

## 9. Homes, rules blocks and stamps (law 15)

How to apply [rule 12](/policies/document-types.md):

1. **Declare.** Add `subject: <slug>` to the home's frontmatter and to each skill of the subject
   (`subject: [a, b]` for several).
2. **Write rules once**, in the home, between two lines reading exactly `<!-- rules:start -->`
   and `<!-- rules:end -->`. Name a part (`rules:start server`) when skills need only some; a
   skill picks parts with `rules: [server]`. Unnamed blocks always reach every skill.
3. **Stamp:** `python3 meta/scripts/one_home.py --write`. Never edit a stamp; edit the home.
4. **Publish:** commit the canonical in `skills/`, run `python3 meta/scripts/sync_skills.py
   --from-head`, commit each repo's copy paths. Never edit a copy.
5. **Review the partner** the commit hook names, in the same commit.

A refusal from the hook says what to fix.

## Daily sweep (the docs-steward schedule)

The sweep cleans what agents left behind while the work is still fresh. Commit message carries
the scorecard (no log file).

- [ ] **Yesterday's changes first:** every doc changed in the last 24 hours
  (`git log --since=24.hours --name-only`). For each: apply §4 — finished steps become status
  lines, regenerable evidence goes, resume points for closed lanes go, Arman's words move to
  VISION.md, duplicates merge (§3). Keep anything a live lane, an open decision or a running
  script needs; when unsure, keep it and list it in the commit message.
- [ ] **Large binaries and source data** added that day go to file storage and are linked
  ([how](/systems/files/file-service/STATE.md#platform-work-products)).
- [ ] **Instructions that make agents write logs:** if a skill, brief or plan told an agent to
  keep a log, evidence dump or per-event record, fix the instruction to §4, not just the file.
- [ ] `okf_lint.py` to zero; `one_home.py` to zero (the notes list skills with no home yet: give
  each one); `sync_skills.py --check`.
- [ ] **Inbox:** each new item is dispositioned per [/inbox/README.md](/inbox/README.md); nothing
  in `inbox/` is ever deleted.
- [ ] **Conflicts:** settled entries in [/operations/conflicts.md](/operations/conflicts.md) are
  deleted; the rest read in seconds.
- [ ] Commit, push.

## Old skill names

| Old | Now |
|---|---|
| `docs-steward` | Daily sweep |
| `cross-repo-docs`, `context-docs` | §1, §2, §7, §8 |
| `dedupe-and-verify`, `doc-convergence`, `consolidate` | §3–§5 |
| `future-reader-review` | §8.3 |
