/**
 * A variable link written by the chat package (`agentVariableHref`, @ai-matrx/chat) opens the app's
 * variable editor: the `?panels=` token chat writes goes through the app's registered
 * `agent_variable` hydrator and opens `agentVariableEditorWindow` with that agent and variable.
 * Before aidream f0f852c6ce (chat 0.8.314) chat wrote `agent_variable:<agentId>|<var>`, which the
 * hydrator refused, so every such link opened nothing.
 *
 * The href is read exactly as the app reads a landing URL (summon `readPanelsParam`, which
 * URL-decodes the query once). KNOWN DEFECT (package lane): chat's `agentVariableHref` puts the token
 * in the query without `encodeURIComponent`, so the grammar's `%5F` for "_" is decoded to "_" before
 * the token parser splits args on it: `brand_voice` arrives as `brand`. The `it.failing` case turns
 * red the day chat encodes the token; then make it a plain case.
 */
import type { UnknownAction } from "@reduxjs/toolkit";
import { readPanelsParam } from "@ai-matrx/summon/url";
import { linkHydrator, parsePanels, registerAppLinks } from "@/features/overlays/definitions/__tests__/linkKit";

// chat's package.json exports map does not list this module (package lane), so the type checker cannot
// resolve it by name; jest's @ai-matrx mapper loads the shipped file.
const { agentVariableHref } = jest.requireActual<{ agentVariableHref: (agentId: string, variable: string) => string }>(
  "@ai-matrx/chat/agents/components/run/agentVariableHref",
);

const AGENT_ID = "6b1f3c2a-9d4e-4f8a-b1c2-3d4e5f6a7b8c";

describe("a chat variable link opens the variable editor", () => {
  beforeAll(() => registerAppLinks());

  async function opened(variable: string) {
    const href = agentVariableHref(AGENT_ID, variable);
    expect(href.startsWith(`/agents/${AGENT_ID}/build?`)).toBe(true);
    const [token] = parsePanels(readPanelsParam(href) ?? "");
    expect(token?.typeKey).toBe("agent_variable");

    const hydrate = linkHydrator(token!.typeKey);
    expect(hydrate).toBeDefined();
    const seen: UnknownAction[] = [];
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    await hydrate!((action: UnknownAction) => void seen.push(action), token!.instanceId, token!.args);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();

    const open = seen.find((a) => a.type === "overlays/openOverlay") as
      | { payload: { overlayId: string; data: { agentId: string; variableName: string } } }
      | undefined;
    expect(open?.payload.overlayId).toBe("agentVariableEditorWindow");
    expect(open?.payload.data).toMatchObject({ agentId: AGENT_ID, variableName: variable });
  }

  it.each(["topic", "brand voice", "voice|tone"])("variable %p", opened);

  it.failing("snake_case variable (chat agentVariableHref leaves the token un-encoded)", () => opened("brand_voice"));
});
