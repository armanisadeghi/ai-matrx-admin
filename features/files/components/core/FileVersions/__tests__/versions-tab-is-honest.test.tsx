/**
 * The Versions tab is honest while its read is slow or dead: it shows a loading state from the very
 * first paint (never "No version history yet" before the read began), and a read that fails or never
 * answers ends in a visible message with a Retry button, never a blank.
 */
/** @jest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let pending: { resolve: () => void; reject: (e: Error) => void; unwrap: () => Promise<void> }[] = [];
const mockStableDispatch = () => {
    let resolve!: () => void;
    let reject!: (e: Error) => void;
    const p = new Promise<void>((res, rej) => ((resolve = res), (reject = rej)));
    const h = { resolve, reject, unwrap: () => p };
    pending.push(h);
    return h;
  };
jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => mockStableDispatch,
  useAppSelector: (sel: (s: unknown) => unknown) => sel({}),
}));
jest.mock("@/features/files/redux/selectors", () => ({
  selectFileById: () => ({ source: { kind: "cloud" } }),
  selectVersionsForFile: () => [],
}));
jest.mock("@/features/files/redux/thunks", () => ({
  loadFileVersions: () => ({}),
  restoreVersion: () => ({}),
}));
jest.mock("@/components/agent-copy/CopyButtons", () => ({ CopyButtons: () => null }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@ai-matrx/design-system/record-list", () => ({ RecordList: () => null }));

import {
  FileVersionsList,
  VERSIONS_LOAD_DEADLINE_MS,
  VERSIONS_TIMEOUT_MESSAGE,
} from "../FileVersionsList";

let host: HTMLDivElement;
let root: Root;
const text = () => host.textContent ?? "";
const retry = () =>
  Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "Retry") as HTMLButtonElement | undefined;
const mount = async () => {
  await act(async () => {
    root.render(<FileVersionsList fileId="f1" />);
  });
};

beforeEach(() => {
  pending = [];
  jest.useFakeTimers();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  jest.useRealTimers();
});

describe("FileVersionsList", () => {
  it("shows Loading from the first paint, not the empty state", async () => {
    await mount();
    expect(text()).toContain("Loading versions…");
    expect(text()).not.toContain("No version history yet");
  });

  it("a failed read says so with Retry", async () => {
    await mount();
    await act(async () => {
      pending[0].reject(new Error("boom"));
    });
    expect(text()).toContain("Couldn't load versions");
    expect(retry()).toBeTruthy();
  });

  it("a read that never answers times out with the message and Retry, then Retry reads again", async () => {
    await mount();
    await act(async () => {
      jest.advanceTimersByTime(VERSIONS_LOAD_DEADLINE_MS + 10);
    });
    expect(text()).toContain(VERSIONS_TIMEOUT_MESSAGE);
    expect(retry()).toBeTruthy();
    await act(async () => {
      retry()!.click();
    });
    expect(pending.length).toBe(2);
    expect(text()).toContain("Loading versions…");
  });
});
