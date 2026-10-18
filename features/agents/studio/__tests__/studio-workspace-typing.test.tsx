/** @jest-environment jsdom */
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useDraftField } from "../use-draft-field";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Mirrors the pane: a record held in state, a field that edits it, a slow save whose ECHO (the value
 * as it was when the save started) is written back, and an assistant write that lands mid-typing.
 */
function Harness({ api }: { api: { setServer: (v: string) => void; saves: string[]; echoes: (() => void)[] } }) {
  const [goal, setGoal] = useState("confirming the plan so we can help");
  api.setServer = setGoal;
  const field = useDraftField(goal, (next) => {
    setGoal(next); // optimistic
    api.saves.push(next);
    return new Promise<void>((resolve) => {
      api.echoes.push(() => {
        setGoal(next); // the save echo: the record as it was when this save began
        resolve();
      });
    });
  });
  return (
    <textarea
      data-testid="goal"
      value={field.text}
      onChange={(e) => field.onChange(e.target.value)}
      onFocus={field.onFocus}
      onBlur={field.onBlur}
    />
  );
}

function setup() {
  const api = { setServer: (_v: string) => {}, saves: [] as string[], echoes: [] as (() => void)[] };
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  act(() => root.render(<Harness api={api} />));
  const el = host.querySelector("textarea") as HTMLTextAreaElement;
  const type = (value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    act(() => {
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  const focus = () => el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  const blur = () => el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  return { api, el, type, root, focus, blur };
}

describe("typing in a workspace field while echoes and the assistant write", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("keeps every character the person typed, mid-paragraph, through an echo and an assistant update", () => {
    const { api, el, type, focus, blur } = setup();
    act(() => focus());
    const base = "confirming the plan so we can help";
    // type "Keep the two " into the middle, one key at a time, with a save echo and an assistant write interleaved
    const inserted = "Keep the two ";
    let text = base;
    const at = "confirming ".length;
    for (let i = 0; i < inserted.length; i++) {
      text = base.slice(0, at) + inserted.slice(0, i + 1) + base.slice(at);
      type(text);
      if (i === 3) {
        act(() => jest.advanceTimersByTime(450)); // a pause: the first save starts
        act(() => api.setServer("the assistant rewrote this")); // the assistant's concurrent update
      }
      if (i === 5) act(() => api.echoes[0]?.()); // the first save's echo arrives late
    }
    expect(el.value).toBe(text);
    act(() => jest.advanceTimersByTime(450));
    expect(api.saves[api.saves.length - 1]).toBe(text);
    act(() => api.echoes.forEach((f) => f()));
    act(() => blur());
    expect(el.value).toBe(text);
    expect(text).toBe("confirming Keep the two the plan so we can help");
  });

  it("debounces: one save per pause, not one per key, and blur flushes at once", () => {
    const { api, el, type, focus, blur } = setup();
    act(() => focus());
    type("a");
    type("ab");
    type("abc");
    expect(api.saves).toEqual([]);
    act(() => blur());
    expect(api.saves).toEqual(["abc"]);
  });

  it("follows the record again once the person has left and everything is saved", async () => {
    const { api, el, type, focus, blur } = setup();
    act(() => focus());
    type("mine");
    act(() => blur());
    await act(async () => api.echoes.forEach((f) => f()));
    act(() => api.setServer("assistant text"));
    expect(el.value).toBe("assistant text");
  });
});
