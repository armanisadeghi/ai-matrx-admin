import { KEHINDE_WILEY, NICOLE_LONG, ROCHELLE_MOULTON } from "../fixtures/anchorFixtures";
import { cleanLine, handleKey, LINE_MAX, normName, peopleGroups, placeOf, sameNameCandidates } from "../peopleGroups";

const accountKeys = (p: { accounts: { key: string }[] }) => p.accounts.map((a) => a.key).sort();

describe("peopleGroups on real anchor rounds", () => {
  it("Nicole Long: six distinct people, strongest first, four shown and two more", () => {
    const all = peopleGroups(NICOLE_LONG.items, NICOLE_LONG.searchedName, 10);
    expect(all.people).toHaveLength(6);
    expect(all.more).toBe(0);
    // The LinkedIn and Instagram accounts that share the handle `nicoleslong` are one person.
    expect(accountKeys(all.people[0])).toEqual(["social:instagram:nicoleslong", "social:linkedin:nicoleslong"]);
    expect(all.people[0].line).toBe("Liberty Classical Schools");
    expect(all.people[0].place).toBe("Decatur, Georgia");
    expect(all.people[0].photo?.profileId).toBe("e8ebedb0-5ac0-4e5d-bede-7fd1f7274b26");
    expect(all.people[1].line).toBe("KGW-TV");
    expect(all.people[1].place).toBe("Portland, Oregon");
    const strengths = all.people.map((p) => p.strength);
    expect([...strengths].sort((a, b) => b - a)).toEqual(strengths);

    const shown = peopleGroups(NICOLE_LONG.items, NICOLE_LONG.searchedName);
    expect(shown.people).toHaveLength(4);
    expect(shown.more).toBe(2);
  });

  it("drops other names: `nicole` (an Instagram display name) and `Nicole N. Long`", () => {
    const keys = sameNameCandidates(NICOLE_LONG.items, "Nicole Long").map((i) => i.key);
    expect(keys).not.toContain("social:instagram:nicole.long");
    expect(keys).not.toContain("social:linkedin:nicole-n-long-61461aa");
    expect(keys).toHaveLength(7);
  });

  it("Rochelle Moulton: one person; a Rachelle is not a Rochelle", () => {
    const { people, more } = peopleGroups(ROCHELLE_MOULTON.items, ROCHELLE_MOULTON.searchedName);
    expect(people).toHaveLength(1);
    expect(more).toBe(0);
    const [p] = people;
    expect(accountKeys(p)).toEqual([
      "social:linkedin:rochellemoulton",
      "social:x:consultingchick",
      "social:youtube:rochellemoulton",
      "website:rochellemoulton.com",
    ]);
    expect(p.place).toBe("Palm Springs, California");
    // LinkedIn's stock silhouette is never the photo; the next real one is.
    expect(p.photo?.url).not.toMatch(/static\.licdn\.com/);
    expect(p.photo?.profileId).toBeTruthy();
    expect(p.line).toBeTruthy();
    expect(p.line?.length).toBeLessThanOrEqual(LINE_MAX);
    expect(p.line).not.toMatch(/Palm Springs/);
  });

  it("Kehinde Wiley: the Instagram account and the own site are one person", () => {
    const { people } = peopleGroups(KEHINDE_WILEY.items, KEHINDE_WILEY.searchedName);
    expect(people).toHaveLength(1);
    expect(accountKeys(people[0])).toEqual(["social:instagram:kehindewiley", "website:kehindewiley.com"]);
    expect(people[0].line).toBe("Contemporary Artist");
    expect(people[0].place).toBeNull();
  });

  it("every line is at most 40 characters and never a place", () => {
    for (const f of [NICOLE_LONG, ROCHELLE_MOULTON, KEHINDE_WILEY]) {
      for (const p of peopleGroups(f.items, f.searchedName, 10).people) {
        if (p.line) {
          expect(p.line.length).toBeLessThanOrEqual(LINE_MAX);
          if (p.place) expect(p.line.startsWith(p.place.split(",")[0])).toBe(false);
        }
      }
    }
  });
});

describe("peopleGroups helpers", () => {
  it("normalises names and handles", () => {
    expect(normName("  Röchelle   MOULTON ")).toBe("rochelle moulton");
    expect(normName("Rachelle Moulton")).not.toBe(normName("Rochelle Moulton"));
    expect(handleKey("@Nicole.S_Long-")).toBe("nicoleslong");
  });

  it("cleans a line: first sentence, no ellipsis, all-caps read as words, cut at 40", () => {
    expect(cleanLine("STANICKI HOLDINGS LLC")).toBe("Stanicki Holdings LLC");
    expect(cleanLine("WOMEN'S CARE OF COLORADO")).toBe("Women's Care of Colorado");
    expect(cleanLine("Breast cancer tried to steal my joy. I wouldn’t let it. Not because it…")).toBe(
      "Breast cancer tried to steal my joy.",
    );
    const long = cleanLine("Enterprise service delivery and customer success executive with deep experience");
    expect(long?.length).toBeLessThanOrEqual(LINE_MAX);
    expect(long?.endsWith("…")).toBe(true);
    expect(cleanLine("   ")).toBeNull();
  });

  it("keeps a place to city and region", () => {
    expect(placeOf("Decatur, Georgia, United States")).toBe("Decatur, Georgia");
    expect(placeOf("Palm Springs")).toBe("Palm Springs");
    expect(placeOf(null)).toBeNull();
  });
});
