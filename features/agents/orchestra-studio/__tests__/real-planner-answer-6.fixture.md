# Design: weekly patient-education content system

Your three-step limit fits this job well. Each step does something the other two can't, so I wouldn't add or remove any. The main gains come from three places: what you store once and reuse, what each step gets to see, and what each step must hand back.

---

## 1. The job as a system

**Each week:** a topic and its source go in. Out come a plain-language article, an independent check of every medical claim against the source, and a social post that uses only the claims that passed. Everything is saved and searchable.

- **Stays the same every week:** One Medical's voice, the target reading level, standard disclaimers ("talk to your clinician…"), what is never allowed (dosing advice, diagnosis, promises), and the rules for social posts. Write these down **once** and reuse them.
- **Changes every week:** the topic, the source, and sometimes the audience or the social channel. These become the inputs.

## 2. Recommendation: a three-step workflow

Use a **workflow** with three agent steps in a fixed order. The path never changes, so there's no need for an orchestra leader deciding what to do next. A workflow also stores every step's output and can be started from a table, which an orchestra's sequential mode can't do as cleanly. The three steps each earn their place:
| Split | What it buys |
|---|---|
| Writer → Fact-checker | **Independence.** A checker that didn't write the article isn't defending its own work. Using a model from a different company also avoids shared blind spots. |
| Fact-checker → Social writer | **Only checked content goes out.** The social post is built from the corrected article, never the raw draft. It's also short work, so a cheaper model is enough. |

## 3. The one thing to set up first: a style guide skill

Turn the parts that never change into a **"One Medical Patient Education Style Guide" skill**: voice, reading level, terms to avoid, disclaimer wording, what's off-limits, and social rules for each platform. Include it in full in all three agents.

- Your team can update it in one place without touching any agent.
- All three steps follow the same standard.
- **This is where the experts' knowledge lives.** Have the education team and a clinician write it, not the AI.

## 4. Inputs (collected at the start)
| Input | Required? | Default |
|---|---|---|
| Clinical topic | **Yes** | — |
| Source (PDF, link, or pasted text) | **Yes** | — |
| Audience | No | General adult patients |
| Reading level | No | Grades 6–8 (from the style guide) |
| Article length | No | AI decides from the content (about 600–900 words) |
| Social channel(s) | No | One general post, plus an Instagram/LinkedIn version |
| Angle or emphasis | No | AI decides |

**How it starts:** the team adds a row to a **"Topics" table** (topic plus attached source). The workflow starts automatically when a new row is created. That row works as the input form and also as the weekly queue.

## 5. Where things live

The platform reads uploaded sources automatically. I'd add two custom tables (or use the marketing/CMS content tables if your org already uses them for articles):

- **Patient Education Articles:** topic, linked source, draft, final article, fact-check status, reading-level estimate, social post(s), run date, and a **review status** (Draft → Clinical review → Approved → Published).
- **Claim Checks** (linked to the article): one row per medical claim, with its verdict, the supporting quote and location in the source, and what was changed. Every claim gets a recorded result, so you can see exactly why each sentence is in the final article.

## 6. The three steps

### Step 1: Article Writer
- **Model:** frontier, e.g. Claude Opus 5.5. You run this weekly, so cost is negligible and quality matters most.
- **Gets:** the full source, the inputs, and the style guide.
- **Rule:** use only facts from the source. If something useful isn't in the source, mark it `[NOT IN SOURCE]` rather than adding it from general knowledge.
- **Returns (fixed structure):** title, article, a **numbered list of every medical claim** with where in the source each came from, and any `[NOT IN SOURCE]` gaps.
- The claim list is what makes Step 2 thorough rather than a skim.

### Step 2: Medical Fact-Checker
- **Model:** frontier, **from a different company** than Step 1 (e.g. GPT-6 or Gemini Pro), with reasoning turned up.
- **Gets:** the original source again (not a summary of it), the draft, and the claim list. It also scans the article for claims the writer didn't list.
- **Checks each claim:** Supported / Partly supported / Not supported / Not in source, with the exact quote and location. It also checks safety: no dosing advice, no diagnosing, red-flag symptoms send readers to care, and the disclaimer is there.
- **Fixes problems itself:** unsupported claims are corrected or removed. This replaces a separate recovery step, which your no-code rule doesn't allow anyway.
- **Returns:** the corrected article, the claim results, a reading-level estimate, and an overall status:
  - **Clean:** nothing needed changing.
  - **Corrected:** claims were fixed or removed.
  - **Needs clinician attention:** something couldn't be resolved from the source.

### Step 3: Social Post Writer
- **Model:** mid-size, e.g. Claude Sonnet 5.5.
- **Gets:** only the corrected article, the claims marked Supported, and the style guide.
- **Rule:** no claim that isn't on the Supported list. Short medical posts are where overclaiming creeps in ("cures," "prevents").
- **Returns:** a post for each channel, character counts, hashtags, a link placeholder, and the claim number behind each fact in the post.

**Saving results:** Steps 2 and 3 each save their output to the tables with one record tool call. That's a single, predictable write, not an open-ended agent. If your builder can map step outputs straight to the table without counting as a step, that's even cleaner.

## 7. Checks without code or approval steps

- **Fixed output structures** make each agent return its claim list, results, counts, and status. Missing parts get caught by the structure, not by luck.
- **The status is a flag on the record, not a stopping point.** "Needs clinician attention" shows up in the table view so the team sees it first.
- **Clinical sign-off happens after the workflow ends.** I'd push back on one thing here: material going to patients should be signed off by a clinician before it's published. Your no-approval-step rule still holds, because the workflow never pauses. Every article simply lands as **"Clinical review"**, and a person moves it to Approved.
- **Watch the trend.** If most weeks come back "Corrected," the writer's instructions or the style guide need work. You'll see that in the Claim Checks table.

## 8. Optional upgrades (within three steps)

- **Frontier model for Step 3:** small cost, slightly better wording. Only worth it if the posts feel flat.
- **Article published as a page or document:** the final article can go out as a formatted document or CMS page instead of plain text, ready to publish once approved.
- **Searchable source library:** if sources get long (100+ page guidelines), make them searchable and let Steps 1–2 look things up instead of reading the whole thing. Otherwise, passing the full source is simpler and more thorough.

## 9. Assumptions

- **Sources fit in the models' context** (articles, guideline summaries). If not, use the searchable-library option above.
- **Your org:** you're currently in *Cedar Ridge Physical Therapy*. The tables and workflow should be built in whichever organization One Medical's team works in.
- **Saving:** I'm assuming the agents can save with record tools. If the workflow can save outputs directly, use that instead.

## 10. Still needs design work

- **The style guide.** It decides most of the quality, and it needs your team's and a clinician's input. AI can draft it from a few past articles you consider excellent.
- **Test cases:** save 3–5 past topics with known-good articles as sample inputs. Then you can test changes to any one step on its own before rolling them out.

If you'd like, I can draft the style guide skill and the three agents' instructions next.