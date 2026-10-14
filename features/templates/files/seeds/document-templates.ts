/**
 * The featured document templates (Google Docs' gallery, our content):
 * real headings, tables and styling — every one ready to edit, none filler.
 */
import { themedDoc, type DocTheme } from "./document-builder";
import type { SeedTemplate } from "./workbook-templates";

const GRAY = { cl: { rgb: "#5f6368" } };

function doc(
  seedKey: string,
  name: string,
  category: string,
  description: string,
  sortOrder: number,
  markdown: string,
  theme: DocTheme,
): SeedTemplate {
  return { seedKey, kind: "document", name, category, description, sortOrder, snapshot: themedDoc(markdown, name, theme) as Record<string, unknown> };
}

const resumeClassic = () =>
  doc("doc-resume-classic", "Resume — Classic", "Work", "A one-page serif resume with clear sections.", 10, `# Elena Marquez

Portland, OR · (503) 555-0186 · elena.marquez@fastmail.com · linkedin.com/in/elenamarquez

## Summary

Operations manager with nine years of experience running multi-site food service businesses. Cut waste 22% across four locations, built hiring pipelines that halved turnover, and opened two stores on time and under budget.

## Experience

### Harbor Coffee Roasters — Director of Operations

*Portland, OR · 2021 – present*

- Lead operations for 4 cafés and a roastery with 68 staff and $7.4M annual revenue
- Rolled out a shared inventory system that cut weekly waste from 9% to 7%
- Opened the Alberta Street café in 11 weeks, 6% under its build-out budget

### Fernwood Grocers — Store Manager

*Eugene, OR · 2017 – 2021*

- Ran a 22,000 sq ft store with 41 employees; grew same-store sales 14% in two years
- Designed a cross-training program adopted by all five Fernwood stores

## Education

**B.S. Business Administration**, University of Oregon — 2016

## Skills

Team leadership · Inventory planning · P&L ownership · Hiring and training · Square, Toast, NetSuite · Spanish (fluent)
`, { accent: "#202124", font: "Georgia", rules: [
    { match: "Elena Marquez", ts: { fs: 28, bl: 1, cl: { rgb: "#202124" } }, align: "center", spaceBelow: 2 },
    { match: /^Portland, OR ·/, ts: { fs: 10, ...GRAY }, align: "center", spaceBelow: 14 },
    { match: /^(Portland|Eugene), OR · \d/, ts: { fs: 10, it: 1, ...GRAY } },
  ] });

const resumeModern = () =>
  doc("doc-resume-modern", "Resume — Modern", "Work", "A clean resume with a colored name and skills table.", 20, `# Jordan Okafor

**Product Designer** · Seattle, WA · jordan@okafor.design · (206) 555-0134 · okafor.design

## Profile

Product designer who turns messy workflows into calm, fast tools. Six years designing B2B software, most recently leading design for a scheduling product used by 3,000 clinics.

## Experience

### Lumen Health — Lead Product Designer (2022 – present)

- Led the redesign of appointment booking; booking time fell from 4 minutes to 70 seconds
- Built and maintain the design system used by 5 product teams (140 components)
- Run weekly research sessions with clinic front-desk staff

### Northwind — Product Designer (2019 – 2022)

- Designed the analytics dashboard that became the top driver of plan upgrades
- Partnered with engineering to ship accessibility fixes across 60 screens (WCAG 2.1 AA)

## Skills

| Design | Research | Tools |
|---|---|---|
| Interaction design | Usability testing | Figma |
| Design systems | Interviews | FigJam |
| Prototyping | Journey mapping | Framer |

## Education

**B.F.A. Interaction Design**, California College of the Arts — 2018
`, { accent: "#1a73e8", rules: [
    { match: "Jordan Okafor", ts: { fs: 30, bl: 1, cl: { rgb: "#1a73e8" } }, spaceBelow: 2 },
    { match: /^Product Designer ·/, ts: { fs: 10, ...GRAY }, spaceBelow: 12 },
  ] });

