// A conversation's label comes from WHO STARTED IT, never from conversation_type alone.
// 2026-10-16: every `standard` row read "Chat" (3,161 API runs, 514 client-auto runs and
// 70 system runs in 30 days), and a server-side mandate run read "Automatic run" even when
// a workflow or a schedule started it. Only a person's own conversation is a "Chat".
import { conversationTypeLabel } from "@/features/ai-work/conversations/presentation";

describe("conversation kind label", () => {
  it("calls only a person's conversation a Chat", () => {
    expect(conversationTypeLabel("standard", "human")).toBe("Chat");
    expect(conversationTypeLabel("standard", "delegated_member")).toBe("Chat");
    for (const origin of ["api", "client_auto", "system", "unknown", null, "workflow", "scheduled", "child_agent"]) {
      expect(conversationTypeLabel("standard", origin)).not.toBe("Chat");
    }
  });

  it("names the real starter of a machine run", () => {
    expect(conversationTypeLabel("standard", "api")).toBe("API run");
    expect(conversationTypeLabel("standard", "client_auto")).toBe("App run");
    expect(conversationTypeLabel("auto", "workflow")).toBe("Workflow run");
    expect(conversationTypeLabel("auto", "scheduled")).toBe("Scheduled run");
    expect(conversationTypeLabel("auto", "system")).toBe("Automatic run");
    expect(conversationTypeLabel("subagent", "child_agent")).toBe("Subagent run");
  });

  it("a type-only label (facet values) never claims Chat", () => {
    expect(conversationTypeLabel("standard")).not.toBe("Chat");
    expect(conversationTypeLabel("workflow")).toBe("Workflow run");
  });
});
