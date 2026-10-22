/**
 * The JSON Truncator window is bound to its overlay, so summon remembers it: the tab session brings
 * it back in place after a reload, and its last rect is kept per device.
 *
 * Red before (X5, 2026-10-22): `JsonTruncatorDialog` rendered a page-local WindowPanel (`onClose`
 * only, id "json-truncator-window"), so the window had no persistence identity. Only its
 * `?panels=json_truncator` URL link reopened it after a reload, at the default rect: dragged to
 * (412,224), it came back at (732,84) while Character Counter came back in place.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { jsonTruncatorOverlay } from "../jsonTruncator.definition";

const panelProps: Array<Record<string, unknown>> = [];

jest.mock("@ai-matrx/summon/window", () => ({
  WindowPanel: (props: Record<string, unknown>) => {
    panelProps.push(props);
    return null;
  },
}));
jest.mock("@/components/official-candidate/json-truncator/JsonTruncator", () => ({ JsonTruncator: () => null }));

import OverlayRender from "../jsonTruncator.render";

describe("the jsonTruncator overlay window", () => {
  it("registers under its overlay id and the definition's window id", async () => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
    const root = createRoot(document.createElement("div"));
    await act(async () =>
      root.render(<OverlayRender overlayId="jsonTruncator" isOpen hidden={false} data={{}} instanceId="default" close={jest.fn()} />),
    );
    const props = panelProps.at(-1);
    expect(props?.overlayId).toBe("jsonTruncator");
    expect(props?.id).toBe(jsonTruncatorOverlay.window?.windowId);
    await act(async () => root.unmount());
  });
});
