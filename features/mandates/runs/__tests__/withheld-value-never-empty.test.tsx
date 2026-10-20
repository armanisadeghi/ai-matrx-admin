/**
 * A withheld provision value (AI Watch off) arrives from GET /mandates/runs/{id} as `value: null`.
 * It must draw as "Withheld · N chars", never as "Empty" (live defect 2026-10-19, canary run 068523e4).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { PlacementTable } from "../PlacementTable";
import { parsePlacement } from "../service";

describe("withheld run values", () => {
  it("draws a null withheld value as Withheld with its size, never Empty", () => {
    const placement = parsePlacement({
      provisions: [
        { name: "canary_code", supplied: true, withheld: true, value_chars: 14, landed: [{ channel: "variable", target: "canary_code" }] },
      ],
      variables: [],
    });
    expect(placement).not.toBeNull();
    const html = renderToStaticMarkup(
      <PlacementTable
        label="Placement of this run"
        placement={placement!}
        values={[{ name: "canary_code", kind: null, value: null, truncated: false, withheld: true, valueChars: 14 }]}
      />,
    );
    expect(html).toContain('data-testid="value-withheld-canary_code"');
    expect(html).toContain("Withheld · 14 chars");
    expect(html).not.toContain(">Empty<");
  });
});
