/**
 * A manual copy is ASKED and ANSWERED: `showManualCopy` opens the summon overlay `clipboardFallbackDialog`
 * and resolves when the person closes it; kit's `openClipboardFallback` (what packages call) reaches the same
 * overlay through `ClipboardFallbackBridge`.
 *
 * Red before: sweeper commit 27a18e5980 deleted the overlay's definition and render while `requestOverlay`
 * still asked for it, so the request never rendered and its caller hung with no error (final review 2, #1).
 * Only the store (opens = mounts the registered render module) and the dialog body are doubles.
 */
import { createRoot, type Root } from "react-dom/client";

const shown: Array<{ url: string; title?: string; onOpenChange: (open: boolean) => void }> = [];
jest.mock("@ai-matrx/design-system", () => ({
  ClipboardFallbackDialog: (props: { url: string; title?: string; onOpenChange: (open: boolean) => void }) => {
    shown.push(props);
    return null;
  },
}));

const mounted = new Map<string, Root>();
const fakeStore = {
  dispatch: (action: { type: string; payload: { overlayId: string; instanceId?: string; data?: unknown } }) => {
    const { overlayId, instanceId = "default", data } = action.payload;
    const key = `${overlayId}:${instanceId}`;
    if (/open/i.test(action.type)) {
      void (async () => {
        const { RENDER_MAP } = await import("@/features/overlays/definitions/render-map");
        const loader = RENDER_MAP[overlayId as keyof typeof RENDER_MAP];
        if (!loader) return; // an unregistered overlay renders nothing — the hang this test catches
        const { default: Render } = (await loader()) as unknown as { default: React.ComponentType<Record<string, unknown>> };
        const root = createRoot(document.createElement("div"));
        mounted.set(key, root);
        const close = () => fakeStore.dispatch({ type: "overlays/closeOverlay", payload: { overlayId, instanceId } });
        root.render(<Render overlayId={overlayId} instanceId={instanceId} isOpen hidden={false} data={data} close={close} />);
      })();
    } else {
      const root = mounted.get(key);
      mounted.delete(key);
      if (root) setTimeout(() => root.unmount(), 0);
    }
  },
};
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: () => fakeStore }));

import { APP_OVERLAYS } from "@/features/overlays/definitions/registry";
import { showManualCopy } from "../manualCopyOpener";
import { ClipboardFallbackBridge } from "../ClipboardFallbackBridge";
import { openClipboardFallback } from "@ai-matrx/kit/clipboard-fallback-opener";

async function until<T>(read: () => T | undefined, ms = 3000): Promise<T> {
  const deadline = Date.now() + ms;
  for (;;) {
    const value = read();
    if (value !== undefined) return value;
    if (Date.now() > deadline) throw new Error("timed out: the manual copy never showed");
    await new Promise((r) => setTimeout(r, 10));
  }
}

// Real async rendering (the overlay mounts after a lazy import), polled by `until`.
beforeAll(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: false });
});
beforeEach(() => {
  shown.length = 0;
});

describe("the manual copy", () => {
  it("is a registered summon overlay", () => {
    expect(APP_OVERLAYS.map((o) => o.id)).toContain("clipboardFallbackDialog");
  });

  it("showManualCopy shows the text and resolves when the person closes it", async () => {
    let done = false;
    const asked = showManualCopy({ text: "PX-3318", title: "Copy the crate code" }).then(() => {
      done = true;
    });
    const dialog = await until(() => shown.find((p) => p.url === "PX-3318"));
    expect(dialog.title).toBe("Copy the crate code");
    expect(done).toBe(false);
    dialog.onOpenChange(false);
    await asked;
    expect(done).toBe(true);
  });

  it("kit openClipboardFallback reaches the same overlay through the bridge", async () => {
    const bridge = createRoot(document.createElement("div"));
    bridge.render(<ClipboardFallbackBridge />);
    const asked = openClipboardFallback("ground floor only");
    const dialog = await until(() => shown.find((p) => p.url === "ground floor only"));
    dialog.onOpenChange(false);
    await expect(asked).resolves.toBeUndefined();
    bridge.unmount();
  });
});
