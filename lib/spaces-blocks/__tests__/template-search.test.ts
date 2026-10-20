// The one template search, proven on the real library (every committed pack's card face, as published):
// the fifteen queries people type (ADVERSARIAL-1 #1) each find sensible templates, best first. Before this
// module the gallery's literal substring over title + description found 0 for "to do list" and 1 for "kanban";
// `literal` below is that old matcher, kept here so the test shows the gap it closes.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { packCardFace, type SpaceTemplateCardFace, type SpaceTemplatePack } from "../template-pack";
import { agentNounForms, queryConcepts, searchTemplates, stem } from "../template-search";

const DIR = join(__dirname, "../../../features/spaces/templates/packs");
const FACES: SpaceTemplateCardFace[] = readdirSync(DIR)
  .filter((f) => f.endsWith(".pack.json"))
  // A pack another lane is mid-way through writing may not parse yet; the library is the packs that do.
  .flatMap((f) => {
    try {
      return [JSON.parse(readFileSync(join(DIR, f), "utf8")) as SpaceTemplatePack];
    } catch {
      return [];
    }
  })
  .filter((p) => p.pages?.length)
  .map(packCardFace);

const titles = (q: string) => searchTemplates(FACES, q, (f) => f).map((f) => f.title);
const literal = (q: string) =>
  FACES.filter((f) => [f.title, f.description, f.forWho, ...f.tags].some((s) => s?.toLowerCase().includes(q.toLowerCase()))).map((f) => f.title);

/** query → titles that must be among the first five answers (the cards a person means). */
const MUST_LEAD: Record<string, RegExp> = {
  "to do list": /task|to-do/i,
  todo: /task|to-do/i,
  calendar: /calendar|planner|agenda|schedule/i,
  crm: /crm/i,
  budget: /budget/i,
  habit: /habit/i,
  "meeting notes": /meeting/i,
  invoice: /invoice/i,
  recipes: /recipe|meal/i,
  wiki: /wiki|doc|knowledge|handbook/i,
  roadmap: /roadmap/i,
  journal: /journal|diary/i,
  "client portal": /client portal/i,
};

describe("searchTemplates over the real library", () => {
  it("has the library to search", () => {
    expect(FACES.length).toBeGreaterThan(60);
  });

  it.each(Object.keys(MUST_LEAD))("%s finds sensible templates, the meant one near the top", (q) => {
    const found = titles(q);
    expect(found.length).toBeGreaterThan(0);
    expect(found.slice(0, 5).some((t) => MUST_LEAD[q].test(t))).toBe(true);
  });

  it.each(["kanban", "board"])("%s finds the templates that open on a board, main boards first, never the whole library", (q) => {
    const found = searchTemplates(FACES, q, (f) => f);
    const opensOnBoard = FACES.filter((f) => f.layouts?.includes("kanban"));
    // ADVERSARIAL-2 #3: every table's install plan carries a spare board, so "kanban" matched 172 of 172.
    expect(found.length).toBeLessThan(FACES.length);
    expect(found.length).toBeGreaterThanOrEqual(opensOnBoard.length);
    for (const f of found) expect(f.layouts?.includes("kanban") || /board|kanban/i.test(`${f.title} ${f.tags.join(" ")} ${f.description}`)).toBe(true);
    const top = found.slice(0, 5);
    expect(top.every((f) => f.layouts?.[0] === "kanban" || /board|kanban/i.test(f.title))).toBe(true);
  });

  /** ADVERSARIAL-2 #3: a person names their trade or job; the card names its business. */
  const TRADE_LEADS: Record<string, RegExp> = {
    plumber: /plumbing/i,
    accountant: /accounting/i,
    dentist: /dental/i,
    // Any law practice: Estate Planning Practice carries "lawyer" as its own tag, so it may lead.
    lawyer: /law firm|estate planning|immigration|injury/i,
    attorney: /law firm|estate planning|immigration|injury/i,
    realtor: /real estate/i,
    "real estate agent": /real estate/i,
    salon: /salon|barber/i,
    stylist: /salon|barber/i,
    restaurant: /restaurant/i,
    "law firm": /law firm/i,
    roofer: /roofing/i,
    landscaper: /landscaping/i,
  };
  it.each(Object.keys(TRADE_LEADS))("%s finds its industry template first", (q) => {
    const found = titles(q);
    expect(found.length).toBeGreaterThan(0);
    expect(found[0]).toMatch(TRADE_LEADS[q]);
  });

  it("ADVERSARIAL-6 F5: a named collection is the answer — the count is the cards that carry the phrase, not every 'design' mention", () => {
    // Every published card, page-less design starters included (the galleries list all 183).
    const ALL = readdirSync(DIR)
      .filter((f) => f.endsWith(".pack.json"))
      .flatMap((f) => {
        try {
          return [packCardFace(JSON.parse(readFileSync(join(DIR, f), "utf8")) as SpaceTemplatePack)];
        } catch {
          return [];
        }
      });
    const found = searchTemplates(ALL, "design system", (f) => f).map((f) => f.title);
    const named = ALL.filter((f) => /design system/i.test(f.title) || f.tags.some((t) => t.toLowerCase() === "design system")).map((f) => f.title);
    expect(named.length).toBeGreaterThanOrEqual(11);
    expect([...found].sort()).toEqual([...named].sort());
    // One card naming the phrase leads a broad answer instead ("to do list" still finds the todo templates).
    expect(titles("to do list").length).toBeGreaterThanOrEqual(3);
  });

  it("a short word never matches inside a longer one (law is not lawn), and gym is not a barbershop", () => {
    expect(titles("law").some((t) => /lawn/i.test(t))).toBe(false);
    expect(titles("gym").some((t) => /barber|salon|spa/i.test(t))).toBe(false);
  });

  it("finds far more than the old literal match for the queries it missed", () => {
    expect(literal("to do list")).toEqual([]);
    expect(titles("to do list").length).toBeGreaterThanOrEqual(3);
    expect(titles("kanban").length).toBeGreaterThan(literal("kanban").length * 3);
  });

  it("agent nouns reach their work: roofer → roofing, accountant → account…, never the bare root", () => {
    expect([...agentNounForms("roofer").exact]).toEqual(["roofing"]);
    expect(agentNounForms("accountant").starts).toEqual(["account"]);
    expect(agentNounForms("tax").exact.size).toBe(0);
    expect(searchTemplates([{ title: "Account Management" }, { title: "Accounting Desk" }], "accountant", (f) => f).map((f) => f.title)).toEqual(["Accounting Desk"]);
  });

  it("an older card without layouts still finds layouts through its contents words", () => {
    expect(searchTemplates([{ title: "Old", find: ["kanban"] }, { title: "New", find: ["kanban"], layouts: ["grid"] }], "kanban", (f) => f).map((f) => f.title)).toEqual(["Old"]);
  });

  it("reads what is inside a template: a board view finds packs whose title never says board", () => {
    const boards = searchTemplates(FACES, "kanban", (f) => f);
    expect(boards.some((f) => !/board|kanban/i.test(`${f.title} ${f.description} ${f.tags.join(" ")}`))).toBe(true);
  });

  it("an empty query answers every card in its own order", () => {
    expect(titles("  ")).toEqual(FACES.map((f) => f.title));
  });

  it("ranks the title above contents and the person's own word above a synonym", () => {
    const faces = [
      { title: "Weekly agenda", find: ["tasks"] },
      { title: "Task manager", find: [] },
      { title: "Chores", description: "household", find: [] },
    ];
    expect(searchTemplates(faces, "task", (f) => f).map((f) => f.title)).toEqual(["Task manager", "Chores", "Weekly agenda"]);
  });

  it("folds typed phrases and plurals", () => {
    expect(queryConcepts("To-Do list").map((c) => c.word)).toEqual(["todo", "list"]);
    expect(stem("recipes")).toBe("recipe");
    expect(stem("categories")).toBe("category");
  });

  it("answers cards matching any word when none matches every word", () => {
    const faces = [{ title: "Recipe box" }, { title: "Workout log" }];
    expect(searchTemplates(faces, "recipes zebra", (f) => f).map((f) => f.title)).toEqual(["Recipe box"]);
  });
});

