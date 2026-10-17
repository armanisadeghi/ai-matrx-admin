# AP Biology weekly quiz system: design

## 1. The job as a system

You don't need one quiz. You need a weekly cycle that works for any chapter:

**chapter in → quiz that tests understanding → students answer → answers graded → grades in the gradebook**

- **Same every week:** the course (AP Biology), your class sections and roster, your grading scale, the AP framework (units, big ideas, science practices), and your view of what a good question looks like. Set these up once.
- **Changes every week:** the chapter, the quiz, and the student answers.

Each week gets two runs: one to make the quiz, then one per student submission. You stay in control at the two points that matter: approving the quiz and approving the grades.

## 2. Recommendation

Build **two small workflows** that share a few tables:

- **A. Quiz Builder.** You start it once a week.
- **B. Grader.** It starts on its own each time a student submits.

You don't need an orchestra, and nothing here needs an open-ended agent. The path is the same every week, so every step can be planned in advance.

Why two workflows instead of one? Making the quiz happens once, and you start it. Grading happens 30+ times, whenever students submit. Each half runs on its own schedule, so splitting them costs nothing.

## 3. What you provide up front

**Quiz Builder inputs:**
| Input | Required? | Default |
|---|---|---|
| Chapter (PDF, Word, slides, pasted text or a link) | **Yes** | — |
| Chapter number and title | Yes | Read from the chapter |
| Section(s) this quiz is for | No | All your AP Bio sections |
| Number of questions | No | AI decides from the content (usually 10–15) |
| Question mix | No | Mostly multiple choice, plus 2–3 short answers in AP free-response style |
| Include data or graph questions | No | Yes when the chapter supports it (AP-style) |
| Difficulty | No | AP exam level |
| Due date | No | 7 days out |
| Topics to emphasize or skip | No | None |

**One-time course settings:** roster, sections, grading scale, points per question type, and optionally the AP Biology Course and Exam Description uploaded as knowledge. That last one lets every question be tagged to an official learning objective. It's worth doing, because your gradebook then shows which skills each student is weak on, not just a percentage.

## 4. Where things live

The platform has an education system with quiz records. Store quizzes there if its fields fit. The gradebook and roster are almost certainly your own custom tables. Your organization has none yet, so these would be new:

- **Students:** name, section, student ID or email
- **Chapters:** the chapter file, plus its saved **teaching-points asset** (see Step 1)
- **Quizzes:** linked to a chapter, with status (draft, approved, open, closed) and due date
- **Questions:** text, type, answer key, scoring rubric, AP learning objective, the misconception each wrong answer targets
- **Submissions:** one per student per quiz, with each answer and its score, feedback, the grader's confidence, and a status (auto-graded, AI-graded, flagged, teacher-approved)
- **Gradebook:** one row per student per quiz, with score, percentage and status. It's posted only after you approve.

Every grade keeps a full record of who or what produced it and every change made to it.

## 5. Steps

### Workflow A: Quiz Builder (weekly, about 2 minutes of your time)

**Step 1. Pull out what matters in the chapter.**
- **Who does it:** a frontier model, no tools. The input is small, it runs once a week, and the judgment matters a lot.
- **What it produces:** the chapter's key concepts, the reasoning chains students must be able to follow (cause → effect, structure → function), **common student misconceptions**, the vocabulary, and links to AP learning objectives. This is saved to the chapter.
- **What it buys:** a reusable asset. Next month's unit review, flashcards or study guide can come from it without rereading the chapter.

**Step 2. Write the quiz.**
- **Who does it:** the same model, in the same conversation, given a fixed follow-up request. It keeps everything it just worked out.
- **The rules it follows:**
  - Questions test application and reasoning, not recall: scenarios, predictions, experimental data.
  - Wrong answers in multiple-choice questions are built from the misconceptions found in Step 1, so a wrong pick tells you *which* misunderstanding a student has.
  - Every short answer comes with a model answer and a point-by-point rubric, written the way AP free-response questions are scored.
- **What you see:** the quiz as an interactive preview, with the answer key and rubrics in your quiz records.

**Step 3. Automatic checks.** These cost nothing.
- Question count and mix match your inputs.
- Each multiple-choice question has exactly one marked answer.
- Every short answer has a rubric.
- The key concepts from Step 1 are covered.
- Not everything is recall-level.

If a check fails, the step is retried once. If it fails again, the quiz is flagged for you.