const coverLetter = () =>
  doc("doc-cover-letter", "Cover letter", "Work", "A focused cover letter that matches the resume.", 30, `# Jordan Okafor

jordan@okafor.design · (206) 555-0134 · Seattle, WA

October 12, 2026

Hiring Team

Cascade Fitness

1200 Westlake Avenue N, Seattle, WA 98109

Dear Hiring Team,

I'm applying for the Senior Product Designer role on the Member Experience team. I've spent the last four years making scheduling simple for busy people, and Cascade's goal of getting members from "I should work out" to a booked class in under a minute is exactly the problem I love.

At Lumen Health I led the redesign of appointment booking for 3,000 clinics. By watching front-desk staff work and testing every week, we cut booking time from four minutes to seventy seconds and reduced support tickets about scheduling by a third.

I'd bring the same habits to Cascade: talk to members early, prototype quickly, and measure what changes. I'd welcome the chance to walk you through the booking redesign and hear where the class-booking flow is today.

Thank you for your time.

Sincerely,

Jordan Okafor
`, { accent: "#1a73e8", rules: [
    { match: "Jordan Okafor", ts: { fs: 22, bl: 1, cl: { rgb: "#1a73e8" } } },
    { match: /^jordan@okafor/, ts: { fs: 10, ...GRAY }, spaceBelow: 18 },
  ] });

const letter = () =>
  doc("doc-letter", "Letter", "Personal", "A warm personal letter.", 40, `October 12, 2026

Dear Aunt Ruth,

Thank you so much for the quilt. It arrived on Thursday, and Maya hasn't let it out of her sight since — it's on her bed, on the couch, and on Saturday it came along to the park for a picnic. She calls the blue squares "the ocean ones."

Things here are good. Sam started his new job at the library in September and loves it, especially story time on Wednesdays. The garden gave us more tomatoes than we could eat, so I finally tried your green tomato chutney recipe. It came out a little sweet, but everyone asked for seconds.

We'd love for you to come for Thanksgiving if you're up for the drive. We'll have the guest room ready and the coffee strong.

With love,

Claire
`, { accent: "#202124", font: "Georgia", bodySize: 12, rules: [
    { match: "October 12, 2026", align: "right", spaceBelow: 18, ts: GRAY },
  ] });

const proposal = () =>
  doc("doc-proposal", "Project proposal", "Project management", "Goals, scope, timeline, budget and risks.", 50, `# Customer Portal Redesign

Project proposal · Prepared by Grace Okafor · October 12, 2026

## Summary

Our customer portal is the main way 4,200 business customers manage invoices, users and support requests. Half of all support tickets are about tasks the portal should make easy. We propose a 10-week redesign focused on billing, user management and self-serve support.

## Goals

- Cut portal-related support tickets by 40% within three months of launch
- Let an account admin add a user in under 30 seconds
- Reach a task-success rate of 90% in moderated usability tests

## Scope

**In scope:** billing and invoices, user and role management, help center search, the account dashboard.

**Out of scope:** the mobile app, single sign-on changes, the public marketing site.

## Timeline

| Phase | Dates | Outcome |
|---|---|---|
| Discovery | Oct 5 – Oct 23 | Interviews, ticket analysis, goals signed off |
| Design | Oct 26 – Nov 13 | Tested prototypes for the three core flows |
| Build | Nov 9 – Dec 4 | Two sprints, feature-flagged release |
| Beta & launch | Nov 30 – Dec 11 | 20 beta customers, then general release |

## Budget

| Item | Cost |
|---|---|
| Design (2 designers, 6 weeks) | $54,000 |
| Engineering (4 engineers, 5 weeks) | $96,000 |
| Research incentives | $3,000 |
| **Total** | **$153,000** |

## Risks

- **Engineering capacity** overlaps with the Q4 billing migration — we will stagger sprint 2.
- **Beta recruitment** may run slow; customer success has pre-identified 35 candidates.
`, { accent: "#3949ab", rules: [
    { match: "Customer Portal Redesign", ts: { fs: 30, bl: 1, cl: { rgb: "#3949ab" } }, spaceBelow: 4 },
    { match: /^Project proposal ·/, ts: { fs: 10, ...GRAY }, spaceBelow: 16 },
  ] });

