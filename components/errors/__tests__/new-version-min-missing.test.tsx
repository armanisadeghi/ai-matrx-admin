/**
 * @jest-environment jsdom
 *
 * NewVersionWatcher: a missing min_supported_app_version, or a page with no version meta, is a
 * COUNTED error (configAttestationCounters.version_check_unusable + the recorder's missing list),
 * never a quiet console.warn.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NewVersionWatcher } from "../NewVersionWatcher";
import { __resetConfigReadLedger, attachConfigReadRecorder, configAttestationCounters } from "@/lib/config-attestation/readLedger";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount() {
  const root = createRoot(document.createElement("div"));
  await act(async () => root.render(<NewVersionWatcher deploymentId={null} />));
}
const waitFor = async (check: () => void) => {
  let last: unknown;
  for (let i = 0; i < 50; i++) {
    try {
      check();
      return;
    } catch (e) {
      last = e;
      await act(async () => new Promise<void>((r) => setTimeout(r, 10)));
    }
  }
  throw last;
};

let minimum: string | undefined;
const readAppConfigKey = jest.fn(async () => ({ value: minimum, found: true, error: null }));
jest.mock("@/lib/config-attestation/appConfig", () => ({
  readAppConfigKey: () => readAppConfigKey(),
}));
// The page "settles" when the test says so (V22: nothing is read on mount).
let settle: (ok: boolean) => void = () => undefined;
let settled: Promise<boolean> = Promise.resolve(true);
jest.mock("@/lib/boot/lateIdle", () => ({ whenLateIdle: () => settled }));
jest.mock("@/lib/toast", () => ({ toast: jest.fn() }));
jest.mock("@/lib/diagnostics/hardNavigationTrace", () => ({ noteHardNavigationReason: jest.fn() }));

function setVersionMeta(v: string | null) {
  document.head.innerHTML = v === null ? "" : `<meta name="matrx-app-version" content="${v}">`;
}

beforeEach(() => {
  settled = Promise.resolve(true);
  readAppConfigKey.mockClear();
  __resetConfigReadLedger();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test("missing stored minimum: counted, reported as missing, logged as an error", async () => {
  const missing = jest.fn();
  attachConfigReadRecorder({ read: jest.fn(), missing } as never);
  minimum = undefined;
  setVersionMeta("0.4.1");
  await mount();
  await waitFor(() => expect(configAttestationCounters.version_check_unusable).toBe(1));
  await waitFor(() => expect(missing).toHaveBeenCalledWith({ kind: "app_config", feature: null, key: "min_supported_app_version" }));
  expect(console.error).toHaveBeenCalled();
});

test("missing page version: counted too", async () => {
  minimum = "0.4.0";
  setVersionMeta(null);
  await mount();
  await waitFor(() => expect(configAttestationCounters.version_check_unusable).toBe(1));
});

test("both present: nothing counted", async () => {
  minimum = "0.4.0";
  setVersionMeta("0.4.1");
  await mount();
  await new Promise((r) => setTimeout(r, 20));
  expect(configAttestationCounters.version_check_unusable).toBe(0);
});

test("V22: nothing is read on mount — the version reads wait for the page to settle", async () => {
  settled = new Promise<boolean>((r) => (settle = r));
  const fetchSpy = jest.fn();
  (globalThis as { fetch?: unknown }).fetch = fetchSpy;
  minimum = "0.4.0";
  setVersionMeta("0.4.1");
  const root = createRoot(document.createElement("div"));
  await act(async () => root.render(<NewVersionWatcher deploymentId="dpl_1" />));
  window.dispatchEvent(new Event("focus"));
  await new Promise((r) => setTimeout(r, 20));
  expect(readAppConfigKey).not.toHaveBeenCalled();
  expect(fetchSpy).not.toHaveBeenCalled();
  await act(async () => settle(true));
  await waitFor(() => expect(readAppConfigKey).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith("/api/version", { cache: "no-store" }));
});
