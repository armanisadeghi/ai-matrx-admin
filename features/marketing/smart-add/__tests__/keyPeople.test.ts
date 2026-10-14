// The key-people step's answer reaches the Key people section: a person whose profile is a staff row enriches that
// row; everyone else becomes a row of their own (most certain first), with grounding only on the hover card.
import type { EvidenceItem } from "../evidence";
import { keyPeopleRows, parseKeyPeople, personTitle, profileKey, type KeyPerson } from "../keyPeople";

const staff = (url: string) =>
  ({ key: `social:linkedin:${url}`, field: "social", value: url, url, source: { node: "avatars", kind: "social_profile", url, where: "x" } }) as unknown as EvidenceItem;

const p = (name: string, extra: Partial<KeyPerson> = {}): KeyPerson => ({
  name,
  role: "staff",
  title_text: null,
  profile_urls: [],
  evidence_urls: ["https://example.com/team/"],
  certainty: "likely",
  reason: "Listed on the team page.",
  ...extra,
});

describe("parseKeyPeople", () => {
  it("reads structured_output, content kinds and the bare object; null before the step answers", () => {
    const people = [{ name: "Maxwell McNamara", role: "executive", title_text: "CEO", certainty: "confirmed" }];
    expect(parseKeyPeople({ structured_output: { people } })?.[0].name).toBe("Maxwell McNamara");
    expect(parseKeyPeople({ content: [{ __kind: "brand_intake_key_people", people }] })?.[0].title_text).toBe("CEO");
    expect(parseKeyPeople({ people: [{ role: "staff" }] })).toEqual([]); // nameless rows are dropped
    expect(parseKeyPeople({ status: "running" })).toBeNull();
    expect(parseKeyPeople(null)).toBeNull();
  });
});

describe("keyPeopleRows", () => {
  it("matches a person to the staff row by profile address, whatever its form", () => {
    const row = staff("https://www.linkedin.com/in/maxwellmcnamara");
    const max = p("Maxwell McNamara", { profile_urls: ["https://linkedin.com/in/maxwellmcnamara/?trk=org-employees"] });
    const { byStaff, extra } = keyPeopleRows([max], [row]);
    expect(byStaff.get(row.key)?.name).toBe("Maxwell McNamara");
    expect(extra).toEqual([]);
  });

  it("gives everyone else a row of their own, most certain first, grounding on the source card", () => {
    const { extra } = keyPeopleRows(
      [p("Katie Churchill", { certainty: "possible" }), p("Gaston Wilder", { certainty: "confirmed", title_text: "Senior Managing Partner" })],
      [],
    );
    expect(extra.map((i) => i.value)).toEqual(["Gaston Wilder", "Katie Churchill"]);
    expect(extra[0].certainty).toBe("certain");
    expect(extra[0].certainty_reasons).toEqual(["Listed on the team page."]);
    expect(extra[0].source.url).toBe("https://example.com/team/");
  });

  it("never lists one person twice", () => {
    expect(keyPeopleRows([p("Joshua Moore"), p("joshua  moore")], []).extra).toHaveLength(1);
  });
});

describe("helpers", () => {
  it("profileKey drops scheme, www, query and trailing slash", () => {
    expect(profileKey("https://www.LinkedIn.com/in/x/?a=1")).toBe("linkedin.com/in/x");
  });
  it("personTitle falls back to the role", () => {
    expect(personTitle(p("A", { role: "founder" }))).toBe("Founder");
    expect(personTitle(p("A", { role: "other" }))).toBe("");
  });
});
