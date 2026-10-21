/**
 * @jest-environment jsdom
 *
 * Person-run account setup: the person opens a service's sign-up page on their
 * cloud desktop, then saves the login to their vault from the panel. The start
 * call carries no credential; the save call goes to THIS run's save door; the
 * password is cleared from the form the moment it is saved; the authenticator key
 * goes through the vault's own enrollment, and a refusal says where to finish.
 */
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const postJson = jest.fn();
jest.mock("@/lib/python-client", () => ({
  getJson: jest.fn(),
  postJson: (...a: unknown[]) => postJson(...a),
}));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn() }, toastErrorAlreadyCaptured: jest.fn() }));
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, icon: _icon, variant: _v, ...rest }: Record<string, unknown>) =>
    React.createElement("button", rest, children as React.ReactNode),
}));
jest.mock("@/components/ui/label", () => ({
  Label: (p: Record<string, unknown>) => React.createElement("label", p),
}));
jest.mock("@ai-matrx/design-system/controls", () => ({
  Input: (p: Record<string, unknown>) => React.createElement("input", p),
}));

import { AccountSetupPanel } from "../AccountSetupPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

function setValue(id: string, value: string) {
  const el = host.querySelector<HTMLInputElement>(`#${id}`)!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
async function press(label: RegExp) {
  const b = [...host.querySelectorAll("button")].find((x) => label.test(x.textContent ?? ""))!;
  await act(async () => {
    b.click();
  });
}

beforeEach(async () => {
  postJson.mockReset();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<AccountSetupPanel />);
  });
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function toTyping() {
  postJson.mockResolvedValueOnce({
    data: { run_id: "run-1", profile_id: "prof-1", host: "app.example.com", navigated: true },
  });
  await press(/set up an account/i);
  await act(async () => setValue("account-setup-url", "app.example.com/signup"));
  await press(/open on my computer/i);
}

it("opens the sign-up page with no credential in the request", async () => {
  await toTyping();
  expect(postJson).toHaveBeenCalledWith("/browser-manager/account-setup/start", {
    service_url: "https://app.example.com/signup",
    display_name: null,
  });
  expect(host.textContent).toMatch(/app\.example\.com is open on your computer/);
});

it("saves to this run's door, clears the password, then offers the authenticator key", async () => {
  await toTyping();
  await act(async () => {
    setValue("account-setup-username", "me@example.com");
    setValue("account-setup-password", "pw-typed-by-person");
  });
  postJson.mockResolvedValueOnce({ data: { credential_item_id: "item-9", bound_to_profile: true } });
  await press(/save to my vault/i);
  expect(postJson).toHaveBeenLastCalledWith("/browser-manager/runs/run-1/account-setup/save", {
    display_name: "app.example.com",
    username: "me@example.com",
    password: "pw-typed-by-person",
  });
  // The password field is gone from the page once saved.
  expect(host.querySelector("#account-setup-password")).toBeNull();
  expect(host.innerHTML).not.toContain("pw-typed-by-person");

  await act(async () => setValue("account-setup-key", "JBSWY3DPEHPK3PXP"));
  postJson.mockResolvedValueOnce({ data: {} });
  await press(/save key/i);
  expect(postJson).toHaveBeenLastCalledWith("/api/authenticator/enroll", {
    credential_item_id: "item-9",
    enrollment_input: "JBSWY3DPEHPK3PXP",
  });
  expect(host.textContent).toMatch(/Saved/);
});

it("says so when the save is refused and keeps the person on the form", async () => {
  await toTyping();
  await act(async () => {
    setValue("account-setup-username", "me@example.com");
    setValue("account-setup-password", "x");
  });
  postJson.mockRejectedValueOnce(new Error("The browser has no page open yet."));
  await press(/save to my vault/i);
  expect(host.querySelector('[role="alert"]')?.textContent).toMatch(/no page open/);
  expect(host.querySelector("#account-setup-password")).not.toBeNull();
});
