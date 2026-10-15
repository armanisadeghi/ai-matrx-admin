import { transcriptPaneState } from "../components/SessionTranscriptPane";
import type { ProviderConversationRead } from "../../service/providerConversationRead";

const ready = (count: number) =>
  ({
    state: "ready",
    error: null,
    detail: { conversation: {}, messages: [], visibleMessageCount: count, hasEarlierMessages: false },
  }) as unknown as ProviderConversationRead;

describe("transcriptPaneState: three truths, never one 'could not be read'", () => {
  it("an empty transcript says so", () => {
    expect(transcriptPaneState(ready(0))).toEqual({ kind: "empty" });
    expect(transcriptPaneState(ready(3))).toEqual({ kind: "ready" });
  });
  it("no row and no error: missing or not shared (RLS answers both with silence)", () => {
    expect(transcriptPaneState({ state: "unavailable", detail: null, error: null })).toEqual({ kind: "not-visible" });
  });
  it("a real failure carries its own reason", () => {
    const state = transcriptPaneState({
      state: "unavailable",
      detail: null,
      error: { message: "permission denied for table message", code: "42501" },
    });
    expect(state).toMatchObject({ kind: "failed", message: "The transcript read failed: permission denied for table message" });
  });
  it("loading until the read lands", () => {
    expect(transcriptPaneState(null)).toEqual({ kind: "loading" });
  });
});
