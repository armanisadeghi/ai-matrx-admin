/**
 * AN EMPTY DESIGN COVER TELLS THE TRUTH (live 2026-10-22): the cover read "The design agent is building this
 * system…" forever, even after the agent had stopped without writing a thing. It says "building" only while the
 * design job runs in the side chat beside the board; otherwise it says the board is not built yet and offers the
 * job again (`startDesignBuild`). SUT: the real cover body + the real `useDesignBuildRunning`; the chat's host,
 * store and job starter are doubles.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const BUILD = "design_system.build";
let state: { conversations: { byConversationId: Record<string, { mandateKey?: string; status?: string }> } };
let activeConversationId: string | null = null;
const startShellChatJob = jest.fn(() => true);

jest.mock("@ai-matrx/agents/mandates", () => ({ MANDATE_KEYS: { design_system__build: "design_system.build" } }));
jest.mock("@ai-matrx/chat/agents/components/chat/in-place-chat-host", () => ({
  useInPlaceChatHost: () => ({ activeConversationId }),
}));
jest.mock("@ai-matrx/chat/canvas/workspace/shell-chat-page-context", () => ({
  startShellChatJob: (...a: unknown[]) => startShellChatJob(...(a as [])),
}));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: (sel: (s: unknown) => unknown) => sel(state) }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("../items/board-token-tables", () => ({ useBoardTokenTables: () => [{ id: "t-colors" }] }));
jest.mock("../tiles/MarkdownTileBody", () => ({ MarkdownTileBody: () => null }));
jest.mock("@ai-matrx/records-ui/html-frame", () => ({
  HtmlSampleFrame: () => null,
  TokenScope: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/components/official/ProTextarea", () => ({ ProTextarea: () => null }));

import { COVER_ITEMS, coverSource } from "../items/cover-items";

describe("an empty design cover", () => {
  let host: HTMLDivElement;
  let root: Root;
  const render = () => {
    const Body = COVER_ITEMS[0].Body!;
    act(() =>
      root.render(
        <Body tileId="cover-1" source={coverSource({ hero: "", markdown: "" })} title="Design system" tier="read" interacting={false} onSource={() => {}} />,
      ),
    );
  };
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    activeConversationId = "c-1";
    startShellChatJob.mockClear();
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("says building only while the design job runs in the side chat", () => {
    state = { conversations: { byConversationId: { "c-1": { mandateKey: BUILD, status: "streaming" } } } };
    render();
    expect(host.textContent).toContain("The design agent is building this system");
    expect(host.querySelector("button")).toBeNull();
  });

  it("after the run stopped with nothing written: Not built yet, and Build it starts the job again", () => {
    state = { conversations: { byConversationId: { "c-1": { mandateKey: BUILD, status: "complete" } } } };
    render();
    expect(host.textContent).not.toContain("building");
    expect(host.textContent).toContain("Not built yet");
    const build = [...host.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Build it")!;
    act(() => build.click());
    expect(startShellChatJob).toHaveBeenCalledWith(BUILD, { run: true });
  });

  it("another agent running in the side chat is not the design job", () => {
    state = { conversations: { byConversationId: { "c-1": { mandateKey: "data.table_chat", status: "running" } } } };
    render();
    expect(host.textContent).toContain("Not built yet");
  });
});
