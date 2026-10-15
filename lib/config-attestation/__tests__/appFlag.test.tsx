/**
 * @jest-environment jsdom
 *
 * useAppFlag is a counted door: the hook records a `flags.<name>` read through the real
 * @ai-matrx/data recorder, an absent flag stays `undefined` (the caller keeps current behaviour),
 * the manifest generator declares the flag from a literal call site, and a version check that
 * cannot run is a counted error.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createConfigReadRecorder } from "@ai-matrx/data/config-attestation";
import { useAppFlag } from "@/components/config-attestation/useAppFlag";
import { invalidateWebAppConfig } from "../appConfig";
import {
  __resetConfigReadLedger,
  attachConfigReadRecorder,
  configAttestationCounters,
  noteConfigMissing,
} from "../readLedger";
import { appConfigReads } from "../../../scripts/config-attestation/lib";


(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Mount `Probe` (which calls the hook) and hand back the latest hook value. */
async function mountHook<T>(useIt: () => T): Promise<{ current: T }> {
  const out = {} as { current: T };
  function Probe() {
    out.current = useIt();
    return null;
  }
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () => root.render(<Probe />));
  return out;
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

let rowConfig: Record<string, unknown> = {};
jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    from: () => {
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = () => q;
      q.is = () => q;
      q.maybeSingle = async () => ({ data: { config: rowConfig, min_supported_app_version: null }, error: null });
      return q;
    },
  }),
}));

function recorderSpy() {
  const recorder = createConfigReadRecorder({
    app: "ai-matrx",
    appVersion: "0.4.1",
    buildSha: "a".repeat(40),
    device: () => ({ deviceId: "d", organizationId: "o" }),
    client: async () => ({ data: 1, error: null }),
    flushMinutes: () => 5,
    automation: true,
    log: () => undefined,
    spool: { load: () => undefined, save: () => undefined },
  });
  return { read: jest.spyOn(recorder, "read"), missing: jest.spyOn(recorder, "missing"), recorder };
}

beforeEach(() => {
  __resetConfigReadLedger();
  invalidateWebAppConfig();
  rowConfig = {};
});

test("useAppFlag records a read of flags.<name> and returns the stored boolean", async () => {
  rowConfig = { flags: { sample_switch: false } };
  const { read, recorder } = recorderSpy();
  attachConfigReadRecorder(recorder);
  const result = await mountHook(() => useAppFlag("sample_switch"));
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.value).toBe(false);
  await waitFor(() => expect(read).toHaveBeenCalled());
  expect(read.mock.calls[0][0]).toMatchObject({ kind: "app_config", feature: null, key: "flags.sample_switch", source: "db", invalid: false });
});

test("an absent flag is undefined (never a made-up default) and still counted as a read", async () => {
  const { read, recorder } = recorderSpy();
  attachConfigReadRecorder(recorder);
  const result = await mountHook(() => useAppFlag("never_set"));
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.value).toBeUndefined();
  await waitFor(() => expect(read).toHaveBeenCalled());
  expect(read.mock.calls[0][0]).toMatchObject({ key: "flags.never_set" });
});

test("a non-boolean stored flag is recorded invalid", async () => {
  rowConfig = { flags: { bad: "yes" } };
  const { read, recorder } = recorderSpy();
  attachConfigReadRecorder(recorder);
  const result = await mountHook(() => useAppFlag("bad"));
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.value).toBeUndefined();
  await waitFor(() => expect(read).toHaveBeenCalled());
  expect(read.mock.calls[0][0]).toMatchObject({ key: "flags.bad", invalid: true });
});

test("the manifest generator declares flags.<name> from readAppFlag and useAppFlag literals, and skips the hook's own file", () => {
  const files = [
    { rel: "features/x/A.tsx", text: `const f = useAppFlag("alpha"); const g = useAppFlag<boolean>('beta');` },
    { rel: "features/x/b.ts", text: `await readAppFlag("gamma"); await readAppConfigKey("notice");` },
    { rel: "components/config-attestation/useAppFlag.ts", text: `readAppFlag(name)` },
  ];
  const { keys, dynamic } = appConfigReads(files as never);
  expect([...keys.keys()].sort()).toEqual(["flags.alpha", "flags.beta", "flags.gamma", "notice"]);
  expect(dynamic).toEqual([]);
  const computed = appConfigReads([{ rel: "features/x/c.ts", text: `useAppFlag(someName)` }] as never);
  expect(computed.dynamic).toHaveLength(1);
});

test("a missing stored minimum version is reported to the recorder's missing list and counted", async () => {
  const { missing, recorder } = recorderSpy();
  attachConfigReadRecorder(recorder);
  noteConfigMissing("app_config", null, "min_supported_app_version");
  await new Promise((r) => setTimeout(r, 0));
  expect(missing).toHaveBeenCalledWith({ kind: "app_config", feature: null, key: "min_supported_app_version" });
  expect(configAttestationCounters.version_check_unusable).toBe(0);
});
