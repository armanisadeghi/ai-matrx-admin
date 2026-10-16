/**
 * First-paint fetch contract V21/V23/V24 (owner rule, Arman 2026-10-16): telemetry and nudges
 * nobody is waiting for start only after the page has fully settled (lib/boot/lateIdle), and run
 * at most once per session / browser. Fails if a mount-time read or a per-tab repeat returns.
 */
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "../..");
const code = (p: string) =>
  readFileSync(join(root, p), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

test("V21: config attestation starts after late idle; the install row is upserted once per tab session", () => {
  const boot = code("components/config-attestation/ConfigAttestationBoot.tsx");
  expect(boot).toMatch(/whenLateIdle\(undefined, controller\.signal\)\.then\(\(ok\) => \{\s*if \(ok && !stopped\) attempt\(\);/);
  expect(boot).not.toMatch(/^\s*attempt\(\);\s*$/m);
  const recorder = code("lib/config-attestation/recorder.client.ts");
  expect(recorder).toMatch(/area: "session"/);
  expect(recorder).toMatch(/if \(cached && cached\.tag === sessionTag/);
});

test("V23: first touch waits for late idle and is filed once per browser", () => {
  const capture = code("lib/product-analytics/UserAcquisitionCapture.tsx");
  expect(capture).toMatch(/whenLateIdle\(undefined, controller\.signal\)/);
  expect(capture).not.toMatch(/whenPageIdle/);
  expect(capture).toMatch(/id: "acquisition\.first-touch-filed\.browser",\s*area: "local"/);
});

test("V24: the age gate is read only after settle, and never again once this browser saw a band", () => {
  const mount = code("features/education/compliance/FirstSignInAgeGateMount.tsx");
  expect(mount).toMatch(/enabled: settled && !onPortal && !askedAtMount && !declared/);
  expect(mount).toMatch(/markDeclaredInThisBrowser\(userId\)/);
});
