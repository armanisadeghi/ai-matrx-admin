/**
 * First-paint contract V7: the durable-file-URL session (POST /files/session on both hosts) is NOT
 * minted by the watcher at load, idle or late idle. A private media render that loads without it
 * recovers through `recoverLoadError` -> `ensureSession({ force: true })`. Only a real switch of
 * person in a tab that already had an identity re-mints at once.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ensureSession = jest.fn(async () => undefined);
jest.mock("@/features/files/media-client/client", () => ({
  mediaFilesClient: { ensureSession: (...a: unknown[]) => (ensureSession as (...x: unknown[]) => unknown)(...a) },
}));

let listeners: Array<(event: string, session: unknown) => void> = [];
jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "u1", email: "a@b.c" } } } }),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        listeners.push(cb);
        return { data: { subscription: { unsubscribe: () => undefined } } };
      },
    },
  },
}));
jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (selector: (s: unknown) => unknown) => selector({ userAuth: { id: "u1" } }),
}));
jest.mock("next/dynamic", () => () => () => null);

const session = (id: string) => ({ user: { id, email: `${id}@x.y` } });

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function mount() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Watcher = require("./AuthSessionWatcher").default as React.ComponentType;
  container = document.createElement("div");
  root = createRoot(container);
  await act(async () => {
    root!.render(<Watcher />);
  });
}

beforeEach(() => {
  ensureSession.mockClear();
  listeners = [];
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
});

it("mints nothing at load, however long the tab idles", async () => {
  jest.useFakeTimers();
  await mount();
  await act(async () => {
    jest.advanceTimersByTime(60_000);
  });
  jest.useRealTimers();
  expect(ensureSession).not.toHaveBeenCalled();
});

it("a first auth event in a fresh tab mints nothing; a different person signing in re-mints at once", async () => {
  await mount();
  await act(async () => {
    for (const l of listeners) l("INITIAL_SESSION", session("u1"));
    for (const l of listeners) l("SIGNED_IN", session("u1"));
  });
  expect(ensureSession).not.toHaveBeenCalled();
  await act(async () => {
    for (const l of listeners) l("SIGNED_IN", session("u2"));
  });
  expect(ensureSession).toHaveBeenCalledWith({ force: true });
});
