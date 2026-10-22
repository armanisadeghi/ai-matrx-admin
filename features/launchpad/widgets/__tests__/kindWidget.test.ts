// The Shape widget: any registered kind on a launchpad, through the ONE kind pipeline; the page bus carries a
// value of a kind whole (its `__kind` is never stripped), and only a value that really carries one draws.
jest.mock("@/features/content-ir/registry/kind-catalog", () => ({ listAllKinds: jest.fn() }));
jest.mock("@/features/content-ir/studio/instance-service", () => ({ listKindInstances: jest.fn(), instanceDataAsRecord: jest.fn() }));

import { asShapeValue, canFeed, coercePageValue } from "../../bus/ports";
import { getLaunchpadWidgetSpec } from "../catalog";
import { shapeChoices } from "../KindInstancePicker";

describe("the Shape widget", () => {
  it("is in the catalog with a saved-shape picker and a Shape input; an Applet can offer one", () => {
    const spec = getLaunchpadWidgetSpec("kind");
    expect(spec?.fields).toEqual([{ key: "instanceId", label: "Saved shape", picker: "kindInstance" }]);
    expect(spec?.accepts).toEqual([{ key: "value", label: "Shape", kind: "shape" }]);
    expect(getLaunchpadWidgetSpec("applet")?.publishes?.some((p) => p.key === "out_shape" && p.kind === "shape")).toBe(true);
  });

  it("a shape input takes a value carrying __kind, whole, from a shape, a record or JSON text", () => {
    const flash = { __kind: "flashcard_set", title: "Verbs", cards: [] };
    expect(coercePageValue(flash, "shape", "shape")).toBe(flash);
    expect(coercePageValue(flash, "record", "shape")).toBe(flash);
    expect(coercePageValue(JSON.stringify(flash), "text", "shape")).toEqual(flash);
    expect(coercePageValue({ token: "note", id: "1", label: "N" }, "record", "shape")).toBeUndefined();
    expect(coercePageValue("plain words", "text", "shape")).toBeUndefined();
    expect(coercePageValue({ title: "no kind" }, "shape", "shape")).toBeUndefined();
    expect(coercePageValue({ rows: [] }, "rows", "shape")).toBeUndefined();
    expect(canFeed("shape", "text")).toBe(false);
    expect(asShapeValue({ __kind: "" })).toBeUndefined();
  });

  it("offers shapes people save, never a machine contract or a switched-off kind", () => {
    const e = (kind: string, dbRowId: string | null, isActive: boolean | null, family: string | null) => ({ kind, label: kind, dbRowId, isActive, family });
    expect(
      shapeChoices([e("quiz", "q", true, null), e("agent_out", "a", true, "agent_io"), e("off", "o", false, null), e("compiled", null, null, null), e("brief", "b", null, "render_block")]).map((c) => c.kind),
    ).toEqual(["brief", "quiz"]);
  });
});

describe("the Space page widget", () => {
  it("is in the catalog with a page picker and opens the page", () => {
    const spec = getLaunchpadWidgetSpec("space_page");
    expect(spec?.fields).toEqual([{ key: "spaceId", label: "Page", picker: "spacePage" }]);
    expect(spec?.href?.({ spaceId: "abc" })).toBe("/spaces/abc");
    expect(spec?.describe({ spaceId: "abc", title: "Plan" })).toBe("Plan");
  });
});
