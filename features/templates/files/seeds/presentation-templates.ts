/**
 * The featured presentation templates (Google Slides' gallery, our content): eight complete decks,
 * each in its own theme, written as a real team would — no filler. Each is the presentation_deck
 * kind exactly as stored (`__kind` on the deck and every slide).
 */
import type { SeedTemplate } from "./workbook-templates";

type Slide = Record<string, unknown>;
const s = (slide: Slide): Slide => ({ __kind: "presentation_slide", ...slide });

function deck(
  seedKey: string,
  name: string,
  category: string,
  description: string,
  sortOrder: number,
  preset: string,
  slides: Slide[],
): SeedTemplate {
  return {
    seedKey,
    kind: "presentation",
    name,
    category,
    description,
    sortOrder,
    snapshot: { __kind: "presentation_deck", title: name, theme: { preset }, slides: slides.map(s) },
  };
}

const pitch = () =>
  deck("deck-pitch", "Pitch deck", "Work", "Ten slides from problem to ask.", 10, "bold", [
    { layout: "title", title: "Tidewater Labs", subtitle: "Water-quality sensors every small town can afford" },
    { layout: "bullets", title: "The problem", bullets: ["1 in 5 US towns under 10,000 people tests its water once a month or less", "Lab tests take 3–5 days; a contamination event spreads in hours", "Commercial sensor networks start at $180,000"] },
    { layout: "image-split", title: "Our solution", bullets: ["Solar-powered probes that report every 10 minutes", "Alerts to the operator's phone in under a minute", "$900 per probe, installed in an afternoon"], extra: { imagePrompt: "water treatment plant sensor" } },
    { layout: "stat", title: "Traction", extra: { stats: [{ value: "34", label: "towns live" }, { value: "212", label: "probes deployed" }, { value: "$41k", label: "monthly recurring revenue" }] } },
    { layout: "two-column", title: "How we win", extra: { columns: [{ title: "Today's options", bullets: ["Monthly lab samples", "$180k sensor networks", "Manual reporting to the state"] }, { title: "Tidewater", bullets: ["Continuous readings", "$900 per probe", "State reports filed automatically"] }] } },
    { layout: "bullets", title: "Business model", bullets: ["Hardware at cost; $79 per probe per month for monitoring", "Gross margin 71% on monitoring", "Average town: 6 probes, $5,700 a year"] },
    { layout: "quote", quote: "We caught a chlorine drop at 2 a.m. that our monthly test would have missed for three weeks.", author: "Ellis Navarro, Utilities Director, Cedar Falls" },
    { layout: "bullets", title: "Team", bullets: ["Priya Raman, CEO — 8 years at the EPA's Office of Water", "Marcus Ode, CTO — built sensor firmware at Particle", "Lena Ruiz, Sales — sold SCADA systems to 120 utilities"] },
    { layout: "section", title: "The ask", description: "$3.5M seed to reach 300 towns in 18 months" },
    { layout: "closing", title: "Thank you", subtitle: "priya@tidewaterlabs.com" },
  ]);

const quarterly = () =>
  deck("deck-quarterly", "Quarterly business review", "Work", "Results, wins, misses and next quarter's plan.", 20, "corporate", [
    { layout: "title", title: "Q3 Business Review", subtitle: "Customer Success · October" },
    { layout: "stat", title: "The quarter in numbers", extra: { stats: [{ value: "96.2%", label: "gross retention" }, { value: "+14%", label: "net revenue retention" }, { value: "4.1 h", label: "median first response" }] } },
    { layout: "bullets", title: "Wins", bullets: ["Renewed all 9 enterprise accounts up this quarter", "Launched the onboarding academy: 312 admins certified", "Cut the support backlog from 840 to 190 tickets"] },
    { layout: "bullets", title: "Misses", bullets: ["Two mid-market churns tied to the reporting gap", "Health-score coverage reached 78%, short of the 90% goal", "Weekend response time slipped to 9 hours"] },
    { layout: "two-column", title: "What we learned", extra: { columns: [{ title: "Keep", bullets: ["Executive check-ins at day 60", "Academy for every new admin"] }, { title: "Change", bullets: ["Flag reporting needs at kickoff", "Add a weekend on-call rotation"] }] } },
    { layout: "bullets", title: "Q4 priorities", bullets: ["Health scores on 100% of accounts by November 15", "Weekend median response under 4 hours", "Reporting add-on offered to all mid-market renewals"] },
    { layout: "closing", title: "Questions", subtitle: "Full metrics in the Q3 workbook" },
  ]);

