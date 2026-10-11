# AP Biology weekly quiz system: design

## 1. What this has to do every week

You'll run this every week of the year, so the job is bigger than one quiz. You need a system that takes any AP Bio chapter, writes a quiz that tests real understanding, grades the class's answers fairly, and records the grades. You check the important steps.

**Things that stay the same (set up once):**
- The course framework: AP Biology units, learning objectives and science practices
- Your class list and sections
- Your grading policy: partial credit, how many points each question type is worth, rounding
- Your quiz style: how hard, how long, how you like questions worded

**Things that change each week:**
- The chapter
- How many questions and what mix of types
- The due date
- The students' answers

## 2. Recommendation: one workflow with two human checkpoints

This should be a **workflow**, not one agent. Each split below buys something specific:
- Grading multiple choice needs no AI at all.
- Short answers can be graded by a cheaper model running in parallel.
- You approve the quiz before students see it, and the grades before they post.

The platform can pause a workflow for days, so one run covers the whole week from chapter to gradebook. Every question, answer and score stays linked together.

## 3. What you give it each week

<artifact type="table" id="90bec3f2-3d21-418c-beed-959243329ae6" version="1" title="Table 1">
| Input | Required? | Default |
|---|---|---|
| Chapter (PDF, slides, pasted text, or a photo of the pages) | **Yes** | — |
| Number of questions | No | AI decides from the content (usually 10–15) |
| Mix of question types | No | Mostly multiple choice, 2–3 short answers, 1 AP-style free-response question |
| Difficulty | No | AP exam level |
| Topics to stress or skip | No | None |
| Section(s) taking it | No | All sections |
| Due date | No | 7 days after you approve the quiz |
</artifact>


## 4. Where things are stored

Nothing gets left in a chat. The platform's education system already handles quizzes, so the quiz goes there. I'm not sure it has a built-in gradebook. If it doesn't, I'd add a few simple custom tables:

- **Chapters:** the chapter file plus its saved teaching points
- **Questions:** each question with its answer key, scoring rubric, and the learning objective it tests
- **Submissions:** one per student per quiz
- **Answers:** one per question per student, with score, feedback, and whether it needs your review
- **Gradebook:** one entry per student per quiz, linked to the student and the quiz

## 5. Steps

**Step 1: Pull out the teaching points.** A frontier model, no tools.
- It reads the chapter and lists:
  - the key ideas
  - the AP learning objectives each one covers
  - the common misconceptions students have
  - which ideas are best tested with data, graphs or experiments
- It saves this list with the chapter.
- **Why it's a separate step:** this is where "checks real understanding" comes from. Wrong answer choices built from real misconceptions tell you who truly understands. The saved list can also feed flashcards or a review sheet later.

**Step 2: Write the quiz.** A frontier model, in the same conversation as Step 1, so it keeps everything it just worked out.
- Questions focus on applying ideas, reading data and reasoning about experiments, not definitions.
- Each question comes with:
  - the answer key
  - a scoring rubric for written answers, built point by point like the official AP scoring guides
  - why each wrong choice is wrong
  - the learning objective it tests
- It comes back as an interactive quiz you can click through.

**Step 3: You review the quiz.** The workflow pauses. You approve it, edit it, or reject it with a note so it gets rewritten. A teacher should see every quiz before students do.

**Step 4: Students take it.**
- **Default:** the platform gives students a quiz link (a public form). Answers go straight into the Submissions and Answers tables.
- **Paper option:** you upload photos of handwritten answer sheets. The platform reads handwriting automatically.

**Step 5: Grade multiple choice.** Simple code compares answers to the key. No AI, instant, free, and never wrong.

**Step 6: Grade written answers.** A mid-size model, no tools.
- It grades one student answer at a time, all running in parallel.
- It works from the rubric and the teaching points, awarding each rubric point separately.
- It writes a one-line comment for the student.
- It flags answers it isn't confident about.
- **Why it's split this way:**
  - Grading answers separately keeps each score fair, so one answer doesn't affect another.
  - Every answer shares the same instructions, which the platform caches, so a full class costs very little.
  - The rubric already holds the judgment, so a frontier model isn't needed here.

**Step 7: You approve the grades.** You see the full grade list with flagged answers at the top. Change any score, then approve. Grades affect students, so a person signs off, and the record shows how every score was reached.

**Step 8: Post the gradebook entries and the class report.**

## 6. Automatic checks (free code, run after the AI steps)

- **Completeness:**
  - every question has a key and a rubric
  - every student on the class list has a submission or is marked missing
  - points add up to the total
- **Rubric sanity:**
  - If almost everyone scores the same on a written question, the rubric probably isn't separating strong answers from weak ones.
  - That question gets flagged in your review rather than quietly passing through.
- **Question health:**
  - If more than **70%** of students miss a question, it's flagged as either a flawed question or something to reteach.
  - If 100% get it right, it's flagged as possibly too easy.
  - 70% is a setting you can change.
- **Blank or off-topic answers:** scored 0 and flagged, never guessed at.

None of these stop the run. They show up as flags in your review, which is enough at this scale.

## 7. Optional extras (add one at a time, only if you want them)

- **Re-grade flagged answers with a frontier model before you see them.** Fewer flags to review, for a little extra cost on a few answers.
- **Reteach pack:** flashcards and a short review sheet built from the concepts the class missed, made from the saved teaching points. Cheap, and it turns the quiz results into next week's warm-up.
- **Longer feedback for each student** instead of one line. More useful to students, and costs more for every student.

## 8. What you get each week

- An interactive quiz preview to approve
- A grading review screen with flagged answers first
- Gradebook entries for every student
- A **class report:**
  - average and spread of scores
  - the misconceptions that showed up most
  - the questions that may need a fix
  - suggested topics to reteach

That report is the biggest win over grading by hand.

## 9. Assumptions

- **Gradebook:** if you keep grades in Google Classroom, PowerSchool or another system, I need to check whether the platform can connect to it. If it can, the last step posts there. If not, the gradebook table exports to a spreadsheet you can import.
- **Student privacy:** student names and grades should stay inside your organization's account, and you should check that this fits your school's student-privacy rules.
- **AP framework:** I'm assuming you'll upload the official AP Biology course framework (the College Board's Course and Exam Description) once, so the system can match questions to the real learning objectives. Without it, the model uses its own knowledge, which is good but less exact.

## 10. Two answers I need before building

1. **How do students submit?** A quiz link, paper, or something you already use, such as Google Forms?
2. **Where does your official gradebook live?**

Both change only the input and output ends of the design. The core stays the same. Answer those two and I can turn this into a build plan.