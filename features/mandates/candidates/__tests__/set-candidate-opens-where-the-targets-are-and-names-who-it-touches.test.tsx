/**
 * Set-candidate dialog (verifier, 2026-10-10):
 *  - "Choose an agent" opened on System ("No system agents found") and hid the
 *    person's own agents behind Mine;
 *  - "Applies to: Everyone · live" on a shortcut that lives in one
 *    organization overstated who the candidate touches.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom lacks these; the real picker (Radix Select) calls them when it opens.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => undefined;

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: () => ({ rpc: () => Promise.resolve({ data: 3, error: null }) }),
  },
}));
const stableDispatch = jest.fn();
let activeOrg: string | null = null;
jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => stableDispatch,
  useAppSelector: (selector: unknown) => {
    const { selectOrganizationId } = jest.requireActual("@/lib/redux/slices/appContextSlice");
    return selector === selectOrganizationId ? activeOrg : "user-1";
  },
}));
jest.mock("@ai-matrx/chat/store/hooks", () => jest.requireMock("@/lib/redux/hooks"));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
const holderAssignmentProps = jest.fn();
jest.mock("@/features/bindings/HolderAssignment", () => ({
  HolderAssignment: (props: unknown) => {
    holderAssignmentProps(props);
    return null;
  },
}));
jest.mock("@ai-matrx/kit/media-query", () => ({
  ...jest.requireActual("@ai-matrx/kit/media-query"),
  useIsMobile: () => false,
}));
const mandateHolder = jest.fn();
jest.mock("@ai-matrx/chat/mandates/useMandateHolder", () => ({ useMandateHolder: () => mandateHolder() }));
const setLiveCandidate = jest.fn();
jest.mock("@/features/mandates/candidate-dialog/api", () => ({
  COVERED_DOORS: ["chat_start", "run_mandate"],
  candidateFailureSentence: (e: unknown) => String(e),
  fetchLiveCandidates: () =>
    Promise.resolve({
      active: null,
      open: [],
      history: [],
      forecast: { doors: {}, eligible_of_recent: [0, 0], window_days: 30 },
    }),
  setLiveCandidate: (...a: unknown[]) => setLiveCandidate(...a),
}));

import { SetCandidateDialog } from "@/features/mandates/candidate-dialog/SetCandidateDialog";

jest.setTimeout(60_000);

let container: HTMLDivElement;
let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
  document.body.innerHTML = "";
  jest.clearAllMocks();
  activeOrg = null;
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });
}

async function mountDialog(homeName: string | null) {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(
      <SetCandidateDialog
        mandateKey={"shortcut.zz_scope_check" as never}
        mandateName="Scope check"
        rung={{ rung: "user", principalId: "user-1" }}
        followLiveRung
        homeName={homeName}
        onClose={() => undefined}
      />,
    );
  });
  await flush();
}

const trigger = () => document.body.querySelector<HTMLElement>('[aria-label="Applies to"]')!;
const collects = () => document.body.querySelector<HTMLElement>("[data-candidate-rung-collects]")!;

describe("Set candidate — the picker opens where the targets are, the level says who it touches", () => {
  beforeEach(() => {
    activeOrg = "org-1";
    mandateHolder.mockReturnValue({
      holder: { provenance: "system", organizationId: null },
      loading: false,
      error: null,
      organizationPending: false,
    });
  });

  it("the agent picker never forces the System tab (it was empty while Mine had the person's agents)", async () => {
    await mountDialog("Cedar Ridge Physical Therapy");
    const props = holderAssignmentProps.mock.calls.at(-1)?.[0] as { agentTabs?: { initialTab?: string; visibleTabs?: string[] } };
    expect(props.agentTabs?.initialTab).not.toBe("system");
    expect(props.agentTabs?.visibleTabs?.[0]).toBe("mine");
  });

  it("a mandate homed in one organization never reads 'Everyone' alone", async () => {
    await mountDialog("Cedar Ridge Physical Therapy");
    expect(trigger().textContent).toMatch(/Everyone in Cedar Ridge Physical Therapy/);
    expect(collects().textContent).toMatch(/Cedar Ridge Physical Therapy/);
  });

  it("a system-homed mandate still reads Everyone", async () => {
    await mountDialog(null);
    expect(trigger().textContent).toMatch(/^Everyone/);
    expect(trigger().textContent).not.toMatch(/Everyone in/);
  });
});
