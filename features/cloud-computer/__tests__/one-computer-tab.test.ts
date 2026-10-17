/**
 * One person, one machine, ONE Computer tab (2026-10-17): with the main chat
 * on the Computer, opening a chat window panel bound to the same machine
 * stacked a second Computer tab. The canvas identity is the machine's, never
 * the chat's, so every opener focuses the existing tab.
 */
import { artifactKey } from "@/features/canvas/host/artifactItem";
import {
  buildCloudComputerCanvasContent,
  cloudComputerCanvasSourceId,
} from "../useOpenCloudComputerCanvas";

it("two chats open the same Computer tab", () => {
  const main = buildCloudComputerCanvasContent({ conversationId: "conv-main" });
  const panel = buildCloudComputerCanvasContent({ conversationId: "conv-window-panel" });
  const none = buildCloudComputerCanvasContent();
  expect(artifactKey(main)).toBe(artifactKey(panel));
  expect(artifactKey(main)).toBe(artifactKey(none));
});

it("the source id never depends on the chat", () => {
  expect(cloudComputerCanvasSourceId("a")).toBe(cloudComputerCanvasSourceId("b"));
});

it("the opening chat still binds Take control", () => {
  expect(buildCloudComputerCanvasContent({ conversationId: "conv-main" }).metadata?.conversationId).toBe(
    "conv-main",
  );
});
