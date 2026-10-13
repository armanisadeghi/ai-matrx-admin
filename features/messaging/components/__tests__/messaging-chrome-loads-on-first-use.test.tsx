/**
 * THE MESSAGING CHROME'S INSIDES LOAD WHEN A MESSAGE RENDERS, NOT WHEN THE APP BOOTS.
 *
 * `providers/MessagingHost.tsx` is mounted on every route and binds `MessagingMessageChrome` and
 * `MessagingFence` into `<MessagingProvider>`. What they draw inside — the message's "Linked"
 * section and the ```matrx fence (the kind registry behind `MatrxEnvelopeBlock`) — now arrives
 * through ONE `import()` of `MessagingChromeImpl.tsx`; the wrappers stay static so a bubble never
 * waits on it.
 *
 * RED without the fix: with `MessagingChrome.tsx` importing `MatrxEnvelopeBlock` / `MessageLinks`
 * statically, both are evaluated the moment the chrome module is imported.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Message } from "@ai-matrx/messaging/react";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockEvaluated: string[] = [];

jest.mock("@/features/matrx-envelope/MatrxEnvelopeBlock", () => {
  mockEvaluated.push("MatrxEnvelopeBlock");
  return { __esModule: true, default: ({ content }: { content: string }) => <span data-testid="fence">{content}</span> };
});
jest.mock("@/features/messaging/components/MessageLinks", () => {
  mockEvaluated.push("MessageLinks");
  return { MessageLinks: ({ messageId }: { messageId: string }) => <span data-testid="links">{messageId}</span> };
});
jest.mock("@/features/messaging/lib/messaging-menu-actions", () => {
  mockEvaluated.push("messaging-menu-actions");
  return { messageSenderName: () => "Ada" };
});

import { MessagingFence, MessagingMessageChrome } from "@/features/messaging/components/MessagingChrome";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

it("importing the chrome loads nothing heavy; a message draws its bubble at once and its insides once loaded", async () => {
  expect(mockEvaluated).toEqual([]);

  const message = { id: "m1" } as unknown as Message;
  act(() => {
    root.render(
      <>
        <MessagingMessageChrome message={message} isMine={false}>
          <p data-testid="bubble">hello</p>
        </MessagingMessageChrome>
        <MessagingFence body='{"__kind":"x"}' />
      </>,
    );
  });

  // The bubble never waits; the fence holds a chip-sized placeholder.
  expect(container.querySelector('[data-testid="bubble"]')?.textContent).toBe("hello");
  expect(container.querySelector('[data-message-id="m1"]')).not.toBeNull();
  expect(container.querySelector('[aria-label="Loading reference"]')).not.toBeNull();

  await flush();

  expect([...mockEvaluated].sort()).toEqual(["MatrxEnvelopeBlock", "MessageLinks", "messaging-menu-actions"]);
  expect(container.querySelector('[aria-label="Loading reference"]')).toBeNull();
  expect(container.querySelector('[data-testid="fence"]')?.textContent).toBe('{"__kind":"x"}');
  expect(container.querySelector('[data-testid="links"]')?.textContent).toBe("m1");
});
