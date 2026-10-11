import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  AuthenticatorSetupDialog,
  authenticatorName,
} from "./AuthenticatorSetupDialog";
import { parseEnrollmentInput } from "../../authenticator-otpauth";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const setup =
  "otpauth://totp/Example%3Aowner%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example";
const entry = {
  credential_item_id: "item-1",
  display_name: "Example",
  label: "owner@example.com",
  issuer: "Example",
  digits: 6,
  period: 30,
  algorithm: "SHA1",
  enabled: true,
  login_urls: [],
  seed_field_id: "field-1",
};

jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: () => "test-context",
}));
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
    onOpenChange,
  }: {
    open: boolean;
    children: React.ReactNode;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div>
        {children}
        <button onClick={() => onOpenChange(false)}>Dismiss</button>
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));
jest.mock("@ai-matrx/design-system", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));
jest.mock("@/components/ui/label", () => ({
  Label: (props: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props} />
  ),
}));
jest.mock("@/components/qr/QrCodeInput", () => ({
  QrCodeInput: ({
    onDecoded,
    disabled,
  }: {
    onDecoded: (value: string) => void;
    disabled: boolean;
  }) => (
    <button
      disabled={disabled}
      onClick={() =>
        onDecoded(
          "otpauth://totp/Example%3Aowner%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example",
        )
      }
    >
      Decode image
    </button>
  ),
}));
jest.mock("@/components/official/entity-ref/EntityRef", () => ({
  EntityRef: ({ name }: { name: string }) => <span>{name}</span>,
}));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({
  ErrorAlchemyMenu: () => null,
}));
jest.mock("../SecretValue", () => ({ VaultRevealReauthDialog: () => null }));
jest.mock("./AuthenticatorCode", () => ({
  AuthenticatorCode: () => <div data-testid="current-code">Current code</div>,
}));

let root: Root;
let host: HTMLDivElement;
const mount = async (
  enroll: (
    input: string,
    parsed: ReturnType<typeof parseEnrollmentInput>,
    details: {
      displayName: string;
      loginUrl: string;
      userId: string;
      organizationId: string;
    },
  ) => Promise<typeof entry>,
) => {
  await act(async () => {
    root.render(
      <AuthenticatorSetupDialog
        open
        standalone
        onOpenChange={jest.fn()}
        onEnroll={enroll}
      />,
    );
  });
};
function button(name: string): HTMLButtonElement {
  const node = Array.from(host.querySelectorAll("button")).find(
    (element) => element.textContent === name,
  );
  if (!node) throw new Error(`Missing button: ${name}`);
  return node;
}
async function click(name: string) {
  await act(async () => {
    button(name).click();
  });
}
async function enter(value: string) {
  const field = host.querySelector("#authenticator-setup-key");
  if (!(field instanceof HTMLInputElement))
    throw new Error("Setup field missing");
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  await act(async () => {
    setter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

describe("authenticator intake", () => {
  test("manual setup needs no username/password/name and immediately shows the saved code", async () => {
    const enroll = jest.fn().mockResolvedValue(entry);
    await mount(enroll);
    expect(host.querySelector('[data-testid="current-code"]')).toBeNull();
    expect(host.textContent).not.toContain("Username or email");
    await enter(setup);
    await click("Save authenticator");
    expect(host.querySelector('[data-testid="current-code"]')).not.toBeNull();
    expect(enroll).toHaveBeenCalledWith(
      setup,
      expect.objectContaining({ issuer: "Example" }),
      expect.objectContaining({ displayName: "", loginUrl: "" }),
    );
    expect(host.textContent).toContain(
      "Enter this code on the website to finish setup.",
    );
  });
  test("image intake saves directly and blocks duplicate requests", async () => {
    let resolve: (value: typeof entry) => void = () => {};
    const enroll = jest.fn(
      () =>
        new Promise<typeof entry>((done) => {
          resolve = done;
        }),
    );
    await mount(enroll);
    await click("Decode image");
    await click("Saving authenticator…");
    expect(enroll).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve(entry);
    });
    expect(host.querySelector('[data-testid="current-code"]')).not.toBeNull();
  });
  test("failure retains intake for retry without claiming a code was saved", async () => {
    const enroll = jest
      .fn()
      .mockRejectedValueOnce(new Error("Enrollment failed"))
      .mockResolvedValue(entry);
    await mount(enroll);
    await enter(setup);
    await click("Save authenticator");
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      "Enrollment failed",
    );
    expect(host.querySelector('[data-testid="current-code"]')).toBeNull();
    await click("Save authenticator");
    expect(host.querySelector('[data-testid="current-code"]')).not.toBeNull();
    expect(enroll).toHaveBeenCalledTimes(2);
  });
  test("dismissal after success completes the outer flow; dismissal during save is fenced", async () => {
    let resolve: (value: typeof entry) => void = () => {};
    const enroll = jest.fn(
      () =>
        new Promise<typeof entry>((done) => {
          resolve = done;
        }),
    );
    const closed = jest.fn();
    const done = jest.fn();
    await act(async () => {
      root.render(
        <AuthenticatorSetupDialog
          open
          onOpenChange={closed}
          onDone={done}
          onEnroll={enroll}
        />,
      );
    });
    await click("Decode image");
    await click("Dismiss");
    expect(closed).not.toHaveBeenCalled();
    await act(async () => {
      resolve(entry);
    });
    await click("Dismiss");
    expect(done).toHaveBeenCalledTimes(1);
    expect(closed).toHaveBeenCalledWith(false);
  });
  test("invalid setup stays editable without creating a Vault item", async () => {
    const enroll = jest.fn().mockResolvedValue(entry);
    await mount(enroll);
    await enter("not-valid-1");
    await click("Save authenticator");
    expect(enroll).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="current-code"]')).toBeNull();
  });
  test("fills placeholder names from issuer and preserves custom names", () => {
    const parsed = parseEnrollmentInput(setup);
    expect(authenticatorName("Website login", parsed)).toBe("Example");
    expect(authenticatorName("", parsed)).toBe("Example");
    expect(authenticatorName("My production account", parsed)).toBe(
      "My production account",
    );
  });
});
