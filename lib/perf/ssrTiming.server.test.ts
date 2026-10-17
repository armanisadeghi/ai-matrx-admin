// The first-byte timing line must say WHICH await spent the time, and in production it must appear
// for every slow render and for a fresh instance's first renders (cold starts), and stay quiet
// otherwise. Each case loads a fresh module, so "first renders of this instance" restarts.
jest.mock("server-only", () => ({}));

type Mod = typeof import("./ssrTiming.server");

function freshModule(nodeEnv: string): Mod {
  let mod: Mod | undefined;
  const env = process.env as Record<string, string | undefined>;
  const before = env.NODE_ENV;
  env.NODE_ENV = nodeEnv;
  jest.isolateModules(() => {
    mod = jest.requireActual("./ssrTiming.server") as Mod;
  });
  env.NODE_ENV = before;
  return mod!;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("startSsrTiming", () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it("names every awaited step and its duration in the line", async () => {
    const { startSsrTiming } = freshModule("production");
    const t = startSsrTiming("(core)", "/chat/new");
    const value = await t.step("seed", wait(30).then(() => 42));
    expect(value).toBe(42);
    await t.step("admin", Promise.resolve(null));
    t.end({ seeded: true });
    expect(warn).toHaveBeenCalledTimes(1);
    const line = String(warn.mock.calls[0][0]);
    expect(line).toMatch(/^\[ssr-timing\] \(core\) \/chat\/new awaited=\d+ms /);
    expect(line).toMatch(/seed=(2\d|[3-9]\d|\d{3,})\b/);
    expect(line).toContain("admin=");
    expect(line).toContain("render#1");
    expect(line).toContain("seeded=true");
  });

  it("production: logs a warm instance's fast render only for the first few renders", async () => {
    const { startSsrTiming } = freshModule("production");
    for (let i = 0; i < 6; i++) {
      const t = startSsrTiming("(core)", "/x");
      await t.step("admin", Promise.resolve(1));
      t.end();
    }
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it("production: always logs a slow render, however warm the instance", async () => {
    const mod = freshModule("production");
    for (let i = 0; i < 3; i++) mod.startSsrTiming("(core)", "/x").end();
    warn.mockClear();
    const t = mod.startSsrTiming("(core)", "/slow");
    await t.step("usage", wait(mod.SSR_TIMING_SLOW_MS + 20));
    t.end();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("/slow");
  });

  it("a step that throws is still timed and the error still reaches the caller", async () => {
    const { startSsrTiming } = freshModule("development");
    const t = startSsrTiming("(core)", "/x");
    await expect(t.step("auth", Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    t.end();
    expect(String(warn.mock.calls[0][0])).toContain("auth=");
  });
});
