/**
 * @jest-environment jsdom
 *
 * Held Cloud folder deletes are shown to the person with both choices, and each
 * choice is sent as the person's own answer for that exact hold (aidream review 2 N2).
 */
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const getJson = jest.fn();
const postJson = jest.fn();
jest.mock("@/lib/python-client", () => ({
  getJson: (...a: unknown[]) => getJson(...a),
  postJson: (...a: unknown[]) => postJson(...a),
}));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn() }, toastErrorAlreadyCaptured: jest.fn() }));
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, icon: _icon, variant: _v, ...rest }: Record<string, unknown>) =>
    React.createElement("button", rest, children as React.ReactNode),
}));

import { CloudFolderNotice } from "../CloudFolderNotice";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const HELD = {
  machine_on: true,
  hold: { hold_id: "h1", held: 30, reason: "mass_delete", sample: ["rev2/0.txt"],
          since: "2026-10-18T19:50:00+00:00", restores_at: "2026-10-21T19:50:00+00:00" },
  skipped: { count: 1, items: [{ path: "dl", reason: "symbolic link (not synced)" }] },
};

let host: HTMLDivElement;
let root: Root;

async function mount(): Promise<void> {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<CloudFolderNotice />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

function button(label: RegExp): HTMLButtonElement {
  const found = [...host.querySelectorAll("button")].find((b) => label.test(b.textContent ?? ""));
  if (!found) throw new Error(`no button ${label}`);
  return found as HTMLButtonElement;
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  getJson.mockReset();
  postJson.mockReset();
});

it("shows the hold, both choices and the skipped entries", async () => {
  getJson.mockResolvedValue({ data: HELD });
  await mount();
  expect(host.textContent).toContain("30 deleted files are still in your cloud");
  expect(button(/Delete 30 in cloud/)).toBeTruthy();
  expect(button(/Restore to folder/)).toBeTruthy();
  expect(host.textContent).toContain("1 Cloud items not synced");
});

it.each([
  [/Delete 30 in cloud/, "delete"],
  [/Restore to folder/, "restore"],
])("sends %s as the person's answer for that hold", async (label, action) => {
  getJson.mockResolvedValue({ data: HELD });
  postJson.mockResolvedValue({ data: { resolved: true } });
  await mount();
  await act(async () => {
    button(label).click();
  });
  expect(postJson).toHaveBeenCalledWith("/browser-manager/cloud-computer/files/resolve", {
    hold_id: "h1",
    action,
  });
});

it("renders nothing when nothing is held or skipped", async () => {
  getJson.mockResolvedValue({ data: { machine_on: true, hold: null, skipped: { count: 0, items: [] } } });
  await mount();
  expect(getJson).toHaveBeenCalledWith("/browser-manager/cloud-computer/files");
  expect(host.textContent).toBe("");
});
