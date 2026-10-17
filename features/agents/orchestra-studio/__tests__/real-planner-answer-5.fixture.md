# Weekly patient-education pipeline

## What you're building

You don't need an article generator. You need a weekly system: **given a clinical topic and its source material, produce a plain-language article where every medical claim has been checked, plus a social post that links to it, ready for a clinician to approve.**

**What stays the same every week** is where you invest once:
- One Medical's voice and reading level
- Article structure and disclaimers
- How to phrase "talk to your clinician"
- Your social platforms and their formats
- Who signs off

**What changes each week** becomes an input: the topic, the source material, and sometimes the audience or angle.

At one article a week, **model cost is almost nothing.** I'm not designing to save money. I'm designing for accuracy and a record you can defend, because this is medical content patients will act on.

> One thing to check first: you're currently in the **Cedar Ridge Physical Therapy** organization. If this is for One Medical, build it in that organization so the tables and approvals live in the right place.

---

## Recommendation: a workflow, not one agent

One agent could write, fact-check and post in a single pass, but **a writer checking its own work isn't a fact-check.** The reason to split is an independent checker that compares the article against the original source, keeps a record of each claim, and does it the same way every week. Everything else stays as simple as possible.

---

## One-time setup: a house style guide

Before the first run, give a top-tier model 5–10 of your team's best published articles and your existing guidelines. Have it draft a **style guide** covering:
- Voice and target reading level
- Article structure (what it is, why it matters, what to do, when to get care)
- Banned phrasings and required disclaimers
- Inclusive-language rules
- Social formats for each platform

Your team edits it once, and it becomes a **skill** that the writer and the social-post step both load. This is the biggest lever for consistent quality, and you build it once.

---

## Inputs (collected up front)
| Input | Required? | Default |
|---|---|---|
| Clinical topic | **Yes** | — |
| Source material (guidelines, papers, internal clinical docs: PDF or URL) | **Yes**. There's nothing to fact-check without it. | — |
| Audience | No | General adult patients |
| Reading level | No | From the style guide (e.g., grade 6–8) |
| Article length | No | Let the AI decide from the topic, within the style guide's range |
| Social platforms | No | Your usual set from the style guide |
| Angle or emphasis (e.g., "seasonal", "new guideline") | No | None |
| Clinical reviewer | No | The team's default reviewer |

**How it starts:** a topic row in your content calendar table is marked **"Ready"** once its sources are attached. That's better than a fixed weekly timer, because the run can't start before the sources exist. A weekly reminder can nudge whoever owns the next topic.

---

## Where things live

First I'd check whether the platform's built-in marketing/content-plan and website tables fit your calendar and publishing. If they don't, create small custom tables:

- **Topics / content calendar:** topic, week, status, sources, reviewer, links to everything below.
- **Source briefs:** the key facts pulled from the sources, each with its page reference. They can be reused later for FAQs, handouts or follow-up posts.
- **Articles:** draft → revised → approved. Every change is kept in history automatically.
- **Claim checks:** one row per medical claim, with the verdict, the exact quote from the source, the page, and which revision round it came from. This is your audit trail.
- **Social posts:** linked to the article, one row per platform.

Uploaded sources are converted to text automatically (including scanned pages) and made searchable by page, so that needs no design work.

---

