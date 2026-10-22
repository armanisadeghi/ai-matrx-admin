import { reduce } from "../reduce";
import { INITIAL_RUN_STATE } from "../types";

describe("what happened to the picked Sources reaches the run state", () => {
  it("a cut Source and an unlinked Source are kept for the page to show", () => {
    const next = reduce(INITIAL_RUN_STATE, {
      type: "podcast_sources",
      truncated: true,
      unlinked: ["Biology.pdf"],
    });
    expect(next.sourcesNotice).toEqual({ truncated: true, unlinked: ["Biology.pdf"] });
  });

  it("survives the terminal event", () => {
    const withNotice = reduce(INITIAL_RUN_STATE, { type: "podcast_sources", truncated: true, unlinked: [] });
    const done = reduce(withNotice, {
      type: "podcast_complete",
      show_id: null,
      success: true,
      episode_id: "e1",
      episode_slug: null,
      script: "",
      audio_url: "a",
      title: "t",
      description: "",
      image_urls: [],
      video_urls: [],
    });
    expect(done.sourcesNotice?.truncated).toBe(true);
  });
});
