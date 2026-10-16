/**
 * @jest-environment jsdom
 */
// A one-value prompt (Rename) is a plain one-line field with the CURRENT value selected and Enter to
// confirm — never a stack of prose or a multi-line box. It used to read "This action needs a few values
// from you before it runs." over a two-row textarea.
import React, { act } from "react";
import { createRoot } from "react-dom/client";

import ValuePromptsDialogHostBody from "../ValuePromptsDialogHostBody";
import { promptForValues } from "../valuePromptsOpener";

// The Pro boxes need the app's store (mic, agents); the host's own choice of box is what is under test.
jest.mock("@/components/official/ProInput", () => ({
  ProInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));
jest.mock("@/components/official/ProTextarea", () => ({
  ProTextarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function open(fields: Parameters<typeof promptForValues>[0]["fields"]) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<ValuePromptsDialogHostBody />);
  });
  let answer: Promise<Record<string, string> | null>;
  await act(async () => {
    answer = promptForValues({ title: "Rename", submitLabel: "Rename", fields });
    await new Promise((r) => setTimeout(r, 50));
  });
  return { answer: answer!, root };
}

it("Rename is one single-line field, the name selected, Enter confirms, no filler sentence", async () => {
  const { answer, root } = await open([{ name: "name", prompt: "Name", defaultValue: "Budget 2026", required: true }]);
  expect(document.body.textContent).not.toContain("needs a few values");
  expect(document.querySelector("textarea")).toBeNull();
  const input = document.querySelector<HTMLInputElement>("#value-prompt-name")!;
  expect(input.tagName).toBe("INPUT");
  expect(input.value).toBe("Budget 2026");
  await act(async () => {
    input.focus();
  });
  expect([input.selectionStart, input.selectionEnd]).toEqual([0, "Budget 2026".length]);
  await act(async () => {
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  });
  await expect(answer).resolves.toEqual({ name: "Budget 2026" });
  act(() => root.unmount());
});

it("several values keep their multi-line boxes", async () => {
  const { answer, root } = await open([
    { name: "a", prompt: "A" },
    { name: "b", prompt: "B" },
  ]);
  expect(document.querySelectorAll("textarea").length).toBe(2);
  await act(async () => {
    document.querySelector<HTMLButtonElement>("button[type=button]:not([aria-label])")?.click();
  });
  void answer;
  act(() => root.unmount());
});
