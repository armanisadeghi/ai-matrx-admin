/**
 * Doors that hold only a mandate key (Try as candidate; Find Usages through the
 * same MandateSetCandidateDialog) must label the "Everyone" level with the
 * mandate's home organization, like the Candidates tab does.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => undefined;

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({}),
  supabase: { schema: () => ({ rpc: () => Promise.resolve({ data: 3, error: null }) }) },
}));
const homeRows = jest.fn();
jest.mock("@/lib/supabase/mandateStorage", () => ({
  mandateDefinitions: () => ({
    select: () => ({ is: () => ({ eq: () => homeRows() }) }),
  }),
}));
jest.mock("@/features/organizations/hooks", () => ({
  useUserOrganizations: () => ({
    organizations: [{ id: "org-cedar", name: "Cedar Ridge Physical Therapy" }],
    loading: false,
  }),
}));
const stableDispatch = jest.fn();
jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => stableDispatch,
  useAppSelector: (selector: unknown) => {
    const { selectOrganizationId } = jest.requireActual("@/lib/redux/slices/appContextSlice");
    return selector === selectOrganizationId ? "org-1" : "user-1";
  },
}));
jest.mock("@ai-matrx/chat/store/hooks", () => jest.requireMock("@/lib/redux/hooks"));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/features/bindings/HolderAssignment", () => ({ HolderAssignment: () => null }));
jest.mock("@ai-matrx/kit/media-query", () => ({
  ...jest.requireActual("@ai-matrx/kit/media-query"),
  useIsMobile: () => false,
}));
jest.mock("@ai-matrx/chat/mandates/useMandateHolder", () => ({
  useMandateHolder: () => ({
    holder: { provenance: "system", organizationId: null },
    loading: false,
    error: null,
    organizationPending: false,
  }),
}));
jest.mock("@/features/mandates/candidate-dialog/api", () => ({
  COVERED_DOORS: ["chat_start", "run_mandate"],
  candidateFailureSentence: (e: unknown) => String(e),
  fetchLiveCandidates: () =>
    Promise.resolve({ active: null, open: [], history: [], forecast: { doors: {}, eligible_of_recent: [0, 0], window_days: 30 } }),
  setLiveCandidate: jest.fn(),
}));

import { TryAsCandidateButton } from "@/features/mandates/candidate-dialog/TryAsCandidateButton";

jest.setTimeout(60_000);
let container: HTMLDivElement;
let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
  document.body.innerHTML = "";
});
async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  });
}

async function openFromButton(key: string) {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(
      <TryAsCandidateButton
        mandateKey={key as never}
        mandateName="Scope check"
        target={null}
        rung={{ rung: "global", principalId: null }}
      />,
    );
  });
  act(() => {
    container.querySelector<HTMLElement>('[data-testid="try-as-candidate"]')!.click();
  });
  await flush();
}
const trigger = () => document.body.querySelector<HTMLElement>('[aria-label="Applies to"]');

describe("key-only candidate doors name the mandate's home organization", () => {
  it("Try as candidate: a mandate homed in one organization reads 'Everyone in <org>'", async () => {
    homeRows.mockResolvedValue({ data: [{ organization_id: "org-cedar" }], error: null });
    await openFromButton("shortcut.zz_home_org");
    expect(trigger()?.textContent).toMatch(/Everyone in Cedar Ridge Physical Therapy/);
  });

  it("a system-homed mandate still reads 'Everyone'", async () => {
    homeRows.mockResolvedValue({ data: [{ organization_id: "39c38960-d30c-4840-b0c1-c9960de95582" }], error: null });
    await openFromButton("shortcut.zz_system_home");
    expect(trigger()?.textContent).toMatch(/^Everyone/);
    expect(trigger()?.textContent).not.toMatch(/Everyone in/);
  });

  it("Find Usages opens the same home-aware dialog", () => {
    const src = readFileSync("features/agents/components/usages/AgentUsagesEngine.tsx", "utf8");
    expect(src).toMatch(/<MandateSetCandidateDialog/);
    expect(src).not.toMatch(/<SetCandidateDialog/);
  });
});
