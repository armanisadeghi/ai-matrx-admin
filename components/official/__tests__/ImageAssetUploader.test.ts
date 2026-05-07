import { buildImageAssetViewerPayload } from "@/components/official/ImageAssetUploader";

describe("ImageAssetUploader", () => {
  it("builds a viewer payload from populated variants only", () => {
    const payload = buildImageAssetViewerPayload({
      variants: {
        image_url: "https://cdn.example.com/logo-512.png",
        og_image_url: null,
        thumbnail_url: "https://cdn.example.com/logo-200.png",
        tiny_url: "https://cdn.example.com/logo-64.png",
      },
      label: "Organization logo",
      preset: "logo",
    });

    expect(payload).toEqual({
      images: [
        "https://cdn.example.com/logo-512.png",
        "https://cdn.example.com/logo-200.png",
        "https://cdn.example.com/logo-64.png",
      ],
      alts: [
        "Organization logo 512x512",
        "Organization logo 200x200",
        "Organization logo 64x64",
      ],
      title: "Organization logo",
    });
  });
});
