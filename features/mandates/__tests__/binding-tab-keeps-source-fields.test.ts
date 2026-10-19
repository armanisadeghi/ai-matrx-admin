/**
 * THE BINDING TAB SAVES A MAP WITHOUT LOSING ANY FIELD OF IT (2026-10-19).
 *
 * The combiner's source fields (`template`, `item_template`, `item_separator`,
 * `separator`, aidream 3f068eaa95) and the older ones (`heading`, `compact`,
 * `max_*`) were rebuilt away by parse -> edit -> save, wiping search_decide's
 * framing. Load a stored map, change NOTHING, write it: the wire must equal the
 * stored map, byte for byte.
 */
import { consumptionMapForApi } from "@/features/mandates/overrides";
import { parseConsumptionMap } from "@/features/mandates/provision-shapes";
import { framingFieldsOf } from "@/features/bindings/SourceFraming";

const stored = {
  brand_context: [
    {
      mapType: "offered_value",
      target: "name",
      deliver: "variable",
      when_absent: "fail",
      template: "What we know so far:\nConfirmed by the person:\n- name: {value}",
    },
    {
      mapType: "offered_value",
      target: "facts",
      deliver: "variable",
      when_absent: "skip",
      template: "{value}",
      item_template: "- fact: {value}",
      item_separator: "\n",
      separator: "\n",
      compact: true,
    },
    {
      mapType: "offered_value",
      target: "domain",
      deliver: "variable",
      when_absent: "use_default",
      default: "[NONE]",
      template: "Website:\n{value}",
      heading: "Domain",
      max_chars: 200,
    },
  ],
  item: { mapType: "offered_value", target: "item", deliver: "variable", when_absent: "fail" },
};

describe("a stored map survives load -> save unchanged", () => {
  it("writes back every source field, the four combiner fields included", () => {
    const wire = consumptionMapForApi(parseConsumptionMap(stored));
    expect(wire).toEqual(stored);
  });

  it("the writer alone carries unknown keys of a source it is handed", () => {
    const wire = consumptionMapForApi({
      x: [{ ...stored.brand_context[1] } as never],
    });
    expect(wire).toEqual({ x: stored.brand_context[1] });
  });

  it("shows the four combiner fields of a source, and nothing for a plain one", () => {
    const map = parseConsumptionMap(stored);
    expect(framingFieldsOf(map.brand_context[1]).map((f) => f.key)).toEqual([
      "template",
      "item_template",
      "item_separator",
      "separator",
    ]);
    expect(framingFieldsOf(map.item[0])).toEqual([]);
  });
});
