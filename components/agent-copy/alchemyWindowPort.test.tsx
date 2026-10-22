/**
 * PP-01a — the web app's WindowPort draws LIVE preparation sessions as the multi-instance summon
 * overlay `alchemyPrepareWindow`, several at once (census 2 TRUE-3: no second window host).
 *
 * Real: the port, summon's store (open/close actions, close lifecycle, handle registry), the overlay's
 * render module, and two real `@ai-matrx/alchemy/operate` preparation sessions. `WindowPanel` is
 * a pass-through. Breaks caught: the render closure serialized or lost (the second seal would never
 * show); two sessions sharing one window or one session's edit reaching the other; a closed window
 * never telling its opener, or telling it twice; open data carrying anything but the handle id; a
 * re-open of the same id opening a second window instead of redrawing and focusing the first.
 */
import React, { act, useEffect, useState, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { openPreparation, type PreparationSession, type SealedArtifact } from "@ai-matrx/alchemy/operate";
import type { WindowHandle } from "@ai-matrx/alchemy/ports";
import { createTestSummonStore } from "@ai-matrx/summon/testing";
import { selectOverlay } from "@ai-matrx/summon/boot-kit";
import { closeOverlay } from "@ai-matrx/summon/boot";
import { alchemyPanelId, createAlchemyWindowPort } from "./alchemyWindowPort";

jest.mock("@ai-matrx/summon/window", () => ({
  WindowPanel: ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <section data-window-id={id} aria-label={title}>
      {children}
    </section>
  ),
}));

import OverlayRender from "@/features/overlays/definitions/alchemyPrepareWindow.render";

const OVERLAY = "alchemyPrepareWindow";
const routeNotes = "Route 14 — Tuesday pickups\nHarbor Dental: cardboard, dock behind the blue door";
const intakeNotes = "New-patient intake — Marisol Ortega\nInsurer: Delta Dental PPO";

type Store = ReturnType<typeof createTestSummonStore>;

/** Draws every open `alchemyPrepareWindow` instance the way SummonHost does: data + instanceId + close. */
function Host({ store, ids }: { store: Store; ids: () => string[] }) {
  useSyncExternalStore(store.subscribe, store.getState);
  return (
    <>
      {ids()
        .filter((instanceId) => selectOverlay(store.getState(), OVERLAY, instanceId).isOpen)
        .map((instanceId) => (
          <OverlayRender
            key={instanceId}
            overlayId={OVERLAY}
            instanceId={instanceId}
            isOpen
            hidden={false}
            data={selectOverlay(store.getState(), OVERLAY, instanceId).data as never}
            close={() => store.dispatch(closeOverlay({ overlayId: OVERLAY, instanceId }) as never)}
          />
        ))}
    </>
  );
}

function SessionView({ session, label }: { session: PreparationSession; label: string }) {
  const [artifact, setArtifact] = useState<SealedArtifact | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    void session.seal("plain", {}, new AbortController().signal).then(setArtifact);
  }, [session, revision]);
  return (
    <div>
      <pre aria-label={label}>{artifact?.plainText ?? ""}</pre>
      <button
        type="button"
        aria-label={`${label}: keep the heading only`}
        onClick={() => {
          session.edit({ kind: "text", text: session.draft.payload.kind === "text" ? (session.draft.payload.text.split("\n")[0] ?? "") : "" });
          setRevision((r) => r + 1);
        }}
      />
    </div>
  );
}

const sealedText = async (session: PreparationSession) => (await session.seal("plain", {}, new AbortController().signal)).plainText;
const byLabel = (label: string) => document.querySelector(`[aria-label="${label}"]`);
async function waitFor(check: () => boolean, what: string) {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
  throw new Error(`never happened: ${what}`);
}

