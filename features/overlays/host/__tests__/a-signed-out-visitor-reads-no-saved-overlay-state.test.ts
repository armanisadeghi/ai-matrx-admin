/**
 * Overlay state is saved per person. A signed-out visitor used to make the data adapter throw
 * "no signed-in person" on boot, which filed a red /api/diagnostics/client-error on every
 * signed-out page load (speed-test census, live 2026-10-18). Replaced: only the database client
 * (a session-less stand-in) and the app store; the real adapter and the real port run.
 */
const mockGetSession = jest.fn(async () => ({ data: { session: null } }));
jest.mock("@ai-matrx/data/db", () => ({
  createDb: () => ({ client: { auth: { getSession: () => mockGetSession() } } }),
}));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/lib/toast", () => ({ toast: {} }));
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({ captureError: jest.fn() }));

import { createPersistencePort } from "../ports";

const store = (userId: string | null) => ({
  getState: () => ({ userAuth: { id: userId, fingerprintId: "fp" }, appContext: {} }),
  subscribe: () => () => undefined,
});

it("a signed-out visitor reads and writes nothing, and nothing throws", async () => {
  const port = createPersistencePort(store(null));
  const all = await port.loadAll!();
  expect(all.size).toBe(0);
  expect(await port.load("workspace")).toBeNull();
  expect(await port.list!("state:")).toEqual([]);
  await expect(port.save("workspace", {})).resolves.toBeDefined();
  await expect(port.remove("workspace")).resolves.toBeUndefined();
});

it("a signed-in person still goes through the real adapter", async () => {
  const port = createPersistencePort(store("11111111-1111-1111-1111-111111111111"));
  // The session-less stand-in db has no table, so the adapter is reached and fails on ITS terms, not ours.
  await expect(port.loadAll!()).rejects.not.toThrow(/no signed-in person/);
});
