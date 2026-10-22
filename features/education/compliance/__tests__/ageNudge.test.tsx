/** @jest-environment jsdom */
/**
 * Feedback 6818af69 (2026-10-21): a new account got the age question as a modal on every page. The site-wide
 * first-sign-in prompt is a floating card now: no dialog role, no overlay, "Not now" closes it.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AgeDeclarationNudge } from "../components/AgeDeclarationDialog";

jest.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
// The site-wide mount, for real: only its data edges are stand-ins (the person, the engaged-late signal, the gate read).
const mockUndeclared = { aiAllowed: true, reason: "age_undeclared", ageBand: null, isAnonymous: false };
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => jest.fn(), useAppSelector: () => ({ id: "u1" }) }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUser: () => ({ id: "u1" }) }));
jest.mock("@/lib/boot/engagedLate", () => ({ useEngagedLateReady: () => true }));
jest.mock("@/lib/redux/slices/storeReadsSlice", () => ({ setStoreReadData: () => ({ type: "noop" }) }));
jest.mock("@/lib/redux/store-reads/useStoreRead", () => ({
  useStoreRead: () => ({ data: mockUndeclared, hasData: true, isError: false, refresh: jest.fn() }),
}));
jest.mock("../coppaService", () => ({
  coppaService: { signupAgeBand: async () => null, setAgeBand: jest.fn(), getGate: jest.fn(), isSignedIn: async () => true },
}));
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
  it("the site-wide mount renders the floating nudge for an undeclared signed-in account, never a dialog", async () => {
    sessionStorage.clear();
    const { FirstSignInAgeGateMount } = await import("../FirstSignInAgeGateMount");
    const host = document.createElement("div");
    document.body.appendChild(host);
    await act(async () => {
      createRoot(host).render(<FirstSignInAgeGateMount />);
    });
    await act(async () => undefined);
    expect(document.querySelector('[data-testid="age-nudge"]')).not.toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
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