describe("web app WindowPort (PP-01a) on the alchemyPrepareWindow overlay", () => {
  let container: HTMLDivElement;
  let root: Root;
  let store: Store;
  let opened: string[];
  const mount = async () => {
    await act(async () => root.render(<Host store={store} ids={() => opened} />));
  };
  const port = () => {
    const p = createAlchemyWindowPort(store);
    return {
      ...p,
      open: (...args: Parameters<typeof p.open>) => {
        const handle = p.open(...args);
        if (!opened.includes(handle.instanceId)) opened.push(handle.instanceId);
        return handle;
      },
    };
  };

  beforeEach(() => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
    store = createTestSummonStore();
    opened = [];
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("is a real window host: non-blocking and several at once", () => {
    const p = createAlchemyWindowPort(store);
    expect(p.presentation).toBe("window");
    expect(p.multiInstance).toBe(true);
  });

  it("two live sessions open side by side, each showing exactly its own sealed artifact before and after an edit", async () => {
    await mount();
    const p = port();
    const route = await openPreparation({ kind: "text", text: routeNotes }, "target", new AbortController().signal);
    const intake = await openPreparation({ kind: "text", text: intakeNotes }, "target", new AbortController().signal);
    let first!: WindowHandle;
    await act(async () => {
      first = p.open(() => <SessionView session={route} label="Route preview" />, { title: "Prepare route notes" });
      p.open(() => <SessionView session={intake} label="Intake preview" />, { title: "Prepare intake" });
    });
    // The open data is the handle id and nothing else: the closure never rides as Json.
    expect(Object.keys(selectOverlay(store.getState(), OVERLAY, first.instanceId).data as object)).toEqual(["handleId"]);
    await waitFor(() => byLabel("Route preview")?.textContent === routeNotes && byLabel("Intake preview")?.textContent === intakeNotes, "both previews sealed");
    expect(byLabel("Route preview")?.textContent).toBe(await sealedText(route));

    await act(async () => {
      (byLabel("Route preview: keep the heading only") as HTMLButtonElement).click();
    });
    await waitFor(() => byLabel("Route preview")?.textContent === "Route 14 — Tuesday pickups", "the route edit sealed");
    expect(byLabel("Route preview")?.textContent).toBe(await sealedText(route));
    expect(byLabel("Intake preview")?.textContent).toBe(intakeNotes);
  });

  it("closing one window tells only its opener, once, and leaves the other open", async () => {
    await mount();
    const p = port();
    const firstClosed = jest.fn();
    const secondClosed = jest.fn();
    let first!: WindowHandle;
    let second!: WindowHandle;
    await act(async () => {
      first = p.open(() => <p>Pickup schedule</p>, { title: "Prepare pickup schedule", onClose: firstClosed });
      second = p.open(() => <p>Dental intake</p>, { title: "Prepare intake", onClose: secondClosed });
    });
    expect(document.body.textContent).toContain("Pickup schedule");
    await act(async () => first.close());
    await act(async () => first.close());
    expect(firstClosed).toHaveBeenCalledTimes(1);
    expect(secondClosed).not.toHaveBeenCalled();
    expect(first.isOpen()).toBe(false);
    expect(document.body.textContent).not.toContain("Pickup schedule");
    expect(document.body.textContent).toContain("Dental intake");
    expect(second.isOpen()).toBe(true);

    // The person closing the window (the overlay closes, not the handle) tells the opener too.
    await act(async () => {
      store.dispatch(closeOverlay({ overlayId: OVERLAY, instanceId: second.instanceId }) as never);
    });
    expect(secondClosed).toHaveBeenCalledTimes(1);
    expect(second.isOpen()).toBe(false);
  });

  it("re-opening an open instance id redraws that window and focuses it, never a second one", async () => {
    await mount();
    const dispatched: string[] = [];
    const recording = { dispatch: (action: { type: string; payload?: unknown }) => {
      if (action.type.endsWith("focusWindow")) dispatched.push(String(action.payload));
      return store.dispatch(action as never);
    } };
    const p = createAlchemyWindowPort(recording);
    opened.push("session-a");
    let handle!: WindowHandle;
    await act(async () => {
      handle = p.open(() => <p>First draft</p>, { title: "Prepare", instanceId: "session-a" });
    });
    expect(document.body.textContent).toContain("First draft");
    await act(async () => {
      const again = p.open(() => <p>Second draft</p>, { title: "Prepare again", instanceId: "session-a" });
      expect(again).toBe(handle);
    });
    expect(document.body.textContent).toContain("Second draft");
    expect(document.body.textContent).not.toContain("First draft");
    expect(document.querySelectorAll("[data-window-id]")).toHaveLength(1);
    expect(dispatched).toEqual([alchemyPanelId("session-a")]);
  });
});
