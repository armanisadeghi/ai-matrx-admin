/**
 * Esc closes a row's side peek like Notion (ADVERSARIAL-1 #8). It did not: a menu, popover or dialog wrapper that
 * was mounted but closed or hidden counted as "a layer is open", and held Esc away from the peek for good. Only
 * layers a person can see take Esc first now, and only the newest peek closes — never two in one press.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

import { SidePeek } from "../menu-parts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const esc = () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));

async function mount(onClose: () => void, label = "one") {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<SidePeek onClose={onClose}><p>{label}</p></SidePeek>));
  return async () => {
    await act(async () => root.unmount());
    host.remove();
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

it("Esc closes the peek", async () => {
  const onClose = jest.fn();
  const done = await mount(onClose);
  esc();
  expect(onClose).toHaveBeenCalledTimes(1);
  await done();
});

it("a closed or hidden menu left in the page does not hold Esc away from the peek", async () => {
  document.body.insertAdjacentHTML(
    "beforeend",
    '<div role="menu" data-state="closed"></div><div role="listbox" hidden></div><div data-radix-popper-content-wrapper aria-hidden="true"></div><div role="dialog" data-state="closed"></div><div role="menu" style="display:none"></div>',
  );
  const onClose = jest.fn();
  const done = await mount(onClose);
  esc();
  expect(onClose).toHaveBeenCalledTimes(1);
  await done();
});

it("a menu that is open takes the first Esc, and the peek waits for the next", async () => {
  document.body.insertAdjacentHTML("beforeend", '<div role="menu" data-state="open"></div>');
  const onClose = jest.fn();
  const done = await mount(onClose);
  esc();
  expect(onClose).not.toHaveBeenCalled();
  document.querySelector('[role="menu"]')?.remove();
  esc();
  expect(onClose).toHaveBeenCalledTimes(1);
  await done();
});

it("with two peeks open, one Esc closes only the newest", async () => {
  const first = jest.fn();
  const second = jest.fn();
  const doneFirst = await mount(first, "first");
  const doneSecond = await mount(second, "second");
  esc();
  expect(second).toHaveBeenCalledTimes(1);
  expect(first).not.toHaveBeenCalled();
  await doneSecond();
  esc();
  expect(first).toHaveBeenCalledTimes(1);
  await doneFirst();
});
