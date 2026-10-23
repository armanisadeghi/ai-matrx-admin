/**
 * @jest-environment jsdom
 *
 * ONE FALLBACK HEADER AT A TIME (crumb doors wave 8, 2026-10-22). Every (core) module layout draws the
 * derived trail as a fallback (`<DerivedCrumbTrailHeader fallback />`). A page may draw its OWN fallback
 * too — the pick list's Table view mounts the table page, whose header is a fallback until records-ui
 * hands it the table's actions — and both used to draw side by side in the header. The layout's trail is
 * the most generic header there is, so it steps aside for any other fallback; two derived trails name the
 * same address, so only one draws.
 *
 * Pins the DOM contract the shell's stylesheets act on (the rules are read from the real CSS files and
 * evaluated here), and the JS half (`useYieldedFallback("derived")` holds nothing once it is hidden).
 *
 * RED before: the derived trail's portal carried no tier, no rule hid it beside another fallback, and
 * `useYieldedFallback` yielded only to a page header.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import path from "node:path";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* eslint-disable @typescript-eslint/no-require-imports */
const PageHeader = (require("@/features/shell/components/header/PageHeader") as typeof import("@/features/shell/components/header/PageHeader")).default;
const { useYieldedFallback } = require("@/features/shell/components/header/useYieldedFallback") as typeof import("@/features/shell/components/header/useYieldedFallback");
/* eslint-enable @typescript-eslint/no-require-imports */

type Tier = boolean | "derived";

/** Every `display: none` rule in the shell's stylesheets that reads the header portals' attributes. */
function hidingSelectors(): string[] {
  const files = ["styles/shell.css", "features/shell/frame-host/legacy-contracts.css"];
  const out: string[] = [];
  for (const file of files) {
    const css = readFileSync(path.join(process.cwd(), file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/display:\s*none/.test(m[2])) continue;
      for (const sel of m[1].split(",").map((s) => s.trim())) {
        if (/data-page-header-(portal|fallback)/.test(sel) && !sel.includes("ghost")) out.push(sel);
      }
    }
  }
  return out;
}

function Probe({ tier, name }: { tier: Tier; name: string }) {
  const yielded = useYieldedFallback(tier);
  return <span data-probe={name}>{yielded ? "yielded" : "draws"}</span>;
}

let root: Root;
let app: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<header><div class="shell-header-center" id="shell-header-center"></div></header><main id="app"></main>';
  app = document.getElementById("app")!;
  root = createRoot(app);
});
afterEach(async () => {
  await act(async () => root.unmount());
});

async function mount(headers: Array<{ tier: Tier; name: string }>) {
  await act(async () => {
    root.render(
      <>
        {headers.map((h) => (
          <PageHeader key={h.name} fallback={h.tier}>
            <span data-header={h.name}>{h.name}</span>
          </PageHeader>
        ))}
        {headers.map((h) => (
          <Probe key={`p-${h.name}`} tier={h.tier} name={h.name} />
        ))}
      </>,
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
}

/** Headers in the slot that no stylesheet rule hides. */
function drawn(): string[] {
  const hidden = new Set<Element>();
  for (const sel of hidingSelectors()) {
    let matches: NodeListOf<Element>;
    try {
      matches = document.querySelectorAll(sel);
    } catch {
      continue;
    }
    matches.forEach((el) => hidden.add(el));
  }
  const center = document.getElementById("shell-header-center")!;
  return Array.from(center.querySelectorAll(":scope > [data-page-header-portal]"))
    .filter((el) => !hidden.has(el))
    .map((el) => el.querySelector("[data-header]")?.getAttribute("data-header") ?? "?");
}
const probe = (name: string) => document.querySelector(`[data-probe="${name}"]`)!.textContent;

it("the layout's derived trail steps aside for the table page's own fallback (pick list, Table view)", async () => {
  await mount([
    { tier: "derived", name: "layout-trail" },
    { tier: true, name: "table-fallback" },
  ]);
  expect(drawn()).toEqual(["table-fallback"]);
  expect(probe("layout-trail")).toBe("yielded");
  expect(probe("table-fallback")).toBe("draws");
});

it("the page's own header outranks both fallbacks", async () => {
  await mount([
    { tier: "derived", name: "layout-trail" },
    { tier: true, name: "table-fallback" },
    { tier: false, name: "table-header" },
  ]);
  expect(drawn()).toEqual(["table-header"]);
  expect(probe("layout-trail")).toBe("yielded");
  expect(probe("table-fallback")).toBe("yielded");
});

it("alone, the layout's trail draws", async () => {
  await mount([{ tier: "derived", name: "layout-trail" }]);
  expect(drawn()).toEqual(["layout-trail"]);
  expect(probe("layout-trail")).toBe("draws");
});

it("two derived trails (a nested layout's and the module's) draw once", async () => {
  await mount([
    { tier: "derived", name: "module-trail" },
    { tier: "derived", name: "nested-trail" },
  ]);
  expect(drawn()).toHaveLength(1);
});
