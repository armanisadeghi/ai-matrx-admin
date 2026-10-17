/**
 * The plain metadata index (read by server components) is the definitions' own metadata, row for
 * row: a definition edited without regenerating the index fails here.
 */
import { APP_OVERLAYS } from "../registry";
import { OVERLAY_META_INDEX } from "../overlay-meta-index";

const plain = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

describe("overlay meta index", () => {
  it("matches every definition's id, label, instance and window identity", () => {
    const fromDefinitions = APP_OVERLAYS.map((d) => ({
      id: d.id,
      label: d.label,
      instance: d.instance,
      ...(d.window ? { window: { windowId: d.window.windowId, mobile: d.window.mobile, deprecated: d.window.deprecated } } : {}),
    }));
    expect(plain(OVERLAY_META_INDEX)).toEqual(plain(fromDefinitions));
  });
});
