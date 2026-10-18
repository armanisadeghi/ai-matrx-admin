/** @jest-environment node */
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Guard: the welcome page renders each step behind its own `step ===` test, so two headings can never stack,
// and the two steps that have a way out say so in words ("Skip" in the door, "Later" on Meet Matrx).
const client = readFileSync(join(process.cwd(), "app/(core)/welcome/WelcomeClient.tsx"), "utf8");
const door = readFileSync(join(process.cwd(), "features/marketing/smart-add/welcome/WelcomeDoor.tsx"), "utf8");

describe("the welcome shows one step at a time", () => {
  it("each step is rendered only on its own step", () => {
    for (const s of ["identity", "age", "meet", "start"]) expect(client).toContain(`step === "${s}"`);
  });
  it("the door no longer renders the page's content beside itself", () => {
    expect(door).not.toMatch(/\{children\}/);
  });
  it("Meet Matrx has Later; progress is saved to the person, never to browser storage", () => {
    expect(client).toContain("meet-later");
    expect(client).not.toMatch(/localStorage|sessionStorage/);
  });
});

describe("picking a place to start finishes the welcome", () => {
  // Until 2026-10-18 no start tile wrote the completion flag, so /dashboard's funnel sent every new account back here.
  it("the tile handler writes onboarding_completed before it navigates", () => {
    const go = client.slice(client.indexOf("async function go("), client.indexOf("return (\n"));
    expect(go).toMatch(/updateUser\(\{ data: \{ \[ONBOARDING_METADATA_KEY\]: true \} \}\)[\s\S]*router\.push\(href\)/);
    expect(client).toContain("onClick={() => void go(option.href)}");
  });
});

const mount = readFileSync(join(process.cwd(), "features/education/compliance/FirstSignInAgeGateMount.tsx"), "utf8");
const ageStep = readFileSync(join(process.cwd(), "features/onboarding/welcome-steps/WelcomeAgeStep.tsx"), "utf8");
const dialog = readFileSync(join(process.cwd(), "features/education/compliance/components/AgeDeclarationDialog.tsx"), "utf8");

describe("the age question is a welcome step, never a popup on top of one", () => {
  it("the site-wide popup stays off /welcome (deferred, not waived: the step asks, a skip is asked again next session)", () => {
    expect(mount).toMatch(/onWelcome = pathname === "\/welcome"/);
    expect(mount).toContain("if (onPortal || onWelcome) return null");
    expect(mount).toContain("!onWelcome");
  });
  it("the step uses the dialog's own wording/split, has Not now, and records the answer or the skip", () => {
    expect(ageStep).toContain("useAgeDeclarationContent");
    expect(dialog).toMatch(/useAgeDeclarationContent[\s\S]*I&apos;m 18 or older/);
    expect(ageStep).toContain("age-not-now");
    expect(ageStep).toContain("setAgeBand");
    expect((ageStep.match(/markAskedThisSession\(\)/g) ?? []).length).toBe(2);
  });
});
