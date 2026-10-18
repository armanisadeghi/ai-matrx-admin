/**
 * Final review 2026-10-18 (lane r3a):
 *  - the width the Studio picks its layout from follows the body element when the page re-parents it
 *    (the surface wrapper swaps the moment an agent exists) and never reads a detached 0 as a width —
 *    a 1440 window drew the phone tab layout right after the flip;
 *  - a kept build is reported finished only once the saved agent's id is on the record (or after a
 *    bounded wait), so Describe moves to Test & improve by itself;
 *  - applied-but-unsaved edits are stored and read back against the saved state they were made on.
 */
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { useMeasuredWidth } from "../use-width";
import { buildIsSettled, MAX_POLLS_FOR_AGENT_ID } from "@/features/agents/factory/components/BuildProgress";
import { readUnsaved, savedBaseOf, unsavedFromRecord, UNSAVED_KEY } from "../unsaved-edits";

type RoCallback = (entries: { contentRect: { width: number } }[]) => void;
const observers: { el: Element; cb: RoCallback; live: boolean }[] = [];
beforeAll(() => {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    private rec: { el: Element; cb: RoCallback; live: boolean } | null = null;
    constructor(private cb: RoCallback) {}
    observe(el: Element) {
      this.rec = { el, cb: this.cb, live: true };
      observers.push(this.rec);
    }
    disconnect() {
      if (this.rec) this.rec.live = false;
    }
  };
});

let bodyW = 1400;
beforeAll(() => {
  HTMLElement.prototype.getBoundingClientRect = () => ({ width: bodyW }) as DOMRect;
});

function Probe({ swap, onWidth }: { swap: boolean; onWidth: (w: number | null) => void }) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  onWidth(width);
  // The Studio's flip: a different wrapper around the same body → a NEW body element.
  return swap ? (
    <section>
      <div data-testid="b" ref={ref} />
    </section>
  ) : (
    <div data-testid="a" ref={ref} />
  );
}

describe("Studio width follows the body element across the flip", () => {
  it("keeps the real width after the body is re-parented; a detached node's 0 is never a width", () => {
    let seen: number | null = null;
    let setSwap: (v: boolean) => void = () => {};
    function Host() {
      const [swap, set] = useState(false);
      setSwap = set;
      return <Probe swap={swap} onWidth={(w) => (seen = w)} />;
    }
    const host = document.createElement("div");
    document.body.appendChild(host);
    act(() => createRoot(host).render(<Host />));
    expect(seen).toBe(1400);
    const first = observers[observers.length - 1];
    act(() => setSwap(true));
    // The old node goes away; its observer must be disconnected and a 0 from it ignored.
    act(() => first.cb([{ contentRect: { width: 0 } }]));
    expect(seen).toBe(1400);
    const current = observers.filter((o) => o.live);
    expect(current).toHaveLength(1);
    expect(current[0].el).not.toBe(first.el);
    bodyW = 1200;
    act(() => current[0].cb([{ contentRect: { width: 1200 } }]));
    expect(seen).toBe(1200);
  });
});

describe("a kept build is finished only with its agent id", () => {
  const over = { spineStatus: "completed" as const };
  it("waits for the agent id of a kept outcome", () => {
    expect(buildIsSettled({ ...over, state: { outcome: "saved_unproven" } } as never, 1)).toBe(false);
    expect(buildIsSettled({ ...over, state: { outcome: "saved_unproven", agent_id: "a1" } } as never, 1)).toBe(true);
  });
  it("does not wait for a build that kept nothing, and stops waiting after the bound", () => {
    expect(buildIsSettled({ ...over, state: { outcome: "unproven" } } as never, 1)).toBe(true);
    expect(buildIsSettled({ ...over, state: { outcome: "passed" } } as never, MAX_POLLS_FOR_AGENT_ID)).toBe(true);
    expect(buildIsSettled({ spineStatus: "running", state: { outcome: "passed", agent_id: "a1" } } as never, 50)).toBe(false);
  });
});

describe("applied-but-unsaved edits", () => {
  const record = {
    version: 3,
    updatedAt: "2026-10-18T00:00:00Z",
    name: "Customer-reply writer",
    messages: [{ role: "system", content: [{ type: "text", text: "NEW rules" }] }],
    _dirtyFields: { messages: true },
  } as never;
  it("stores only the dirty fields, against the saved version they were made on", () => {
    const v = unsavedFromRecord("ag1", record);
    expect(v).toEqual({ agent_id: "ag1", base: "v3", fields: { messages: (record as { messages: unknown }).messages } });
    expect(unsavedFromRecord("ag1", { ...(record as object), _dirtyFields: {} } as never)).toBeNull();
  });
  it("reads them back only for the same agent and the same saved state", () => {
    const meta = { [UNSAVED_KEY]: unsavedFromRecord("ag1", record), other: 1 };
    expect(readUnsaved(meta, "ag1", savedBaseOf({ version: 3, updatedAt: "" } as never))?.fields).toHaveProperty("messages");
    expect(readUnsaved(meta, "ag1", "v4")).toBeNull();
    expect(readUnsaved(meta, "ag2", "v3")).toBeNull();
    expect(readUnsaved({ [UNSAVED_KEY]: { agent_id: "ag1", base: "v3", fields: {} } }, "ag1", "v3")).toBeNull();
  });
});
