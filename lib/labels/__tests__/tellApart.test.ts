// Two organizations named "Cedar Ridge Physical Therapy" showed identical rows in the notes
// sidebar, the home picker, group-by Organization and the organization filter (walk 2026-10-21):
// the tie-breaker was appended to a string the row then truncated away.
import { labelTails, shortDistinctIds } from "../tellApart";
import { buildHomes, homeLabelParts, homeLabels } from "@/features/scopes/homes/homeModel";

const A = "8f4a1c2e-0000-4000-8000-00000000000a";
const B = "77710b3d-0000-4000-8000-00000000000b";

describe("labelTails", () => {
  it("gives same-named entries distinct short tails and leaves unique names alone", () => {
    const tails = labelTails([
      { id: A, label: "Cedar Ridge Physical Therapy" },
      { id: B, label: "cedar ridge physical therapy" },
      { id: "c", label: "Harbor Dental Group" },
    ]);
    expect(tails.get(A)).toBe(" · 8f4a");
    expect(tails.get(B)).toBe(" · 7771");
    expect(tails.get("c")).toBeNull();
  });
  it("grows the prefix until the ids differ", () => {
    const short = shortDistinctIds(["abcdef01-x", "abcdef02-y"]);
    expect(new Set(short.values()).size).toBe(2);
  });
});

describe("homeLabelParts", () => {
  const general = (id: string) => ({ id: `t-${id}`, slug: "general", label_singular: "General", scopes: [{ id, name: "General" }] });
  const orgs = [
    { id: "org-a", name: "Cedar Ridge Physical Therapy", slug: "cedar-ridge-physical-therapy", scope_types: [general(A)] },
    { id: "org-b", name: "Cedar Ridge Physical Therapy", slug: "cedar-ridge-pt-muvb6fkb", scope_types: [general(B)] },
    { id: "org-c", name: "Harbor Dental Group", scope_types: [general("c0000000-0000")] },
  ] as never;

  it("splits a twin's label into the shared text and a short tail that differs", () => {
    const parts = homeLabelParts(buildHomes(orgs), { notesSpanManyOrganizations: true });
    expect(parts.get(A)).toEqual({ text: "General · Cedar Ridge Physical Therapy", tail: " · 8f4a" });
    expect(parts.get(B)).toEqual({ text: "General · Cedar Ridge Physical Therapy", tail: " · 7771" });
    expect(parts.get("c0000000-0000")).toEqual({ text: "General · Harbor Dental Group", tail: null });
  });

  it("the joined label reads the same in every list (no slug in the picker, short id everywhere)", () => {
    const labels = homeLabels(buildHomes(orgs), { notesSpanManyOrganizations: true });
    expect(labels.get(A)).toBe("General · Cedar Ridge Physical Therapy · 8f4a");
    expect(labels.get(B)).toBe("General · Cedar Ridge Physical Therapy · 7771");
  });
});
