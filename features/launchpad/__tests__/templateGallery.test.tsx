// The New launchpad gallery lists the person's saved templates and their organizations' beside the role
// templates (audit #5), and offers "Everyone in the organization" only to an owner or admin.
import { act } from "react";
import { createRoot } from "react-dom/client";

const ME = "87a6e699-3622-4869-8843-d0867456c0dd";
const save = jest.fn(async () => ({ ok: true as const }));
const state = { isAdmin: false };
const parsedEmpty = { ok: true as const, doc: { schemaVersion: 1 as const, widgets: [] } };
const entry = (key: string, title: string, owner: string) => ({
  key, title, owner, recordId: key, organizationId: "org-a", savedAt: null, note: null, parsed: parsedEmpty,
});

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href }: { children: unknown; href: string }) => <a href={href}>{children as never}</a> }));
jest.mock("../components/LaunchpadsMount", () => ({ LaunchpadsMount: ({ children }: { children: unknown }) => children }));
jest.mock("@/features/organizations/hooks", () => ({ useUserRole: () => ({ isAdmin: state.isAdmin }) }));
jest.mock("@/components/dialogs/confirm/ConfirmDialogHost", () => ({ confirm: async () => true }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() } }));
jest.mock("../useLaunchpads", () => ({
  useLaunchpads: () => ({
    loading: false,
    userId: ME,
    activeOrganizationId: "org-a",
    entries: [entry("start", "Start", `person:${ME}`)],
    templates: [entry("sales-desk", "Sales desk", `template:person:${ME}`), entry("onboard", "Onboarding", "template:org")],
    save,
    archive: jest.fn(async () => ({ ok: true })),
  }),
}));

import { YourLaunchpads } from "../components/YourLaunchpads";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function open() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => createRoot(host).render(<YourLaunchpads />));
  const button = [...host.querySelectorAll("button")].find((b) => b.textContent?.includes("New launchpad"))!;
  act(() => button.click());
  return document.body;
}

afterEach(() => {
  document.body.innerHTML = "";
  save.mockClear();
});

it("lists saved templates beside the role templates", () => {
  const body = open();
  const groups = [...body.querySelectorAll("[data-template-group]")].map((g) => g.getAttribute("data-template-group"));
  expect(groups).toEqual(["Start from", "Your templates", "Your organization's templates"]);
  expect(body.textContent).toContain("Sales desk");
  expect(body.textContent).toContain("Onboarding");
  expect(body.textContent).toContain("Founder");
  expect(body.textContent).not.toContain("Everyone in the organization");
});

it("starting from a saved template copies its layout into the person's own launchpad", async () => {
  const body = open();
  const pick = [...body.querySelectorAll("button")].find((b) => b.textContent?.includes("Sales desk"))!;
  await act(async () => pick.click());
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ key: "sales-desk", owner: `person:${ME}` }), expect.any(String));
});

it("an owner or admin can make the new launchpad the organization's", async () => {
  state.isAdmin = true;
  const body = open();
  const everyone = [...body.querySelectorAll("button")].find((b) => b.textContent === "Everyone in the organization")!;
  await act(async () => everyone.click());
  const founder = [...body.querySelectorAll("button")].find((b) => b.textContent?.includes("Founder"))!;
  await act(async () => founder.click());
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ key: "founder", owner: "org" }), expect.any(String));
  state.isAdmin = false;
});
