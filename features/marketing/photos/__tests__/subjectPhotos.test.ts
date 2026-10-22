import { photosOf } from "../subject-photos";
import { photoFailureReason } from "../SubjectPhotosDialog";
import type { BrandAsset } from "@/features/marketing/types";

const a = (id: string, over: Partial<BrandAsset>) =>
  ({ id, file_id: `f-${id}`, kind: "image", is_primary: false, sort_order: 0, data: {}, ...over }) as unknown as BrandAsset;
const subject = { brandId: "b", organizationId: "o", kind: "offering", id: "off1" } as const;

describe("photosOf", () => {
  it("keeps only this offering's photos, hero first then by order", () => {
    const rows = [
      a("x", { data: { offering_id: "off1" }, sort_order: 2 }),
      a("y", { data: { offering_id: "off2" } }),
      a("z", { data: { offering_id: "off1" }, is_primary: true, sort_order: 5 }),
      a("w", { data: { offering_id: "off1" }, kind: "logo" }),
      a("v", { data: { offering_id: "off1" }, file_id: null }),
    ];
    expect(photosOf(rows, subject).map((p) => p.asset.id)).toEqual(["z", "x"]);
  });
  it("people photos read headshots linked by party_id", () => {
    const rows = [a("h", { kind: "headshot", data: { party_id: "p1" } }), a("i", { data: { offering_id: "p1" } })];
    expect(photosOf(rows, { ...subject, kind: "person", id: "p1" }).map((p) => p.asset.id)).toEqual(["h"]);
  });
});

describe("photoFailureReason", () => {
  it("turns the database's organization refusal into a plain sentence", () => {
    const refusal = Object.assign(new Error('new row for relation "brand_asset" violates check constraint "assert_same_org"'), { code: "23514" });
    expect(photoFailureReason(refusal)).toMatch(/different organization/);
    expect(photoFailureReason(refusal)).not.toMatch(/assert_same_org|23514/);
  });
  it("keeps any other plain reason", () => {
    expect(photoFailureReason(new Error("The file is too large."))).toBe("The file is too large.");
  });
});
