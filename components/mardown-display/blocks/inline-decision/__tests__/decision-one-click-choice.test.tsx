/**
 * @jest-environment jsdom
 *
 * ONE CLICK IS THE CHOICE. Live walk 2026-10-05: clicking a decision option only
 * highlighted it and opened an editor; the `choice` remark existed only if the
 * person found "Replace Section With Text". Use case: a founder picks their first
 * launch channel from three options the agent proposed.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ProTextarea needs the app store (mic, agents); this test is about the decision, so a plain box stands in.
jest.mock("@/components/official/ProTextarea", () => ({
  ProTextarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

import InlineDecisionBlock from "../InlineDecisionBlock";

const decision = {
  id: "d1",
  prompt: "Pick our first launch channel",
  options: [
    { id: "a", label: "Email List", text: "Start with an email waitlist." },
    { id: "b", label: "Communities", text: "Start in niche communities." },
  ],
};

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  jest.useFakeTimers();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.useRealTimers();
});

const render = (onResolve: jest.Mock) =>
  act(() => {
    root.render(<InlineDecisionBlock decision={decision} rawXml="<decision/>" onResolve={onResolve} />);
  });
const button = (name: string) =>
  Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.trim() === name || b.getAttribute("aria-label") === name) as HTMLButtonElement;
const click = (el: HTMLElement) => act(() => { el.click(); });
const radio = (value: string) => container.querySelector(`input[type="radio"][value="${value}"]`) as HTMLInputElement;

test("the question and every option's own text are shown before anything is picked", () => {
  render(jest.fn());
  const text = container.textContent ?? "";
  expect(text).toContain("Pick our first launch channel");
  expect(text).toContain("Start with an email waitlist.");
  expect(text).toContain("Start in niche communities.");
});

test("a single click on an option resolves it with the option's label", () => {
  const onResolve = jest.fn();
  render(onResolve);
  click(radio("a"));
  act(() => { jest.advanceTimersByTime(400); });
  expect(onResolve).toHaveBeenCalledTimes(1);
  expect(onResolve).toHaveBeenCalledWith("d1", "<decision/>", "Start with an email waitlist.", "Email List");
});

test("the pencil customizes the text, and Cancel clears the selection", () => {
  const onResolve = jest.fn();
  render(onResolve);
  click(button("Edit Communities"));
  expect(container.querySelector("textarea")).not.toBeNull();
  click(button("Cancel"));
  expect(container.querySelector("textarea")).toBeNull();
  expect(onResolve).not.toHaveBeenCalled();
});

test("Write my own opens free text and resolves with no label", () => {
  const onResolve = jest.fn();
  render(onResolve);
  click(radio("custom"));
  const ta = container.querySelector("textarea") as HTMLTextAreaElement;
  expect(ta.value).toBe("");
  act(() => {
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    set.call(ta, "Do a podcast tour.");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
  click(button("Use this text"));
  act(() => { jest.advanceTimersByTime(400); });
  expect(onResolve).toHaveBeenCalledWith("d1", "<decision/>", "Do a podcast tour.", null);
});
