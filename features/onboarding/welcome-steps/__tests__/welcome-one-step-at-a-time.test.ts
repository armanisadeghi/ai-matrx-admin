/** @jest-environment node */
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Guard: the welcome page renders each step behind its own `step ===` test, so two headings can never stack,
// and the two steps that have a way out say so in words ("Skip" in the door, "Later" on Meet Matrx).
const client = readFileSync(join(process.cwd(), "app/(core)/welcome/WelcomeClient.tsx"), "utf8");
const door = readFileSync(join(process.cwd(), "features/marketing/smart-add/welcome/WelcomeDoor.tsx"), "utf8");

describe("the welcome shows one step at a time", () => {
  it("each step is rendered only on its own step", () => {
    for (const s of ["identity", "meet", "start"]) expect(client).toContain(`step === "${s}"`);
  });
  it("the door no longer renders the page's content beside itself", () => {
    expect(door).not.toMatch(/\{children\}/);
  });
  it("Meet Matrx has Later; progress is saved to the person, never to browser storage", () => {
    expect(client).toContain("meet-later");
    expect(client).not.toMatch(/localStorage|sessionStorage/);
  });
});
