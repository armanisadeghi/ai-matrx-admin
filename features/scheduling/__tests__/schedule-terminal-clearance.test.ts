import fs from "node:fs";
import path from "node:path";

const shellStyles = path.join(process.cwd(), "styles/shell.css");

describe("schedule route terminal clearance", () => {
  it("creates real scroll runway below min-height route children — the page runway, never an alarm reserve", () => {
    const source = fs.readFileSync(shellStyles, "utf8");

    expect(source).toMatch(/\.shell-main::after,[\s\S]*?block-size: var\(--matrx-page-runway\);/);
    // Floating things never move the page (2026-10-20): the alarm reserves nothing.
    expect(source).not.toContain("--shell-fixed-alert-clearance");
  });
});
