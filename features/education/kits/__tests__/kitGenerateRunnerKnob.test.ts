import { readFileSync } from "node:fs";
import { join } from "node:path";

// The chat's Apply starts the run at once, usually before the per-run card limit knob has loaded.
// The hook (`useMaxCardsPerRun`) is "loading" on its first render, so a run that read the hook refused
// every first request ("still loading, ask again"). The runner must AWAIT the knob instead.
const source = readFileSync(join(__dirname, "../components/KitGenerateRunner.tsx"), "utf8");

describe("KitGenerateRun and the card-limit knob", () => {
  it("awaits the knob read instead of refusing while a hook is still loading", () => {
    // The module path is still `useMaxCardsPerRun` (it exports both the hook and `readMaxCardsPerRun`), so the
    // break is a CALL of the hook, never the import path — the bare-name regex shipped red on its first run (0d435ed9a6).
    expect(source).not.toMatch(/\buseMaxCardsPerRun\s*\(/);
    expect(source).not.toMatch(/still loading/);
    expect(source).toMatch(/await readMaxCardsPerRun\(\)/);
  });
  it("shows progress and the outcome in a card on the kit page, not only a toast", () => {
    expect(source).toMatch(/data-kit-run-card/);
    expect(source).not.toMatch(/toast\.loading|toast\.success/);
  });
});
