/**
 * THE GMAIL CHIP CONNECTS GMAIL (Arman, 2026-10-20: "even the most basic
 * things, like connecting my gmail, aren't working").
 *
 * The chat's connector strip opened the Google connect WINDOW for Gmail — a
 * window that grants Docs and Sheets only (`drive.file`), so the chip could
 * connect, report success, and still not have Gmail. It now opens the Google
 * consent with the Gmail product switched on.
 *
 * Mutation: open the connect window again (`useOpenGoogleConnectWindow`) and
 * this goes RED.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockOpenFirstParty = jest.fn().mockResolvedValue(true);
const mockOpenConnectWindow = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => jest.fn(), useAppSelector: () => null }));
jest.mock("@/features/marketing/google/hooks", () => ({
  useGoogleConnectionInventory: () => ({ data: { connections: [] }, isLoading: false }),
}));
jest.mock("../useOpenFirstPartyConnect", () => ({ useOpenFirstPartyConnect: () => mockOpenFirstParty }));
jest.mock("@/features/overlays/definitions/googleConnectWindow.overlay", () => ({
  useOpenGoogleConnectWindow: () => mockOpenConnectWindow,
}));
jest.mock("@ai-matrx/chat/agents/hooks/useMcpTools", () => ({
  useMcpCatalog: () => ({ catalog: [], serverStates: [], status: "succeeded", firstPartyLoading: false }),
}));
jest.mock("@ai-matrx/chat/agents/redux/mcp/mcp.slice", () => ({
  connectServer: jest.fn(),
  fetchCatalog: jest.fn(),
  selectMcpCatalogError: () => null,
}));
jest.mock("@ai-matrx/chat/agents/services/mcp-oauth/popup", () => ({ startMcpOAuthPopup: jest.fn() }));
jest.mock("@/features/github-integration/service", () => ({ githubConnectUrl: jest.fn() }));
jest.mock("@/features/organizations/awaitWorkspace", () => ({ awaitEffectiveOrganizationId: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { useLiveConnectors } from "../useLiveConnectors";

type Controller = ReturnType<typeof useLiveConnectors>;
const seen: { latest: Controller | null } = { latest: null };
function Harness({ onValue }: { onValue: (value: Controller) => void }) {
  onValue(useLiveConnectors());
  return null;
}
const controller = () => {
  if (!seen.latest) throw new Error("the harness has not rendered");
  return seen.latest;
};
let root: Root;
beforeEach(async () => {
  jest.clearAllMocks();
  root = createRoot(document.createElement("div"));
  await act(async () =>
    root.render(
      <Harness
        onValue={(value) => {
          seen.latest = value;
        }}
      />,
    ),
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
});

it("Gmail opens Google's consent with the Gmail product on, never the Docs-and-Sheets window", async () => {
  await act(async () => controller().connect("gmail"));
  expect(mockOpenFirstParty).toHaveBeenCalledWith("google", { productKey: "gmail" });
  expect(mockOpenConnectWindow).not.toHaveBeenCalled();
});

it("Google (Docs and Sheets) opens the consent with that product on", async () => {
  await act(async () => controller().connect("google-workspace"));
  expect(mockOpenFirstParty).toHaveBeenCalledWith("google", { productKey: "workspace_files" });
});
