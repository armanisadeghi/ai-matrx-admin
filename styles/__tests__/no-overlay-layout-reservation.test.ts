/**
 * THE LAW THIS GUARDS (2026-09-13, re-ruled 2026-10-20): a global fixed notice
 * must not hide the last actionable content — and it never moves the page to
 * avoid it. The notice publishes compact/expanded presence and anchors ITSELF
 * above table navigation; the page keeps only its ordinary trailing runway.
 *
 * Static assertion over the CSS source: jsdom cannot evaluate these stylesheets.
 */
import { readFileSync } from "fs";
import { join } from "path";

/** Strip comments so the explanatory prose above these rules can't match. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

const SHELL_CSS = stripComments(
  readFileSync(join(__dirname, "..", "shell.css"), "utf8"),
);
const BANNER_TSX = stripComments(
  readFileSync(
    join(__dirname, "..", "..", "features/admin/attention/AdminAttentionDock.tsx"),
    "utf8",
  ),
);

describe("global fixed alerts preserve reachable page actions", () => {
  it("reserves nothing for the alarm — it floats, the page never makes room (2026-10-20)", () => {
    expect(SHELL_CSS).not.toContain("--shell-fixed-alert-clearance");
    expect(SHELL_CSS).not.toMatch(/:root\[data-admin-attention(="[a-z]+")?\]\s+\.shell-main\b[^{]*\{/);
    // The floating clearance is the ONLY bottom reserve for the mobile dock, and only as trailing runway.
    expect(SHELL_CSS).not.toContain("[data-show-dock] .shell-main");
    expect(SHELL_CSS).toContain("overflow: clip");
  });

  it("the alarm publishes semantic state, not a measured height", () => {
    expect(BANNER_TSX).toContain("root.dataset.adminAttention");
    expect(BANNER_TSX).not.toContain("ResizeObserver");
    expect(BANNER_TSX).not.toContain("getBoundingClientRect");
  });

  it("the dock and shared toasts have separate bottom slots", () => {
    expect(BANNER_TSX).toContain("useDock(");
    expect(BANNER_TSX).toContain("SNOOZE_CHOICES");
    expect(BANNER_TSX).toContain("DEFAULT_SNOOZE");
  });

  it("anchors the unpositioned dock above canonical table summary totals", () => {
    // Presence comes from the anchors themselves — never a :root:has()
    // that re-checks the page on every DOM insertion (D349).
    expect(SHELL_CSS).not.toMatch(/:root:has\(/);
    expect(SHELL_CSS).toContain('anchor-name: --matrx-table-footer');
    expect(SHELL_CSS).toContain('--admin-attention-anchor-bottom: calc(');
    expect(SHELL_CSS).toContain('var(--matrx-table-control-size, 2rem)');
    expect(SHELL_CSS).toContain('@supports (bottom: anchor-size(--matrx-table-summary-totals height))');
    expect(SHELL_CSS).toContain('tfoot:has([data-matrx-table-summary-totals])');
    expect(SHELL_CSS).toContain('anchor-name: --matrx-table-summary-totals');
    expect(SHELL_CSS).toContain('anchor-size(--matrx-table-footer height, 0px) * 1000');
    expect(SHELL_CSS).toContain(
      'anchor-size(--matrx-table-summary-totals height, 0px)',
    );
    expect(BANNER_TSX).toContain('bottom: "var(--admin-attention-anchor-bottom, 1rem)"');
  });
});