const meetingNotes = () =>
  doc("doc-meeting-notes", "Meeting notes", "Work", "Attendees, agenda, decisions and action items.", 60, `# Weekly product sync

October 12, 2026 · 10:00 – 10:45 AM · Conference room B and video

**Attendees:** Grace Okafor, Priya Raman, Ana Lucía Ortega, Tom Nguyen, Hana Sato

## Agenda

1. Beta feedback from the first 8 customers
2. Billing migration timing
3. Support ticket trends

## Notes

- Beta customers like the new user-management page; two found the role names confusing ("Manager" vs "Admin").
- Billing migration moves to the week of Nov 16 so it does not collide with sprint 2.
- Portal tickets fell 18% week over week; password resets are still the top category.

## Decisions

- Rename roles to "Owner", "Admin" and "Member" before the wider beta.
- Hold the help-center launch until search returns the top 50 articles reliably.

## Action items

| Owner | Action | Due |
|---|---|---|
| Ana | Update role names in designs and copy | Oct 14 |
| Priya | Confirm sprint 2 scope with the billing team | Oct 15 |
| Tom | Share ticket breakdown by category | Oct 16 |
| Hana | Invite 12 more beta customers | Oct 19 |
`, { accent: "#0b8043", rules: [
    { match: "Weekly product sync", ts: { fs: 26, bl: 1, cl: { rgb: "#0b8043" } }, spaceBelow: 2 },
    { match: /^October 12, 2026 · 10:00/, ts: { fs: 10, ...GRAY }, spaceBelow: 10 },
  ] });

const report = () =>
  doc("doc-report", "Report", "Work", "A structured report with findings and recommendations.", 70, `# Q3 2026 Customer Support Report

Prepared by Hana Sato, Support Lead · October 12, 2026

## Executive summary

Support handled 9,840 conversations in Q3, up 12% from Q2, while median first-response time improved from 2h 40m to 1h 55m. Satisfaction held at 94%. Password and login issues remain the largest category and are the clearest opportunity for self-service.

## Key metrics

| Metric | Q2 | Q3 | Change |
|---|---|---|---|
| Conversations | 8,786 | 9,840 | +12% |
| Median first response | 2h 40m | 1h 55m | −28% |
| Resolution within 24h | 81% | 86% | +5 pts |
| CSAT | 94% | 94% | — |

## Findings

**Login issues lead volume.** 27% of conversations were password resets or sign-in problems, most from customers with more than one account.

**Billing questions spike at month end.** Volume triples on the last two business days of each month, driven by invoice downloads and tax forms.

**Help-center use is growing.** Article views rose 31%, and customers who viewed an article first were 40% less likely to open a conversation.

## Recommendations

1. Ship self-serve password reset for multi-account customers (estimated 1,900 fewer conversations per quarter).
2. Add invoice and tax-form downloads to the billing page.
3. Staff an extra shift on the last two business days of each month.
`, { accent: "#174ea6", rules: [
    { match: "Q3 2026 Customer Support Report", ts: { fs: 26, bl: 1, cl: { rgb: "#174ea6" } }, spaceBelow: 2 },
    { match: /^Prepared by Hana Sato/, ts: { fs: 10, ...GRAY }, spaceBelow: 14 },
  ] });

