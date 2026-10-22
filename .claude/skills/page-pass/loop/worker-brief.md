# Page-pass worker brief

You are a page-pass worker. Your job: take the page(s) you were given to done using the `page-pass` skill, and report honestly how the skill served you — we are testing the skill as much as the page.

The skill is the law. This brief only fills in what your dispatcher decided for this run; where this brief and the skill disagree, the skill wins and you name the disagreement under SKILL FRICTION.

## Read first, and nothing else up front
All paths are relative to the repo root (your checkout of matrx-frontend, wherever it lives — a Mac checkout or a cloud container).
- `.claude/skills/page-pass/SKILL.md`
- `.claude/skills/page-pass/page-types.md`
- `CLAUDE.md` — the repo law.
Open other skills only when the page-pass skill sends you there.

## Run settings (the dispatcher fills these in)
- Lane: **local** (a Mac session) or **cloud** (a container) — the skill's lane table says what each may run. A cloud lane never starts a dev server and type-checks with `pnpm type-check:files <your files>`; a local lane uses `pnpm type-check`.
- Pushing: **you push** after each commit (the skill's default) unless the dispatcher wrote "the coordinator pushes" here.
- Pages: one route per line, each with its surface name if one exists (`pnpm surface:census` shows readiness and what each page emits).

## Rules that bite most often
- One shared checkout on `main`; other files will be dirty and are not yours. Commit ONLY your files, by path: `git add -- <files> && git commit --only -m "page-pass(<route>): …" -- <files>`. Never `git add .`/`-A`, never stash, reset, checkout, rebase onto someone's work, or create branches or worktrees. If a push is refused, `git pull --no-rebase origin main` and push again — never `git pull --rebase` in this checkout (other agents' files are always dirty in it, and CLAUDE.md forbids a dirty-tree rebase).
- `pnpm -s check:parse` before every commit.
- Claims: a page assigned to you through Work Loop, or named to you directly by a person, is already yours. Only when you work without Work Loop as part of a fleet campaign, claim each surface first with the SQL in `.claude/skills/surface-authoring/references/campaign-worker.md` §1 (six-hour lease) and release it when you finish or stop. Never mix the two.
- Look and prove on the LIVE site: `TMPDIR=/tmp/pl-<you>-<n> pnpm page:look --route <route> --views desktop-light,phone-light --out /tmp/pl-<you>/<name>` (a fresh TMPDIR per run; in a container never `--full`) (before your change: no `--commit`). Read the PNGs it writes. Your change is live only after the next release (about hourly); while `--commit <sha>` exits 3, do the static work on your next page and come back.
- Changing a manifest means syncing its DB mirror the way the skill says, then its `--check`.
- Supabase: project `brsgrqvjdzwihsvnfqkf`. SQL is read-only evidence, except: your own claim and release, a manifest's DB-mirror sync (the skill's lane table), and moving agent feedback you fixed to `awaiting_review`. Never set `resolved` or write `testing_result` — those are Arman's sign-off. If a write through the Supabase MCP times out, read back whether it applied, do not retry it, and list it in your report. Test data you create is named `PP test — …` and listed in your report; never modify records you did not create. Never print credential values.
- Questions for Arman: do NOT file them. Write `ARMAN-QUESTION: <question, background, your recommendation>` in your report and continue with your recommended default.
- Time box: about 60–90 minutes of work per page. Fix the biggest problems first; finish the core areas properly rather than touching everything shallowly, and list what is left.

## Your report, one per page (return exactly this)
```
PAGE: <route> — type <x> — surface <name or "none → created X">
FIRST LOOK (before reading rules past step 1): every problem you saw, one line each
FIXED: <what, file, commit sha>
CORE 1-7 + TYPE ADDITIONS: <area> <verdict> — <one line>
LIVE PROOF: <page:look / surface:probe --agent results with commit sha, or "pending release of <sha>">
NOT DONE: <what, why>
COMMITS: <sha list, all pushed?>
RULE GAPS: problems you saw that no rule in the skill covered
SKILL FRICTION: anything in the skill that was unclear, contradictory, wrong about the code, missing a command, too long, or sent you to a dead end — quote the line
SHARED: <shared-component defects seen here: file, symptom, evidence>
PERSON→AGENT MAP: <each create/edit control → its write target, or the gap>
ARMAN-QUESTIONS: <if any>
```
