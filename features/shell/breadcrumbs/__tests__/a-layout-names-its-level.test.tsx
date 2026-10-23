/**
 * A LAYOUT NAMES ITS LEVEL (2026-10-22). On a deep brand page (/marketing/brands/1-omaha-movers-2/
 * socials/…) whose own header derives its trail from the address, the brand crumb read
 * "1 Omaha Movers 2" — the brand's KEY, humanized — instead of "Omaha Movers". The brand layout now
 * declares its level (`useDeclareTrailLevel`) and every derived trail on the page names it by the
 * record and opens the other brands.
 *
 * RED before the fix: the "declared" case drew the humanized key (no trail-levels store existed).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Crumb } from "@/features/shell/components/header/templates/CrumbTrailHeader";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("next/navigation", () => ({
  usePathname: () => "/marketing/brands/1-omaha-movers-2/socials",
}));
jest.mock("@ai-matrx/associations/react", () => ({
  useEntityTitles: () => ({ titleFor: () => null, isUnresolved: () => true }),
}));

import { useDerivedTrail } from "../useDerivedTrail";
import { useDeclareTrailLevel } from "../trailLevels";

/** The trail, written where the test reads it (a component never reassigns test state). */
function Trail() {
  const trail = useDerivedTrail();
  return <output data-trail={JSON.stringify(trail.map(({ label, at, options }) => ({ label, at, options })))} />;
}
const seenTrail = (): Crumb[] => JSON.parse(host.querySelector("output")?.getAttribute("data-trail") ?? "[]");
function BrandLayout({ children }: { children?: React.ReactNode }) {
  useDeclareTrailLevel("/marketing/brands/1-omaha-movers-2", {
    label: "Omaha Movers",
    token: "web_brand",
    options: [
      { label: "Omaha Movers", href: "/marketing/brands/1-omaha-movers-2/socials", active: true },
      { label: "Vasaro", href: "/marketing/brands/vasaro/socials" },
    ],
    optionsLabel: "Brands",
  });
  return <>{children}</>;
}

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const brandCrumb = () => seenTrail().find((c) => c.at === "/marketing/brands/1-omaha-movers-2");

it("without a declaration the address names the brand by its key (the defect's shape)", () => {
  act(() => root.render(<Trail />));
  expect(brandCrumb()?.label).toBe("1 Omaha Movers 2");
});

it("the brand layout's declared level names the brand and opens the other brands", () => {
  act(() =>
    root.render(
      <BrandLayout>
        <Trail />
      </BrandLayout>,
    ),
  );
  expect(brandCrumb()?.label).toBe("Omaha Movers");
  expect(brandCrumb()?.options?.map((o) => o.label)).toEqual(["Omaha Movers", "Vasaro"]);
  expect(seenTrail().some((c) => c.label === "1 Omaha Movers 2")).toBe(false);
});

it("the declaration ends with the layout", () => {
  act(() => root.render(<BrandLayout><Trail /></BrandLayout>));
  act(() => root.render(<Trail />));
  expect(brandCrumb()?.label).toBe("1 Omaha Movers 2");
});