const brochure = () =>
  doc("doc-brochure", "Brochure", "Work", "A one-page brochure for a small business.", 80, `# Juniper & Pine Studio

Brand and web design for independent businesses

## Who we are

We're a three-person studio in Portland that helps cafés, shops and clinics look as good as they are. We work with a handful of clients at a time, so you always talk to the people doing the work.

## What we do

| Service | What you get | Typical timeline |
|---|---|---|
| Brand identity | Logo, colors, type, a one-page guide | 4 weeks |
| Website | Design and build, up to 8 pages | 6–8 weeks |
| Packaging | Labels, bags, boxes ready for print | 3–5 weeks |

## Recent work

**Harbor Coffee Roasters** — a new identity across four cafés and retail bags, launched in time for their tenth anniversary.

**Lumen Dental Group** — a calm, friendly website that doubled online appointment requests.

## Let's talk

Book a free 30-minute call at juniperpine.studio or email hello@juniperpine.studio.

418 Alder Street, Portland, OR 97205 · (503) 555-0148
`, { accent: "#2e7d32", rules: [
    { match: "Juniper & Pine Studio", ts: { fs: 32, bl: 1, cl: { rgb: "#2e7d32" } }, align: "center", spaceBelow: 2 },
    { match: "Brand and web design for independent businesses", ts: { fs: 13, it: 1, ...GRAY }, align: "center", spaceBelow: 16 },
    { match: /^418 Alder Street/, ts: { fs: 10, ...GRAY }, align: "center" },
    { match: /^Book a free 30-minute call/, align: "center" },
  ] });

const newsletter = () =>
  doc("doc-newsletter", "Newsletter", "Personal", "A community newsletter with sections and an events table.", 90, `# The Elm Street Neighbor

Fall 2026 · News from the Elm Street Neighborhood Association

## Block party recap

Thanks to everyone who came out on September 19! More than 200 neighbors stopped by, the bake sale raised $1,140 for the Elm Street Library, and the kids' bike parade was the longest yet. Special thanks to the Nguyen family for the lemonade stand that never ran dry.

## Tree planting on November 8

The city is giving us 40 free street trees. Volunteers will meet at the corner of Elm and 3rd at 9 AM; gloves and shovels provided. Sign up with Marcus Bell at the library desk.

## Upcoming events

| Date | Event | Where |
|---|---|---|
| Oct 24 | Pumpkin carving night | Community hall |
| Nov 8 | Tree planting | Elm & 3rd |
| Nov 19 | Association meeting | Library, room 2 |
| Dec 12 | Winter lights walk | Starts at the park |

## Neighbor spotlight

Isla Murphy has run the Saturday book swap for six years. Her tip: "Bring one, take one — and always leave a note inside for the next reader."
`, { accent: "#c2185b", rules: [
    { match: "The Elm Street Neighbor", ts: { fs: 30, bl: 1, cl: { rgb: "#c2185b" } }, align: "center", spaceBelow: 2 },
    { match: /^Fall 2026 ·/, ts: { fs: 10, ...GRAY }, align: "center", spaceBelow: 14 },
  ] });

const lessonPlan = () =>
  doc("doc-lesson-plan", "Lesson plan", "Education", "Objectives, materials, timed activities and assessment.", 100, `# Lesson plan: The water cycle

Grade 7 Science · Ms. Rivera · 50 minutes · Tuesday, October 13, 2026

## Objectives

By the end of the lesson students will be able to:

- Describe evaporation, condensation, precipitation and collection
- Explain how energy from the sun drives the water cycle
- Model the cycle with a sealed bag and predict what they will see

## Materials

Zip-top bags, water, blue food coloring, tape, markers, the "Journey of a Water Drop" worksheet.

## Lesson sequence

| Time | Activity | Notes |
|---|---|---|
| 0–5 min | Warm-up: Where did the puddle go? | Collect three student ideas |
| 5–15 min | Mini-lesson with diagram | Introduce the four stages |
| 15–30 min | Water cycle in a bag | Pairs tape bags to a sunny window |
| 30–42 min | Journey of a Water Drop | Students write a first-person story |
| 42–50 min | Exit ticket | Two questions, collected at the door |

## Assessment

Exit ticket: (1) name the stage where clouds form; (2) explain why the bag will look different tomorrow.

## Differentiation

Provide a labeled diagram for students who need support; challenge early finishers to add transpiration to their story.
`, { accent: "#f57c00", rules: [
    { match: "Lesson plan: The water cycle", ts: { fs: 26, bl: 1, cl: { rgb: "#f57c00" } }, spaceBelow: 2 },
    { match: /^Grade 7 Science ·/, ts: { fs: 10, ...GRAY }, spaceBelow: 12 },
  ] });

