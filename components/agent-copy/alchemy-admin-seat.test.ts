/**
 * ALCHEMY ON AN ADMIN PAGE WORKS IN THE ADMIN ORGANIZATION (Arman, 2026-10-10).
 *
 * Admin pages make the admin's declared admin organization the active one
 * (lib/organizations/adminOrganization.ts); Alchemy reads the active organization like every other
 * server request, never the platform tenant. With no organization at all it refuses everywhere —
 * there is no admin-only stand-in.
 *
 * Break it names: Alchemy binding the platform tenant on an admin page → red.
 */
jest.mock("@/lib/redux/slices/userSlice", () => ({ selectUserId: (state: { userId?: string }) => state.userId }));
jest.mock("@/lib/redux/slices/appContextSlice", () => ({ selectOrganizationId: (state: { organizationId?: string | null }) => state.organizationId ?? null }));
jest.mock("@/lib/redux/slices/overlaySlice", () => ({ openOverlay: (payload: unknown) => ({ type: "overlay/open", payload }) }));
jest.mock("@/features/tasks/redux/taskUiSlice", () => ({ setPendingSource: (payload: unknown) => ({ type: "task/pending", payload }) }));
jest.mock("@ai-matrx/chat/agents/redux/execution-system/conversation-focus/conversation-focus.slice", () => ({ clearFocus: (payload: unknown) => ({ type: "focus/clear", payload }) }));
jest.mock("@ai-matrx/chat/agents/redux/chat/chat-route.slice", () => ({ bumpFreshSession: () => ({ type: "chat/bump" }) }));
jest.mock("@ai-matrx/chat/agents/components/chat/begin-fresh-chat", () => ({ chatRouteSurfaceKey: (id: string) => `surface:${id}` }));
jest.mock("@ai-matrx/chat/agents/components/chat/chat-quick-actions.config", () => ({ DEFAULT_NEW_CHAT_MANDATE_KEY: "default-mandate" }));
jest.mock("@ai-matrx/chat/mandates/service", () => ({ resolveMandate: jest.fn(async () => ({ agentId: "agent-42" })) }));
jest.mock("@ai-matrx/chat/mandates/resolve-asking", () => ({
  // The destination asks through `resolveMandateAsking`; in a unit test that is the mocked `resolveMandate`, with no organization question.
  resolveMandateAsking: (key: string) => (jest.requireMock("@ai-matrx/chat/mandates/service") as { resolveMandate: (k: string, o?: unknown) => Promise<unknown> }).resolveMandate(key, {}),
}));
jest.mock("@/features/data-tables/export-targets", () => ({ pushMarkdownToDocument: jest.fn(), pushTableToWorkbook: jest.fn() }));

import { SYSTEM_ORGANIZATION_ID } from "@/constants/platform-orgs";
import { createAlchemyDestinationPorts } from "./alchemy-destinations";

const content = {
  label: "AI usage — Cost by Provider, for Person admin@admin.com, last 30 days",
  markdown: '```json\n{"screen":"AI usage"}\n```',
  plainText: '{"screen":"AI usage"}',
  signal: new AbortController().signal,
  draft: { sourceId: "drill-explain:1" },
} as never;

const at = (path: string) => window.history.pushState({}, "", path);

describe("Alchemy on the admin seat", () => {
  afterEach(() => at("/"));

  it("opens an assistant window from an admin page in the admin organization", async () => {
    at("/administration/usage");
    const dispatch = jest.fn();
    const ports = createAlchemyDestinationPorts({ getCurrentState: () => ({ userId: "user-1", organizationId: "admin-org" }) as never, dispatch, navigate: jest.fn() });
    await ports.assistant(content);
    const opened = dispatch.mock.calls.map(([a]) => a).find((a: { type: string }) => a.type === "overlay/open");
    expect(opened?.payload).toEqual(expect.objectContaining({ overlayId: "agentRunWindow", data: expect.objectContaining({ initialAutoRun: false }) }));
  });

  it("refuses on an admin page with no organization — no platform-tenant stand-in", async () => {
    at("/administration/usage");
    const ports = createAlchemyDestinationPorts({ getCurrentState: () => ({ userId: "user-1", organizationId: null }) as never, dispatch: jest.fn(), navigate: jest.fn() });
    await expect(ports.assistant(content)).rejects.toThrow(/select an organization/i);
  });

  it("the host's organization is the active one on admin and user pages, never the platform tenant", async () => {
    const { alchemyOrganizationId } = await import("./alchemy-organization");
    at("/administration/usage");
    expect(alchemyOrganizationId({ organizationId: "admin-org" } as never)).toBe("admin-org");
    expect(alchemyOrganizationId({ organizationId: null } as never)).not.toBe(SYSTEM_ORGANIZATION_ID);
    at("/notes");
    expect(alchemyOrganizationId({ organizationId: "org-1" } as never)).toBe("org-1");
  });
});