## Steps
| # | Step | Who does it | Model | What it produces | What the split buys |
|---|---|---|---|---|---|
| 1 | **Brief, then draft.** In one conversation, first pull the key facts from the sources with page references (without mentioning the article), then a fixed follow-up asks for the article using the style guide. | Agent with the style guide loaded; no tools needed | Top-tier | Source brief + article draft | The facts get full attention before any writing starts, and the brief is saved for reuse. |
| 2 | **Automatic checks:** reading level, word count, required sections and disclaimer present | Code | None | Pass or flag | Catches problems almost free. |
| 3 | **List every medical claim** in the article, one per line | Single AI call | Mid-size | Claim list | Gives the record its rows and lets each claim be checked separately and in parallel. |
| 4 | **Check each claim against the original source**, not the brief. Verdict: supported / partly supported / not in source / contradicted, with the exact quote and page. | One AI call per claim, run in parallel, with a search over that topic's sources | Top-tier, **from a different model maker than the writer** | Claim-check rows | An independent second opinion that goes back to the original evidence, so a mistake in the brief can't slip through. |
| 5 | **Fix only the failed claims.** The writer gets each failed claim, its verdict and the source quote, and either corrects the claim or removes it. Only the changed claims are checked again. | Same writer agent | Top-tier | Revised article | Focused fixes instead of a full rewrite. |
| 6 | **Clinician approval:** the article plus the claim table, with failed claims highlighted | Person (approval step) | — | Approved or sent back with notes | Required for medical content, and every decision is recorded. |
| 7 | **Social post**, written *after* approval and only from the approved article | Agent with the style guide | Mid-size | One post per platform | The post can only repeat claims that were already checked. |
| 8 | **Post check:** "Does this post say anything the article doesn't?" | Yes/no check by the decision model (`jev`) | Decision model | Pass or flag | A near-free guard on the one piece written after review. |

**The link in the post:** if you publish through the platform's built-in website tools, a step can publish the approved article and put its real address into the post. If you publish somewhere else, the post carries a placeholder, and filling in the address becomes the last checklist item.

---

## Checks and what happens when they fail

- **A claim fails (not in the source, or contradicted):** step 5 fixes it. The number of fix rounds is a setting (default **2**). If claims still fail after that, the run doesn't stop. It goes to the clinician with those claims flagged in red.
- **Reading level or structure fails:** a flag on the approval screen, plus one automatic rewrite attempt (setting, default on).
- **Very few claims found** (setting: fewer than about 5 for an article of normal length): flagged as "the claim list may be incomplete" so the reviewer reads more closely.
- **Watch the fix rate.** If step 5 fires on most weeks, the problem is the writer or the style guide, not that week's article. A simple dashboard of fix rounds per week will show it.

---

## Optional upgrades (use sparingly)

- **Missing-safety-information review** (recommended): a top-tier model reads the source and the article and asks only *"What does a patient need to know that the article leaves out?"*, such as warning signs or when to seek urgent care. The claim check can't catch this, because it only looks at what was written. It costs cents a week.
- **Second checker on failed claims:** a different model re-checks only the claims marked "contradicted" before they go to the clinician. It cuts false alarms.
- **Search optimization:** the platform's SEO tools suggest a title, meta description and keywords. Worth adding if search traffic matters.
- **Spanish (or other) versions:** translate after approval, then repeat steps 3–4 on the translation.

---

## What your team gets each week

- An approval item in the "waiting on you" inbox with:
  - the article
  - a claim-by-claim table: verdict, source quote and page for every claim
  - any flags
- After approval: the published (or ready-to-publish) article, the social posts, and a full record in the tables showing what was claimed, what supported it, who approved it and when.

---

## Assumptions

- **Readability scoring:** I'm not certain the platform has a ready-made readability-score step, and the workflow's "code" steps are limited formulas rather than full programming. If none exists, a mid-size model scores the draft against the style guide's plain-language checklist. That works, but it's less exact.
- **Search limited to one topic's sources:** I'm assuming the checker can search only the sources attached to this topic, not your whole knowledge base. If it can't, pass the full source text into each claim check instead. That's fine at this size.
- **Publishing:** publishing and real links depend on where One Medical publishes. With the platform's built-in website tools it's automatic. Otherwise, the link is a placeholder plus a manual step.

## Still to decide

1. **What your sources look like.** Formal guidelines, studies, internal clinical protocols, or a mix? That affects how strict "supported" should be, for example whether a guideline from 2019 still counts.
2. **Who reviews, and how fast.** Should there be a deadline with a reminder? The deadline must never fall back to automatic approval.
3. **Exactly where the article and posts go:** your website, a content system, or social channels through a connected app.

If you can answer those three, especially where you publish and what your sources usually are, I'll turn this into a build-ready version of the style guide, tables and workflow.