import { explainSharedCause } from "@/features/marketing/lib/shared-cause-story";

describe("explainSharedCause", () => {
  it("names the shared file once with its page count", () => {
    const story = explainSharedCause(
      {
        rolled_up: true,
        pages_affected: 298,
        shared_causes: [
          {
            cause: "https://allgreenrecycling.com/wp-content/themes/t/twitter-logo.png",
            pages: 298,
            sample_pages: ["https://allgreenrecycling.com/", "https://allgreenrecycling.com/blog"],
          },
        ],
      },
      "Image dimension attributes",
    );
    expect(story).not.toBeNull();
    const facts = Object.fromEntries(story!.facts.map((f) => [f.label, f.value]));
    expect(facts["Pages affected"]).toBe("298");
    expect(facts["Shared cause"]).toBe("twitter-logo.png · 298 pages");
    expect(story!.remedy.instruction).toContain("it appears on 298 pages");
  });

  it("explains a site-wide metric without inventing a cause", () => {
    const story = explainSharedCause(
      { rolled_up: true, pages_affected: 181, pages_checked: 190, typical_value: "0.80", sample_pages: ["https://x/a"] },
      "Layout shift",
    );
    const facts = Object.fromEntries(story!.facts.map((f) => [f.label, f.value]));
    expect(facts["Pages affected"]).toBe("181 of 190 checked");
    expect(facts["Typical value"]).toBe("0.80");
    expect(story!.remedy.instruction).toContain("the theme, a plugin, or hosting");
  });

  it("is null for ordinary per-page evidence", () => {
    expect(explainSharedCause({ http_status: 404 }, "x")).toBeNull();
    expect(explainSharedCause(undefined, "x")).toBeNull();
  });
});
