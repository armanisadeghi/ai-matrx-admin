/**
 * @jest-environment jsdom
 *
 * IN CHAT, WRITING A MARK OPENS NOTHING (Arman, 2026-10-22: "opening the canvas each time is
 * unnecessary"). A highlight, a comment or a link on a chat message must not call `onActivity`
 * (the host's open-the-dock hook); the same writes on a document still do. Pressing an existing
 * mark (setActiveKey) is a person asking to see it, so it still opens in both.
 *
 * Break this catches: a write on a message source that pops the dock/canvas.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const raw = {
  addHighlight: jest.fn(async () => null),
  postComment: jest.fn(async () => null),
  link: jest.fn(async () => null),
  ready: true,
  state: { items: [] },
};
jest.mock("../useAnnotationSidecar", () => ({ useAnnotationSidecar: () => raw }));
jest.mock("../LinkRecordSheet", () => ({ LinkRecordSheet: () => null }));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));

import { AnnotationSidecarProvider, useSidecar } from "../AnnotationSidecar";

let captured: ReturnType<typeof useSidecar> | null = null;
function Probe() {
  captured = useSidecar();
  return null;
}

function mount(token: string, onActivity: () => void) {
  const host = document.createElement("div");
  const root = createRoot(host);
  act(() =>
    root.render(
      <AnnotationSidecarProvider
        source={{ token, id: "x-1", title: "t", body: "b", contentVersion: 1, conversationId: "c-1" } as never}
        onActivity={onActivity}
      >
        <Probe />
      </AnnotationSidecarProvider>,
    ),
  );
  return () => act(() => root.unmount());
}

async function writeAll() {
  await act(async () => {
    await captured!.api.postComment({ body: "hi", anchor: {} as never });
    await captured!.api.postComment({ body: "hi", anchor: {} as never, onWritten: () => undefined });
    await captured!.api.addHighlight({} as never);
    await captured!.api.link({} as never);
  });
}

beforeEach(() => jest.clearAllMocks());

it("a chat message's comment, staged or not, highlight and link open nothing", async () => {
  const onActivity = jest.fn();
  const unmount = mount("message", onActivity);
  await writeAll();
  expect(raw.postComment).toHaveBeenCalledTimes(2);
  expect(raw.addHighlight).toHaveBeenCalledTimes(1);
  expect(raw.link).toHaveBeenCalledTimes(1);
  expect(onActivity).not.toHaveBeenCalled();
  unmount();
});

it("pressing an existing mark in a chat message still opens", () => {
  const onActivity = jest.fn();
  const unmount = mount("message", onActivity);
  act(() => captured!.setActiveKey("comment:c1"));
  expect(onActivity).toHaveBeenCalledTimes(1);
  unmount();
});

it("a document's writes still open its dock", async () => {
  const onActivity = jest.fn();
  const unmount = mount("document", onActivity);
  await writeAll();
  expect(onActivity).toHaveBeenCalledTimes(4);
  unmount();
});
