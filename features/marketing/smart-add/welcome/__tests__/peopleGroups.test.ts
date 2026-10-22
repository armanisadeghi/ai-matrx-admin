import {
  JOHANNA_KLOMANN,
  KEHINDE_WILEY,
  MIKE_LITTLE,
  NICOLE_LONG,
  ROCHELLE_MOULTON,
  THOMAS_FRANK,
  THOMAS_FRANK_PHOTO_GROUPS,
} from "../fixtures/anchorFixtures";
import {
  cleanLine,
  displayName,
  handleKey,
  isMaskedText,
  LINE_MAX,
  MAX_PEOPLE,
  normName,
  peopleGroups,
  placeOf,
  sameNameCandidates,
} from "../peopleGroups";

const accountKeys = (p: { accounts: { key: string }[] }) => p.accounts.map((a) => a.key).sort();

describe("peopleGroups on real anchor rounds", () => {
  it("Johanna Klomann: the intro line's place and work make her a card (live 2026-10-21: zero cards)", () => {
    const got = peopleGroups(JOHANNA_KLOMANN.items, JOHANNA_KLOMANN.searchedName);
    expect(got.people).toHaveLength(1);
    expect(got.more).toBe(0);
    const [p] = got.people;
    expect(accountKeys(p)).toEqual(["social:facebook:johanna.klomann", "website:johannaklomann.com"]);
    expect(p.place).toBe("Flagstaff, Arizona");
    expect(p.line).toBe("Owner at Klomann Accounting LLC");
  });

  it("Nicole Long: six distinct people, strongest first, four shown and two more", () => {
    const all = peopleGroups(NICOLE_LONG.items, NICOLE_LONG.searchedName, 10);
    // Six people; the one with neither a line nor a place is no card, only counted.
    expect(all.people).toHaveLength(5);
    expect(all.more).toBe(1);
    expect(all.people.every((p) => p.line || p.place)).toBe(true);
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
  it("normalizes names and handles", () => {
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

describe("sign-up welcome final review defects (2026-10-21, real runs)", () => {
  it("D1 Thomas Frank: the same photo on LinkedIn, Instagram and YouTube is ONE person", () => {
    const { people } = peopleGroups(THOMAS_FRANK.items, THOMAS_FRANK.searchedName, MAX_PEOPLE, THOMAS_FRANK_PHOTO_GROUPS);
    const him = people.find((p) => p.accounts.some((a) => a.key === "social:linkedin:tomfrankly"));
    expect(accountKeys(him!)).toEqual(["social:instagram:tomfrankly", "social:linkedin:tomfrankly", "social:youtube:thomasfrank"]);
    // The London namesake stays apart: two people, not three.
    expect(people).toHaveLength(2);
    // The most specific place of the merged person, never a bare country.
    expect(him!.place).toBe("Des Moines, Iowa");
    expect(him!.company).toBe("Flylighter");
  });

  it("D1 one photo URL served twice (query string aside) is one person, without the server", () => {
    const [a, b] = THOMAS_FRANK.items.filter((i) => i.key === "social:instagram:tomfrankly" || i.key === "social:youtube:thomasfrank");
    const same = { ...b, image_url: `${(a.image_url ?? "").split("?")[0]}?size=200` };
    const { people } = peopleGroups([a, same], "Thomas Frank");
    expect(people).toHaveLength(1);
  });

  it("D1 a platform's stock picture never merges two people", () => {
    const stock = "https://static.licdn.com/aero-v1/sc/h/bgaqk7x4ntjz0wg67d8u723eb";
    const items = MIKE_LITTLE.items.filter((i) => i.key === "social:linkedin:mglittle" || i.key === "social:linkedin:mike-little-a0216911");
    const { people } = peopleGroups(items.map((i) => ({ ...i, image_url: stock })), "Mike Little");
    expect(people).toHaveLength(2);
  });

  it("D1 a bare country is no shared place: two 'United States' people stay apart", () => {
    const yt = THOMAS_FRANK.items.find((i) => i.key === "social:youtube:thomasfrank")!;
    const other = { ...yt, key: "social:tiktok:someoneelse", handle: "someoneelse", platform: "tiktok", image_url: null, profile_id: null, same_as: [] };
    expect(peopleGroups([yt, other], "Thomas Frank").people).toHaveLength(2);
  });

  it("D2 a masked headline (LinkedIn's asterisks) is never a line", () => {
    const { people } = peopleGroups(THOMAS_FRANK.items, THOMAS_FRANK.searchedName, MAX_PEOPLE, THOMAS_FRANK_PHOTO_GROUPS);
    for (const p of people) expect(p.line ?? "").not.toMatch(/\*{3}/);
    expect(cleanLine("********* ** *** ******** ************ *** ***")).toBeNull();
    expect(cleanLine("* **** **** ** ***** ********** *********")).toBeNull();
    expect(isMaskedText("A 5* hotel review")).toBe(false);
  });

  it("D8 casing: the card being searched shows the sign-up name's casing", () => {
    const all = peopleGroups(MIKE_LITTLE.items, "Mike Little", 10);
    for (const p of all.people) expect(p.name).toBe("Mike Little");
    // A lower-case sign-up name never lowers a properly cased source.
    const lower = peopleGroups(MIKE_LITTLE.items, "mike little", 10);
    expect(lower.people.every((p) => p.name === "Mike Little")).toBe(true);
    expect(displayName("danah boyd", "danah boyd")).toBe("Danah Boyd");
    expect(displayName("Mike Little", "mike Little")).toBe("Mike Little");
    expect(displayName("mike little", "DJ McCoy")).toBe("DJ McCoy");
  });

  it("D3 picked facts: Mike Little's card place and Thomas Frank's company", () => {
    const mike = peopleGroups(MIKE_LITTLE.items, "Mike Little").people.find((p) => p.accounts.some((a) => a.key === "social:linkedin:mglittle"))!;
    expect(mike.place).toBe("Atlanta, Georgia");
    // A bio sentence is the card's line, never a company.
    expect(mike.company).toBeNull();
  });
});
