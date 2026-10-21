import { brandAssetPreviewUrl, isStoredFileUrl } from "./brand-asset-preview";

// Real rows (2026-10-21): asheville-tea-company "Site icon" and the-good-trade "App icon" are confirmed primary logos
// stored in our file service; their links carry no extension.
const ASHEVILLE_STORED =
  "https://cdn.matrxserver.com/87a6e699-3622-4869-8843-d0867456c0dd/976f37c9-c31a-48ef-85af-220c63b2cb6d?v=2390f5";

describe("brandAssetPreviewUrl", () => {
  it("shows a stored file (file_id, our CDN, no extension)", () => {
    expect(brandAssetPreviewUrl({ file_id: "976f37c9-c31a-48ef-85af-220c63b2cb6d", source_url: ASHEVILLE_STORED })).toBe(
      ASHEVILLE_STORED,
    );
  });

  it("shows our CDN link even when the row lost its file id", () => {
    expect(brandAssetPreviewUrl({ file_id: null, source_url: ASHEVILLE_STORED })).toBe(ASHEVILLE_STORED);
    expect(isStoredFileUrl(ASHEVILLE_STORED)).toBe(true);
  });

  it("keeps raw links that name an image file, upgraded to https", () => {
    expect(brandAssetPreviewUrl({ source_url: "http://datadestruction.com/wp-content/uploads/logo.png" })).toBe(
      "https://datadestruction.com/wp-content/uploads/logo.png",
    );
    expect(brandAssetPreviewUrl({ source_url: "https://www.aimatrx.com/matrx/matrx-icon.svg?dpl=x" })).toContain("matrx-icon.svg");
  });

  it("drops third-party links that are not images", () => {
    expect(brandAssetPreviewUrl({ source_url: "https://example.com/about" })).toBeNull();
    expect(brandAssetPreviewUrl({ source_url: null })).toBeNull();
    expect(isStoredFileUrl("https://example.com/a/b")).toBe(false);
  });
});
