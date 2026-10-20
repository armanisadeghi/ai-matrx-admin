/**
 * @jest-environment node
 */
// SERVER-ROWS item 2: a local production build (`next start`) carried no build sha, so every signed-in page logged
// `[config-attestation] no_build_identity` to the client error log (ops.system_error, one per page session; seen on
// every table create a speed lane timed). The checkout's HEAD stands in for any run that is not a Vercel deployment.
// RED before the fix: localBuildSha() answered "" whenever NODE_ENV was not "development".
jest.mock("server-only", () => ({}));
const execFileSync = jest.fn(() => "a".repeat(40) + "\n");
jest.mock("node:child_process", () => ({ execFileSync }));

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
  execFileSync.mockClear();
  jest.resetModules();
});

function load(): typeof import("../buildIdentity.server") {
  let mod!: typeof import("../buildIdentity.server");
  jest.isolateModules(() => {
    mod = require("../buildIdentity.server");
  });
  return mod;
}

it("a local production run answers the checkout's HEAD, asked once per process", () => {
  Object.assign(process.env, { NODE_ENV: "production" });
  delete process.env.VERCEL;
  const { localBuildSha } = load();
  expect(localBuildSha()).toBe("a".repeat(40));
  expect(localBuildSha()).toBe("a".repeat(40));
  expect(execFileSync).toHaveBeenCalledTimes(1);
});

it("development answers HEAD on every request (the checkout moves under a dev server)", () => {
  Object.assign(process.env, { NODE_ENV: "development" });
  delete process.env.VERCEL;
  const { localBuildSha } = load();
  localBuildSha();
  localBuildSha();
  expect(execFileSync).toHaveBeenCalledTimes(2);
});

it("a Vercel deployment never asks git (its sha is VERCEL_GIT_COMMIT_SHA)", () => {
  Object.assign(process.env, { NODE_ENV: "production", VERCEL: "1" });
  const { localBuildSha } = load();
  expect(localBuildSha()).toBe("");
  expect(execFileSync).not.toHaveBeenCalled();
});
