/**
 * check:offer-guarantees — RED/GREEN self-test.
 *
 * Drives `findGuaranteeDrops` (the function the CLI walks the repo with) over the REAL generated
 * offer types, so a change that blinds the guard turns a case red. The live proof that came with
 * it: on the tree before 2026-10-16 the guard reported 23 drops across 16 files (exit 1),
 * including the three that hid `conversation_id`, `rulebook_context` and `scraped_content`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { findGuaranteeDrops, requiredOfferKeys } from "@/scripts/check-offer-guarantees";

const required = requiredOfferKeys(
  readFileSync(
    path.join(__dirname, "../../node_modules/@ai-matrx/agents/dist/generated/provision-offers.d.ts"),
    "utf8",
  ),
);
const drops = (src: string) => findGuaranteeDrops(src, required).map((d) => d.dropped);

describe("requiredOfferKeys", () => {
  it("reads the guaranteed values as the generated type's required keys", () => {
    expect(required.get("OrchestrasMemberRosterOffer")).toEqual(["members"]);
    expect(required.get("PodcastClientWebSourceOffer")).toEqual(["scraped_content"]);
  });
});

describe("RED: a guaranteed value typed away is found", () => {
  it("the exact Orchestra shape — Omit<Partial<Offer>, guaranteed>", () => {
    expect(drops(`type V = Omit<Partial<OrchestrasMemberRosterOffer>, "__kind" | "members">;`)).toEqual([["members"]]);
  });
  it("Partial<Offer> across lines and in satisfies", () => {
    expect(drops(`type V = Omit<\n  Partial<PodcastClientWebSourceOffer>,\n  "__kind"\n>;`)).toEqual([["scraped_content"]]);
    expect(drops(`const x = { a: 1 } satisfies Partial<OrchestrasMemberRosterOffer>;`)).toEqual([["members"]]);
  });
  it("Omit of a guaranteed key from the full type", () => {
    expect(drops(`type V = Omit<PodcastClientWebSourceOffer, "__kind" | "scraped_content">;`)).toEqual([["scraped_content"]]);
  });
  it("Partial<Omit<…>> and Partial<Pick<…, guaranteed>>", () => {
    expect(drops(`type V = Partial<Omit<OrchestrasMemberRosterOffer, "__kind">>;`)).toEqual([["members"]]);
    expect(drops(`type V = Partial<Pick<OrchestrasMemberRosterOffer, "members" | "conductor_id">>;`)).toEqual([["members"]]);
  });
});

describe("GREEN: the fixed pattern and mapped-only types pass", () => {
  it("Omit<Offer, \"__kind\"> keeps the guarantee", () => {
    expect(drops(`type V = Omit<OrchestrasMemberRosterOffer, "__kind">;`)).toEqual([]);
  });
  it("omitting only a non-guaranteed key is fine", () => {
    expect(drops(`type V = Omit<PodcastClientWebSourceOffer, "__kind" | "focus_area">;`)).toEqual([]);
  });
  it("Partial<Pick<…>> of mapped-only keys is fine", () => {
    expect(drops(`type V = Partial<Pick<OrchestrasMemberRosterOffer, "conductor_id" | "member_count">>;`)).toEqual([]);
  });
  it("an unknown type name is ignored", () => {
    expect(drops(`type V = Partial<SomethingElseOffer>;`)).toEqual([]);
  });
});