const kickoff = () =>
  deck("deck-kickoff", "Project kickoff", "Project management", "Goals, scope, team, timeline and risks.", 30, "ocean", [
    { layout: "title", title: "Website Relaunch", subtitle: "Project kickoff · Marketing & Engineering" },
    { layout: "bullets", title: "Why we're doing this", bullets: ["Site conversion fell from 3.1% to 2.2% over the past year", "Mobile pages take 6.8 seconds to load", "Product pages can't be updated without an engineer"] },
    { layout: "two-column", title: "Scope", extra: { columns: [{ title: "In", bullets: ["New design system", "Product and pricing pages", "Editor for the marketing team"] }, { title: "Out", bullets: ["Blog migration (Phase 2)", "Customer portal", "Localization"] }] } },
    { layout: "bullets", title: "Team", bullets: ["Sponsor — Jordan Lee, VP Marketing", "Lead — Amara Chen, Product", "Design — Theo Park · Engineering — Ines Duarte, Sam Okafor"] },
    { layout: "bullets", title: "Timeline", bullets: ["Weeks 1–2: discovery and content audit", "Weeks 3–6: design and component build", "Weeks 7–9: pages, QA and analytics", "Week 10: launch"] },
    { layout: "bullets", title: "Risks", bullets: ["Content approvals slow the build — weekly review slot booked", "Analytics gaps after cutover — dual tracking for 30 days"] },
    { layout: "closing", title: "Let's build it", subtitle: "Next check-in: Thursday 10:00" },
  ]);

const training = () =>
  deck("deck-training", "Training session", "Education", "A workshop with objectives, steps and a recap.", 40, "forest", [
    { layout: "title", title: "Handling Difficult Customer Calls", subtitle: "Support team workshop · 45 minutes" },
    { layout: "bullets", title: "By the end you will", bullets: ["Calm a frustrated caller in the first minute", "Turn a complaint into a clear next step", "Know when and how to escalate"] },
    { layout: "section", title: "1. Listen first", description: "Let the caller finish before you answer" },
    { layout: "bullets", title: "The LEAP method", bullets: ["**Listen** without interrupting", "**Empathize** with one sentence", "**Ask** one clarifying question", "**Propose** a specific next step"] },
    { layout: "quote", quote: "People forget what you said, but they remember how you made them feel.", author: "Maya Angelou" },
    { layout: "bullets", title: "Practice", bullets: ["Pairs: one caller, one agent, 5 minutes", "Swap roles and repeat", "Share one phrase that worked"] },
    { layout: "bullets", title: "Recap", bullets: ["Listen fully, empathize briefly", "One question, one next step", "Escalate early when policy blocks you"] },
    { layout: "closing", title: "Thanks for joining", subtitle: "Slides and scripts are in the team folder" },
  ]);

const caseStudy = () =>
  deck("deck-case-study", "Case study", "Work", "Challenge, approach, results and a client quote.", 50, "editorial", [
    { layout: "title", title: "How Northwind Clinics cut no-shows by 38%", subtitle: "A patient-reminder case study" },
    { layout: "image-split", title: "The challenge", bullets: ["12 clinics, 4,000 appointments a week", "No-show rate of 19%", "Front desks spent 11 hours a week on reminder calls"], extra: { imagePrompt: "medical clinic waiting room" } },
    { layout: "bullets", title: "Our approach", bullets: ["Two-way text reminders at 72 and 24 hours", "One-tap reschedule that fills the freed slot from a waitlist", "A weekly no-show report per clinic"] },
    { layout: "stat", title: "Results after six months", extra: { stats: [{ value: "38%", label: "fewer no-shows" }, { value: "9 h", label: "saved per clinic each week" }, { value: "$410k", label: "recovered annual revenue" }] } },
    { layout: "quote", quote: "Our front desk finally answers the phone for patients instead of chasing them.", author: "Rita Gomez, Operations Director, Northwind Clinics" },
    { layout: "closing", title: "Want results like these?", subtitle: "Book a 20-minute walkthrough" },
  ]);

