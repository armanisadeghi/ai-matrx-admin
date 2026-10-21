import { personAvatarAssetIds, rankLogos } from "../logo-rank";

const asset = (id: string, notes: string, over: Record<string, unknown> = {}) => ({
  id,
  source: "discovered",
  confirmed_by: null as string | null,
  notes,
  ...over,
});
const props = [
  { kind: "x", url: "https://twitter.com/armantitanium", handle: "armantitanium", owner_kind: "person" },
  { kind: "youtube", url: "https://www.youtube.com/c/armansadeghi", handle: "ArmanSadeghi", owner_kind: "person" },
  { kind: "x", url: "https://x.com/datadestructio2", handle: "datadestructio2", owner_kind: "company" },
];

describe("a person's profile picture is never the brand's logo", () => {
  it("flags only discovered pictures from person-owned accounts", () => {
    const ids = personAvatarAssetIds(
      [
        asset("a", "Smart Add enrich · x photo · https://x.com/armantitanium"),
        asset("b", "Smart Add enrich · youtube photo · http://www.youtube.com/@ArmanSadeghi"),
        asset("c", "Smart Add enrich · x photo · https://x.com/datadestructio2"),
        asset("d", "Smart Add enrich · x photo · https://x.com/armantitanium", { source: "uploaded" }),
        asset("e", "Smart Add enrich · x photo · https://x.com/armantitanium", { confirmed_by: "u1" }),
      ],
      props,
    );
    expect([...ids].sort()).toEqual(["a", "b"]);
  });

  it("ranks the brand's own site logo above any social avatar", () => {
    const ranked = rankLogos([
      { url: "https://pbs.twimg.com/profile_images/1/a_400x400.png", kind: "logo" },
      { url: "https://datadestruction.com/wp-content/uploads/x/cropped-icon-32x32.png", kind: "logo" },
      { url: "https://datadestruction.com/wp-content/uploads/2023/09/data-destruction-logo.png", kind: "logo" },
    ]);
    expect(ranked[0]!.url).toContain("data-destruction-logo");
    expect(ranked[ranked.length - 1]!.url).toContain("twimg");
  });
});