**Step 4. You review and approve.** The workflow pauses until you approve or edit the quiz. This is the most important step in the whole design: once you've approved the answer key and rubrics, they're *your* rubrics, which is what makes the grading trustworthy.

**Step 5. Publish.** Approving creates the student-facing form, linked to the quiz, and sets the due date.

### Workflow B: Grader (runs on each submission)

It starts automatically when a student submits the form.

**Step 6. Grade multiple choice with simple rules, no AI.** Comparing against the key is free and never wrong. Each wrong pick is tagged with its misconception.

**Step 7. Grade short answers.**
- **Who does it:** a mid-size model, no tools. It's applying criteria you've already approved, which doesn't need a frontier model.
- **How:** one answer at a time, with the question, your approved rubric and the model answer. Grading each answer separately keeps scores absolute instead of relative to whatever else is in the batch.
- **What it returns:** points per rubric item, a short note to the student, and a confidence level.

**Step 8. Draft the gradebook entry.**
- **Who does it:** simple rules. It totals the points, applies your grading scale, and writes the gradebook row as **pending your approval**.
- **What gets flagged for you:** answers the grader was unsure about, and blank or off-topic answers.

**Step 9. Close-out summary.** It runs once at the due date, or when you trigger it.
- **Who does it:** first simple rules for the item analysis: the share of students who got each question right, and which wrong answers were most common.
- **The AI part:** then one mid-size AI call writes a one-page class summary: what the class understands, which misconceptions are widespread, and which students may need a check-in.
- **What gets flagged:** any question almost nobody got right. That usually means a flawed question, not a weak class.
- You approve grades in one batch, flagged ones first, and they post to the gradebook.

## 6. Checks and what happens when they fail
| Check | Where | When it fails |
|---|---|---|
| Quiz structure and coverage | After Step 2 | Retry once, then flag for you |
| Grader confidence | Step 7 | That answer is flagged for your review |
| Question nearly everyone missed (setting, default under 30% correct) | Step 9 | Flagged as a possible bad question, with the option to drop or re-score it |
| Scores bunched together on a short answer | Step 9 | Flagged: the rubric may not separate strong from weak answers |

Nothing posts to the gradebook without your approval. These are students' grades, so a person has to sign off, and the full record is kept. Student data is protected like any education record.

## 7. Optional upgrades

- **Test-taker check** (recommended, roughly cents per week). A different frontier model takes the quiz *without the answer key*. Wherever its answer disagrees with the key, the question is probably ambiguous or the key is wrong. You see this before you approve, so bad questions get caught before students see them.
- **Second grader on borderline short answers.** Answers within 1 point of a grade boundary get graded again on their own, and disagreements are flagged. This costs a little more per quiz and helps most when the stakes are high, like unit tests.
- **Personal feedback sheets.** Each student gets a short note on the misconceptions their wrong answers revealed. It's one cheap call per student.

## 8. What you get each week

- An interactive quiz preview to approve, aligned to AP objectives
- A student form that grades itself as answers arrive
- A review queue with uncertain grades on top, approved in one click
- A gradebook that tracks scores *and* AP skills over the year
- A one-page class summary of what to reteach before moving on

## 9. Assumptions

- **Students submit through a form you share by link.** If they use paper instead, you'd upload photos of the answer sheets (handwriting can be read automatically) and run Workflow B once for the class. If you use Google Classroom or Canvas, the design depends on whether a connector for it is available. If not, students fill in the form and grades are exported as CSV.
- **The gradebook lives in AI Matrx.** If your official gradebook is PowerSchool, Infinite Campus or similar, this one becomes the working copy and you export approved grades. I don't know of a direct connector for those.
- **The education system's quiz records fit your needs.** If they don't, the quiz goes in a custom table instead. Nothing else changes.

## 10. An alternative

If you only use multiple choice, drop Step 7 and the confidence checks. Grading becomes 100% rule-based, free and instant. I'd still keep short answers, though, because they're the best test of real understanding, and grading them is where AI saves you the most time.

## 11. Still needs design work

- **The question-writing instructions in Step 2.** Quiz quality mostly depends on these. Running it on 2–3 chapters you've already taught and comparing against your own quizzes is the fastest way to tune them.
- **Late work, retakes and partial credit.** These are gradebook rules only you can define.

**Your answers to these would firm up the design:**
1. How do students submit work today: online, on paper, or through Google Classroom or another platform?
2. Is the AI Matrx gradebook your official record, or does it need to feed another system?
3. Do you want AP-style free-response questions every week, or only on unit tests?