const launch = () =>
  deck("deck-product-launch", "Product launch", "Work", "Announce a product: what, who, why, when.", 60, "sunset", [
    { layout: "title", title: "Introducing Fieldbook", subtitle: "Inspection reports finished before you leave the site" },
    { layout: "image-full", title: "Built for the field", description: "Works offline, on any phone, with gloves on", extra: { imagePrompt: "construction inspector tablet" } },
    { layout: "bullets", title: "What's new", bullets: ["Photo checklists that write the report as you go", "Voice notes turned into findings", "Signed PDF sent to the client on the spot"] },
    { layout: "two-column", title: "Who it's for", extra: { columns: [{ title: "Inspectors", bullets: ["Half the time per report", "No evening paperwork"] }, { title: "Managers", bullets: ["Every report in one place", "Trends across sites"] }] } },
    { layout: "stat", title: "From the beta", extra: { stats: [{ value: "52%", label: "less time per report" }, { value: "1,900", label: "reports filed" }, { value: "4.8★", label: "inspector rating" }] } },
    { layout: "bullets", title: "Launch plan", bullets: ["Nov 4 — available to all customers", "Nov 6 — webinar for admins", "Nov 18 — mobile app in the stores"] },
    { layout: "closing", title: "Fieldbook is live November 4", subtitle: "fieldbook.app" },
  ]);

const lesson = () =>
  deck("deck-lesson", "Lesson plan", "Education", "A class lesson with a hook, content and a check.", 70, "classic", [
    { layout: "title", title: "The Water Cycle", subtitle: "Grade 5 Science · Lesson 3" },
    { layout: "quote", quote: "Where does a raindrop go after it hits the ground?", author: "Today's question" },
    { layout: "image-split", title: "Four stages", bullets: ["**Evaporation** — the sun heats water into vapor", "**Condensation** — vapor cools into clouds", "**Precipitation** — rain, snow, sleet or hail", "**Collection** — water gathers in oceans, lakes and soil"], extra: { imagePrompt: "rain clouds over lake" } },
    { layout: "two-column", title: "Where water is", extra: { columns: [{ title: "Salt water", bullets: ["97% of Earth's water", "Oceans and seas"] }, { title: "Fresh water", bullets: ["3% of Earth's water", "Mostly ice and groundwater"] }] } },
    { layout: "bullets", title: "Activity", bullets: ["Groups of three: draw the cycle on a poster", "Label each stage with an arrow", "Add one example from your own town"] },
    { layout: "bullets", title: "Check your understanding", bullets: ["What makes water evaporate?", "Why do clouds form higher up?", "Name two places water collects"] },
    { layout: "closing", title: "Great work!", subtitle: "Homework: page 42, questions 1–4" },
  ]);

const portfolio = () =>
  deck("deck-portfolio", "Portfolio", "Personal", "Show your work: about, projects, contact.", 80, "minimal", [
    { layout: "title", title: "Noor Haddad", subtitle: "Product designer · Brooklyn" },
    { layout: "bullets", title: "About me", bullets: ["7 years designing health and finance products", "I start with the people, then the pixels", "Previously at Oscar Health and Betterment"] },
    { layout: "image-split", title: "Clearpay — bill splitting", bullets: ["Redesigned the split flow from 6 steps to 2", "Completion rose from 61% to 88%"], extra: { imagePrompt: "mobile app design on phone" } },
    { layout: "image-split", title: "Oscar — finding a doctor", bullets: ["Search by symptom, not specialty", "Booked visits up 24% in three months"], extra: { imagePrompt: "doctor appointment app" } },
    { layout: "quote", quote: "Noor makes the complicated feel obvious.", author: "Hannah Kim, VP Product, Clearpay" },
    { layout: "closing", title: "Let's work together", subtitle: "noor@haddad.design · haddad.design" },
  ]);

export function presentationSeeds(): SeedTemplate[] {
  return [pitch(), quarterly(), kickoff(), training(), caseStudy(), launch(), lesson(), portfolio()];
}
