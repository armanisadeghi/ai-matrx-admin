/**
 * Owner rule "nothing that works changes" (fix 2026-10-22, review C-2): Zillow's "For sale or rent" and "Home type"
 * are OPTIONAL choices, "Any" by default, and a plain "Where" search sends exactly the request it sent before they
 * existed — `{"inputs":[{"location":"…"}]}`, the shape of the last good run before the change (job 0b577c07,
 * inputs [{"location":"tustin, ca"}]). Nothing is pre-filled, so no organization silently searches Houses only.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

import { buildInput, inputFieldsFor, parseCatalog, searchOptions } from "../contract";
import { SourceInputFields } from "../SourceInputFields";

jest.mock("@/components/official/ProInput", () => ({
  ProInput: (p: { "aria-label"?: string; value?: string }) => <input aria-label={p["aria-label"]} defaultValue={p.value} />,
}));
jest.mock("@ai-matrx/design-system/controls", () => {
  const Select = (p: { "aria-label"?: string; value?: string; options?: { value: string; label: string }[] }) => (
    <div aria-label={p["aria-label"]} data-value={p.value} data-options={(p.options ?? []).map((o) => o.label).join("|")} />
  );
  const box = (p: { "aria-label"?: string }) => <div aria-label={p["aria-label"]} />;
  return { SegmentedControl: box, Select, Button: () => null, OptionCombobox: box };
});
jest.mock("@/features/comparison/server", () => ({ lookupItems: jest.fn() }));

const fields = [
  { name: "url", label: "Page address", required: true, type: "url" },
  { name: "listingCategory", label: "For sale, for rent or sold", required: false },
  { name: "HomeType", label: "Home type", required: false },
];
const row = (needs: string[], searchFilters: string[] = []) =>
  parseCatalog({
    sources: [{ key: "zillow_listing", label: "Zillow homes", group: "Real estate", input: { kind: "url", fields, discover_options: { input_filters: needs } }, search_filters: searchFilters }],
  }).sources[0];

// The row as fixed on live, and the row as the change left it (both must give the plain request).
const fixed = row(["location"]);
const changed = row(["location", "listingCategory", "HomeType"]);
const PLAIN = '{"inputs":[{"location":"Tustin, CA"}]}';

describe("a plain Where search is the request it always was", () => {
  it.each([["fixed row", fixed], ["changed row", changed]])("%s: status and home type are optional", (_n, src) => {
    const got = inputFieldsFor(src, "input_filters").map((f) => [f.name, f.required]);
    expect(got).toEqual([["location", true], ["listingCategory", false], ["HomeType", false]]);
  });
  it.each([["fixed row", fixed], ["changed row", changed]])("%s: Where alone builds the pre-change bytes", (_n, src) => {
    expect(JSON.stringify(buildInput(src, { location: "Tustin, CA" }, "input_filters").input)).toBe(PLAIN);
  });
  it("a chosen status or home type still rides along", () => {
    expect(buildInput(fixed, { location: "Tacoma, WA", HomeType: "Townhomes" }, "input_filters").input).toEqual({
      inputs: [{ location: "Tacoma, WA", HomeType: "Townhomes" }],
    });
  });
  it("a switched provider lists its own filters, so the dataset's choices do not ride", () => {
    expect(searchOptions(row(["location"], ["status", "home_type"]))[0].fields.map((f) => f.name)).toEqual(["location"]);
  });
});

describe("the form pre-fills nothing and shows Any", () => {
  it("opens with Any for both and never writes a choice into the values", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const onValues = jest.fn();
    act(() => root.render(<SourceInputFields source={changed} values={{ location: "Tustin, CA" }} option={null} onValues={onValues} onOption={() => {}} />));
    for (const label of ["For sale or rent", "Home type"]) {
      const el = host.querySelector(`[aria-label="${label}"]`);
      expect(el?.getAttribute("data-value")).toBe("any");
      expect(el?.getAttribute("data-options")?.split("|")[0]).toBe("Any");
    }
    for (const call of onValues.mock.calls) expect(Object.keys(call[0])).not.toEqual(expect.arrayContaining(["listingCategory"]));
    expect(onValues.mock.calls.some((c) => "listingCategory" in c[0] || "HomeType" in c[0])).toBe(false);
    act(() => root.unmount());
    host.remove();
  });
});
