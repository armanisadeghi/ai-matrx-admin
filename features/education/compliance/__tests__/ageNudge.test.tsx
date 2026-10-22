/** @jest-environment jsdom */
/**
 * Feedback 6818af69 (2026-10-21): a new account got the age question as a modal on every page. The site-wide
 * first-sign-in prompt is a floating card now: no dialog role, no overlay, "Not now" closes it.
 */
import fs from "node:fs";
import path from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AgeDeclarationNudge } from "../components/AgeDeclarationDialog";

jest.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
jest.mock("next/link", () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("the age nudge", () => {
  it("floats without a dialog or overlay, and Not now closes it", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const onOpenChange = jest.fn();
    act(() => createRoot(host).render(<AgeDeclarationNudge open onOpenChange={onOpenChange} onPick={jest.fn()} saving={null} />));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector("[data-radix-portal],[data-state=open][data-aria-hidden]")).toBeNull();
    const card = document.querySelector('[data-testid="age-nudge"]') as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.textContent).toContain("18 or older");
    act(() => (document.querySelector('[data-testid="age-nudge-not-now"]') as HTMLButtonElement).click());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
  it("renders nothing when closed", () => {
    const host = document.createElement("div");
    act(() => createRoot(host).render(<AgeDeclarationNudge open={false} onOpenChange={jest.fn()} onPick={jest.fn()} saving={null} />));
    expect(host.innerHTML).toBe("");
  });
  it("the site-wide mount asks as a nudge, never the modal", () => {
    const mount = fs.readFileSync(path.join(__dirname, "..", "FirstSignInAgeGateMount.tsx"), "utf8");
    expect(mount).toContain('declarationPresentation: "nudge"');
  });
});

describe("the age choices (sign-up welcome final review D6, 2026-10-21)", () => {
  it("are the ONE UI system's controls: no accent hover that hides the under-18 label", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    act(() => createRoot(host).render(<AgeDeclarationNudge open onOpenChange={jest.fn()} onPick={jest.fn()} saving={null} />));
    const under = [...host.querySelectorAll("button")].find((b) => b.textContent?.includes("under 18")) as HTMLButtonElement;
    expect(under).toBeTruthy();
    expect(under.className).not.toMatch(/hover:text-accent-foreground|hover:bg-accent\b/);
    // Choosing it still opens the finer split.
    act(() => under.click());
    expect(host.textContent).toContain("Back");
  });
});
