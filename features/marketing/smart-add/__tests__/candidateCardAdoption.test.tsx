/** @jest-environment jsdom */
/**
 * Smart Add's anchor card is the shared CandidateCard: it renders the candidate, "This is me" / "Not me" write the
 * same answers as before, and Namesake is Other's way-out (a decision the person can still reach).
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AnchorCard } from "../AnchorCards";
import type { EvidenceItem } from "../evidence";

jest.mock("../candidateImage", () => ({ useCandidateImage: () => null }));
jest.mock("@/features/marketing/social/server", () => ({ profileAvatarDoor: (id: string) => `/p/${id}` }));
jest.mock("@/features/marketing/social/components/PlatformMark", () => ({
  PlatformMark: () => <i data-mark="" />,
  platformLabel: (p: string) => (p === "instagram" ? "Instagram" : p),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const item = {
  key: "social:instagram:mara",
  field: "social",
  platform: "instagram",
  handle: "mara.lin",
  value: "https://instagram.com/mara.lin",
  url: "https://instagram.com/mara.lin",
  label: "Mara Lin",
  anchor: { display_name: "Mara Lin", bio_line: "Baker in Austin", location: "Austin", followers: 12400, score: 1, reasons: ["Same city"] },
} as unknown as EvidenceItem;

function render(answer: "me" | "not_me" | "namesake" | null, onAnswer: (a: unknown) => void) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => createRoot(host).render(<ul><AnchorCard item={item} answer={answer} onAnswer={onAnswer} /></ul>));
  return host;
}

describe("AnchorCard on the shared CandidateCard", () => {
  it("shows who it is and the answer state", () => {
    const host = render("me", () => {});
    expect(host.querySelector("[data-candidate-card]")?.getAttribute("data-answer")).toBe("yes");
    expect(host.textContent).toContain("Mara Lin");
    expect(host.textContent).toContain("@mara.lin");
    // The shared card counts in kit's compact voice ("12.4k"; design-system CHANGELOG, formatAudience).
    expect(host.textContent).toContain("12.4k followers");
  });
  it("This is me answers me, and pressing it again clears", () => {
    const calls: unknown[] = [];
    const open = render(null, (a) => calls.push(a));
    act(() => (open.querySelector('[data-decision-option="yes"]') as HTMLElement).click());
    const on = render("me", (a) => calls.push(a));
    act(() => (on.querySelector('[data-decision-option="yes"]') as HTMLElement).click());
    expect(calls).toEqual(["me", null]);
  });
  it("Not me answers not_me", () => {
    const calls: unknown[] = [];
    const host = render(null, (a) => calls.push(a));
    act(() => (host.querySelector('[data-decision-option="no"]') as HTMLElement).click());
    expect(calls).toEqual(["not_me"]);
  });
});
