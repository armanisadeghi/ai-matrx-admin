// features/applets/embed/__tests__/a-published-page-runs-the-applet-live.test.tsx — lane ROOF (2026-10-22).
//
// THE USE CASE. A published Site (`/site/<slug>`) holding an `applet` block used to draw a static card "until G1 guest
// data ships". Guest data shipped: every reader now gets the LIVE Applet. A reader with no account runs it on the
// guest lane (`AppletHostMount visitor`, the same lane as `/applets/<slug>`: her saves are her own records); a signed-in
// reader runs it as herself; an Applet not on the web never runs on a Site (the reader who can read it sees the
// Publish line); an Applet a stranger cannot read takes no room.
//
// BREAKS THIS CATCHES: a Site that mounts the host on the member lane for a stranger (her save is refused) · a host
// built before the session is known (it would be rebuilt, killing a running job) · a Site that runs an Applet that is
// not on the web · "This Applet has not been shared with you" printed on somebody's public page.

// The repo has no @testing-library/react (test-utils/renderHook.tsx): a plain root under act.
import { act } from "react";
import { createRoot } from "react-dom/client";

async function render(ui: React.ReactElement): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(ui);
  });
  for (let i = 0; i < 5; i++) await act(async () => { await Promise.resolve(); });
  return container;
}
const host = (c: HTMLElement) => c.querySelector('[data-testid="host"]');

const mockHostProps: Array<{ visitor?: boolean; embedded?: boolean }> = [];
let mockCards = new Map<string, { id: string; name: string; slug: string; description: null; createdBy: null; onTheWeb: boolean }>();
let mockAuth = { authReady: true, hasAccount: false };

jest.mock("@/features/applets-host/AppletHostMount", () => ({
  AppletHostMount: (props: { visitor?: boolean; embedded?: boolean }) => {
    mockHostProps.push(props);
    return <div data-testid="host" data-visitor={String(Boolean(props.visitor))} />;
  },
}));
jest.mock("../appletsPort", () => ({
  readAppletCards: async () => mockCards,
  appletManageHref: (id: string) => `/applets/manage/${id}`,
}));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: (sel: (s: unknown) => unknown) => sel(null) }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({
  selectAuthReady: () => mockAuth.authReady,
  selectHasAccount: () => mockAuth.hasAccount,
}));
jest.mock("@ai-matrx/kit/outbound-react", () => ({ OutboundLink: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

import AppletInPage from "../AppletInPage";

const card = (onTheWeb: boolean) => new Map([["a1", { id: "a1", name: "Post Approvals", slug: "post-approvals", description: null, createdBy: null, onTheWeb }]]);

beforeEach(() => {
  mockHostProps.length = 0;
  mockAuth = { authReady: true, hasAccount: false };
});

it("a stranger on a Site runs the live Applet on the guest lane", async () => {
  mockCards = card(true);
  const c = await render(<AppletInPage appId="a1" site />);
  expect(host(c)?.getAttribute("data-visitor")).toBe("true");
  expect(mockHostProps.length > 0 && mockHostProps.every((p) => p.visitor === true && p.embedded === true)).toBe(true);
});

it("a signed-in reader on a Site runs it as herself", async () => {
  mockCards = card(true);
  mockAuth = { authReady: true, hasAccount: true };
  const c = await render(<AppletInPage appId="a1" site />);
  expect(host(c)?.getAttribute("data-visitor")).toBe("false");
});

it("waits for the session before building the host on a Site", async () => {
  mockCards = card(true);
  mockAuth = { authReady: false, hasAccount: false };
  const c = await render(<AppletInPage appId="a1" site />);
  expect(c.querySelector('[data-state="reading"]')).toBeTruthy();
  expect(mockHostProps).toHaveLength(0);
});

it("never runs an Applet that is not on the web on a Site", async () => {
  mockCards = card(false);
  const c = await render(<AppletInPage appId="a1" site />);
  expect(c.textContent).toContain("Visitors cannot see Post Approvals.");
  expect(mockHostProps).toHaveLength(0);
});

it("an Applet a stranger cannot read takes no room on a Site", async () => {
  mockCards = new Map();
  const c = await render(<AppletInPage appId="a1" site />);
  expect(c.querySelector('[data-state="absent"]')).toBeTruthy();
  expect(c.textContent).not.toMatch(/not been shared/);
});

it("in the app (no site) the refusal is still said", async () => {
  mockCards = new Map();
  const c = await render(<AppletInPage appId="a1" />);
  expect(c.textContent).toContain("This Applet has not been shared with you.");
});
