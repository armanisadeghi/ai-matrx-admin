# Dental appointment reminders: recommended design

**In short:** build this as a scheduled **workflow**. Most of the steps should be plain rules, not AI. Use AI in three small places where it actually helps. Writing every text with AI and running everything through one big agent would cost more and give less predictable results.

---

## 1. What this has to do every day

Your request mixes two timings: it says the reminders go out *weekly*, but it works from *tomorrow's* appointments. The 48-hour confirmation rule only works with a **daily** run. Each day, the system should:

1. **Send reminders** to patients whose appointments fall within the reminder window.
2. **Track replies** as they come in: confirmed, cancelled, wants to reschedule, or unclear.
3. **Flag** any patient who got a reminder 48 or more hours ago and still hasn't confirmed.
4. **Brief the front-desk manager** with a short summary.

**What stays the same:** your office's voice, the message templates, office details (address, parking, cancellation policy), and the rules.
**What changes each day:** the appointment list and the patients' replies.

## 2. Recommendation

Use **one scheduled workflow** that runs every morning, plus a small reply-handling step that runs whenever a patient texts back.

- **Not one big agent:** sending, tracking and counting have to be exactly right every time. That's a job for rules, not for a model deciding as it goes.
- **Not an orchestra:** there's nothing here for a group of agents to coordinate.

## 3. Settings (choose once, change any time)
| Setting | Suggested default |
|---|---|
| How many days before the appointment the first reminder goes out | 2 days (so the 48-hour flag lands the day before) |
| Confirmation window before a patient is flagged | 48 hours |
| Send time | 10:00 local; never before 8am or after 8pm |
| Second nudge for unconfirmed patients | On, sent the day before |
| Who gets the summary, and how | Front-desk manager, by email and in-app |
| Personalize messages with AI | Off. Templates only (see step 2 below) |
| Preview mode (staff approve the batch before it sends) | On for the first 2 weeks |

The only thing each run *needs* is the appointment list, and that should arrive automatically, not be pasted in every day (see the assumptions in section 9).

## 4. Where the data lives

- **Patients:** the platform's CRM contacts, with extra fields added for SMS consent and preferred name. If you'd rather keep patients separate from business contacts, use a custom table instead.
- **Appointments** (custom table): patient, date and time, provider, visit type, and a status of *pending*, *reminded*, *confirmed*, *cancelled*, *reschedule requested* or *flagged*.
- **Message log:** every text sent and every reply, with what the system decided the reply meant and how sure it was. Use the platform's SMS records if they link to the appointment; otherwise a custom table.
- **Templates** (saved asset): your approved reminder wording for each visit type.
- **Daily summaries:** one record per day, so you can see trends like confirmation rates and no-shows.

Every appointment ends each run with a recorded status, including the ones that were skipped (for example "no mobile number" or "opted out").

## 5. Steps

**Setup (done once, redone only when you want to change the wording)**
- **Draft the templates.** A top-tier model writes 3–5 warm reminder templates for each visit type (cleaning, new patient, procedure, child visit), with blanks for name, date, time and provider. You edit and approve them.
- **Why:** this is where good writing pays off, and you only pay for it once. Afterwards every text is consistent, already approved, and costs nothing to produce.

**Daily run**
1. **Pull the appointments** in the reminder window. *Rules, no AI.*
2. **Build the messages.** *Rules, no AI.* Fill in the templates, check that each patient has a valid mobile number and SMS consent, apply quiet hours, and send.
   - With 40 patients a day, AI-written texts would cost money, add risk, and wouldn't read noticeably warmer than a good template with the patient's name in it.
   - **AI also can't slip health details into a text.** Reminder texts shouldn't mention procedures beyond something general like "your visit".
3. **Flag unconfirmed patients.** *Rules, no AI:* reminder sent 48+ hours ago and no confirmation. Send the second nudge if that setting is on.
4. **Write the manager summary.**
   - The numbers (sent, confirmed, cancelled, flagged, could not reach) are counted by rules first.
   - **One call to a small, cheap model** then writes 3–5 sentences of plain-language notes around those numbers, such as "Two new patients tomorrow are unconfirmed; Dr. Lee's 9am slot is at risk."
   - **Why the split:** AI doesn't do the counting, so it can't miscount.

**Whenever a patient replies**
5. **Sort the reply.** Use the **decision model**, the platform's fast, very cheap yes-or-choice model, to put each reply in one bucket: *confirm, cancel, reschedule request, question,* or *other*.
   - **Why:** patients write things like "yep see u then 👍" or "can we do Thursday instead?", which simple keyword rules miss.
   - It returns a confidence score. **Anything below 85% confidence goes to a "needs a human" list** and is never acted on automatically.
   - It updates the appointment's status. Cancellations and reschedule requests go to the front desk right away; it never books anything itself.

## 6. Checks and what happens when one fails

- **Counts must add up:** sent + skipped + failed = appointments pulled. If they don't, the summary says so prominently.
- **Pulled zero appointments on a weekday:** almost certainly the data feed broke. Alert the manager and don't send an "all clear".

## 7. Optional upgrades

- **Weekly trends note** (one mid-tier model call a week): confirmation and no-show patterns by day, provider and visit type, built from the daily summaries.