const businessLetter = () =>
  doc("doc-business-letter", "Business letter", "Work", "A formal letter with letterhead and reference line.", 110, `# Northgate Logistics

2250 Industrial Way, Tacoma, WA 98421 · (253) 555-0170 · northgatelogistics.com

October 12, 2026

Ms. Marisol Vega

Harbor Coffee Roasters

92 Wharf Road

Astoria, OR 97103

**Re: Delivery schedule for the holiday season**

Dear Ms. Vega,

Thank you for renewing your distribution agreement with Northgate Logistics. To keep your four cafés stocked through the holidays, we are adding a second weekly delivery from November 16 through January 8.

Deliveries will arrive on Tuesdays and Fridays between 6:00 and 8:00 AM. Your account rate stays the same, and there is no charge for the added route. If you would prefer a different window for the Alberta Street location, please let us know by November 2.

We appreciate your business and look forward to a busy, successful season together.

Sincerely,

Robert Lin

Account Manager, Northgate Logistics

robert.lin@northgatelogistics.com
`, { accent: "#37474f", rules: [
    { match: "Northgate Logistics", ts: { fs: 22, bl: 1, cl: { rgb: "#37474f" } }, spaceBelow: 2 },
    { match: /^2250 Industrial Way/, ts: { fs: 9, ...GRAY }, spaceBelow: 24 },
  ] });

const recipe = () =>
  doc("doc-recipe", "Recipe", "Personal", "Ingredients, steps and notes for a favorite dish.", 120, `# Lentil soup with lemon and spinach

Serves 6 · Prep 15 min · Cook 40 min

A bright, filling soup that keeps for days and freezes well.

## Ingredients

| Amount | Ingredient |
|---|---|
| 2 tbsp | Olive oil |
| 1 large | Yellow onion, diced |
| 2 | Carrots, diced |
| 3 cloves | Garlic, minced |
| 1 ½ tsp | Ground cumin |
| 1 ½ cups | Brown or green lentils, rinsed |
| 7 cups | Vegetable broth |
| 4 cups | Baby spinach |
| 1 | Lemon, juiced |

## Steps

1. Warm the oil in a large pot over medium heat. Cook the onion and carrots for 8 minutes, until soft.
2. Stir in the garlic and cumin and cook for 1 minute, until fragrant.
3. Add the lentils and broth. Bring to a boil, then simmer partly covered for 30 minutes.
4. Stir in the spinach until wilted, then the lemon juice. Season with salt and pepper.

## Notes

For a creamier soup, blend a third of it and stir it back in. Keeps 5 days in the fridge or 3 months frozen.
`, { accent: "#bf360c", font: "Georgia", rules: [
    { match: "Lentil soup with lemon and spinach", ts: { fs: 26, bl: 1, cl: { rgb: "#bf360c" } }, spaceBelow: 2 },
    { match: /^Serves 6 ·/, ts: { fs: 10, ...GRAY }, spaceBelow: 6 },
    { match: /^A bright, filling soup/, ts: { it: 1 }, spaceBelow: 10 },
  ] });

export function documentSeeds(): SeedTemplate[] {
  return [resumeClassic(), resumeModern(), coverLetter(), letter(), proposal(), meetingNotes(), report(), brochure(), newsletter(), lessonPlan(), businessLetter(), recipe()];
}