/**
 * ADVERSARIAL-3 D5 (2026-10-19): the review's own queries, public and signed-in (one search). "freight" found nothing
 * (the trucking desk's sample carrier is a freight line: its own text), and two-word queries required every word, so
 * "church volunteers" dropped Volunteer Program Desk and "SaaS roadmap" dropped Product Roadmap and Public Roadmap.
 * Now: every-word matches lead, some-word matches follow (never empty when any word matches), and the template's
 * own text is searched. Each query names the template that must be in its first `top` answers.
 */
describe("the adversarial review's queries (ADVERSARIAL-3 D5)", () => {
  const CASES: Array<[query: string, meant: RegExp, top: number]> = [
    ["freight", /trucking/i, 3],
    ["church volunteers", /faith community/i, 1],
    ["church volunteers", /volunteer program/i, 3],
    ["SaaS roadmap", /saas startup/i, 1],
    ["SaaS roadmap", /^product roadmap/i, 4],
    ["SaaS roadmap", /public roadmap/i, 4],
    ["dental office", /dental/i, 1],
    ["law firm intake", /law firm|injury intake/i, 2],
    ["plumber jobs", /plumbing/i, 1],
    ["food truck", /food truck/i, 1],
    ["wedding planner", /wedding/i, 1],
    ["gym members", /gym|fitness/i, 1],
    ["nonprofit grants", /grant|nonprofit/i, 1],
    ["hair salon", /hair salon/i, 1],
    ["invoice", /invoic/i, 1],
    ["dentist", /dental/i, 1],
    ["contractor", /contractor/i, 1],
    ["restaurant", /restaurant/i, 1],
    ["trucking", /trucking/i, 1],
    ["logistics", /trucking|warehouse|logistic/i, 3],
  ];
  it.each(CASES)("%s finds %s in its first %i", (q, meant, top) => {
    expect(titles(q).slice(0, top).some((t) => meant.test(t))).toBe(true);
  });

  it("a query is never empty when any of its words matches, and every-word matches lead", () => {
    const faces = [{ title: "Church hub", description: "volunteers and services" }, { title: "Volunteer desk" }, { title: "Church calendar" }];
    expect(searchTemplates(faces, "church volunteers", (f) => f).map((f) => f.title)).toEqual(["Church hub", "Volunteer desk", "Church calendar"]);
  });

  it("the template's own text is searched by the exact word only, never a prefix or synonym", () => {
    const faces = [{ title: "Carrier desk", body: "freight lanes" }, { title: "Vet", body: "boarding kennels" }];
    expect(searchTemplates(faces, "freight", (f) => f).map((f) => f.title)).toEqual(["Carrier desk"]);
    expect(searchTemplates(faces, "board", (f) => f).map((f) => f.title)).toEqual([]);
  });
});
