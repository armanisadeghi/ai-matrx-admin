import { renderToStaticMarkup } from "react-dom/server";
import { ImagePicker, PlacementFields, TagsField } from "../parts";
import { detailKey, listNotice, pageChoices, placementForPage } from "../placement";
import type { SuggestedMedia } from "../api";

const img = (over: Partial<SuggestedMedia>): SuggestedMedia => ({
  kind: "image", source_url: "u", alt: "a", file_id: "f1", cdn_url: "https://x/y.png", error: null, ...over,
});

describe("empty blocks render nothing", () => {
  it("no image to pick: no Main image / Keep controls, one plain line", () => {
    const html = renderToStaticMarkup(
      <ImagePicker candidateId="c" media={[img({ cdn_url: null }), { ...img({}), kind: "maker_logo" }]} hero={null} gallery={new Set()} onHero={() => {}} onGallery={() => {}} />,
    );
    expect(html).not.toContain("Main image");
    expect(html).not.toContain("Keep");
    expect(html).toContain("No images on the model card");
  });
  it("an image that can be picked shows its controls", () => {
    const html = renderToStaticMarkup(
      <ImagePicker candidateId="c" media={[img({})]} hero="f1" gallery={new Set()} onHero={() => {}} onGallery={() => {}} />,
    );
    expect(html).toContain("Main image");
    expect(html).toContain("Keep");
  });
  it("Tags with none on the card never sits blank: it says so", () => {
    expect(renderToStaticMarkup(<TagsField value="" onChange={() => {}} />)).toContain("None on the card");
    expect(renderToStaticMarkup(<TagsField value="a, b" onChange={() => {}} />)).not.toContain("None on the card");
  });
});

describe("page / shelf picker", () => {
  const auto = { page: "speech", shelf: "voices", shelf_title: "Voices" };
  it("page choices come from data: spec pages plus pages in use, no duplicates", () => {
    expect(pageChoices([{ page: "text", shelf: "a", shelf_title: "A" }, { page: "custom", shelf: "b", shelf_title: "B" }], ["text", "speech"])).toEqual(["text", "speech", "custom"]);
  });
  it("labels the automatic choice and offers the controls", () => {
    const html = renderToStaticMarkup(
      <PlacementFields value={auto} automatic={auto} inUse={[auto]} specPages={["text", "speech"]} onChange={() => {}} saveLabel="Save page and shelf" onSave={() => {}} />,
    );
    expect(html).toContain("This is the automatic choice");
    expect(html).toContain("Shelf title");
    expect(html).toContain("Save page and shelf");
  });
  it("when changed, says what automatic would have been", () => {
    const html = renderToStaticMarkup(
      <PlacementFields value={{ ...auto, page: "text" }} automatic={auto} inUse={[auto]} specPages={["text", "speech"]} onChange={() => {}} onUseAutomatic={() => {}} />,
    );
    expect(html).toContain("Automatic choice would be: speech page");
  });
});

describe("review fixes", () => {
  const speech = { page: "speech", shelf: "voices", shelf_title: "Voices" };
  const text = { page: "text", shelf: "added", shelf_title: "Newly Added" };
  it("changing the page never keeps the old page's shelf id", () => {
    expect(placementForPage([speech, text], speech, "text")).toEqual(text);
    expect(placementForPage([speech, text], text, "speech")).toEqual(speech);
    expect(placementForPage([text], null, "image")).toEqual({ page: "image", shelf: "", shelf_title: "" });
  });
  it("the list says loading before rows arrive, empty only when really empty", () => {
    expect(listNotice(null, null)).toBe("Loading candidates\u2026");
    expect(listNotice([], null)).toBe("No candidates yet");
    expect(listNotice([{}], null)).toBeNull();
  });
  it("a refreshed row keeps the same detail identity (no remount)", () => {
    expect(detailKey({ id: "a", updated_at: "1" } as { id: string })).toBe(detailKey({ id: "a", updated_at: "2" } as { id: string }));
  });
});
