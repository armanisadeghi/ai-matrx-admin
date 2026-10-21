import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AuthenticatorSection } from "./AuthenticatorSection";
import { authenticatorError, type AuthenticatorSetup, type AuthenticatorState } from "./mfa";

const mockRead = jest.fn();
const mockEnroll = jest.fn();
const mockVerify = jest.fn();
const mockRemove = jest.fn();
let mockAuthChanged: (event: string, session: null) => void;
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({ auth: { onAuthStateChange: (callback: typeof mockAuthChanged) => { mockAuthChanged = callback; return { data: { subscription: { unsubscribe() {} } } }; } } }) }));
jest.mock("./mfa", () => ({ ...jest.requireActual("./mfa"), readAuthenticators: () => mockRead(), enrollAuthenticator: (...args: unknown[]) => mockEnroll(...args), verifyAuthenticator: (...args: unknown[]) => mockVerify(...args), removeAuthenticator: (...args: unknown[]) => mockRemove(...args) }));

const initial: AuthenticatorState = { userId: "owned-user", factors: [], elevated: false };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

describe("authenticator management lifecycle", () => {
  let container: HTMLDivElement;
  let root: Root;
  let mounted: boolean;
  const button = (label: string) => {
    const result = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.trim() === label);
    if (!result) throw new Error(`Missing ${label}`); return result;
  };
  const input = (id: string, value: string) => {
    const element = container.querySelector<HTMLInputElement>(`#${id}`); if (!element) throw new Error(`Missing ${id}`);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const mount = async () => { await act(async () => root.render(<AuthenticatorSection />)); };
  const begin = async () => {
    await act(async () => input("authenticator-name", "Recovery device"));
    await act(async () => button("Add authenticator").click());
  };
  const cancel = jest.fn(async () => {});
  const setup: AuthenticatorSetup = { id: "pending", qrCode: "data:image/svg+xml;base64,PHN2Zy8+", secret: "OWNEDSETUPKEY", cancel };
  beforeEach(() => {
    jest.clearAllMocks(); mockRead.mockResolvedValue(initial); mockEnroll.mockResolvedValue(setup);
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); mounted = true;
  });
  afterEach(async () => { if (mounted) await act(async () => root.unmount()); container.remove(); });

  it("passes the displayed identity to enrollment and displays provider setup", async () => {
    await mount(); expect(button("Add authenticator").disabled).toBe(true);
    await begin(); expect(mockEnroll).toHaveBeenCalledWith("owned-user", "Recovery device");
    expect(container.querySelector("img")?.getAttribute("src")).toBe(setup.qrCode);
    expect(container.textContent).toContain(setup.secret);
  });
  it("cleans a provider enrollment that arrives after sign-out", async () => {
    const request = deferred<AuthenticatorSetup>(); mockEnroll.mockReturnValue(request.promise);
    await mount(); await begin();
    await act(async () => mockAuthChanged("SIGNED_OUT", null));
    await act(async () => request.resolve(setup));
    expect(cancel).toHaveBeenCalledTimes(1); expect(container.textContent).not.toContain(setup.secret);
  });
  it("cleans unverified setup on unmount", async () => {
    await mount(); await begin(); await act(async () => root.unmount()); mounted = false;
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("does not cancel a setup after verification has succeeded", async () => {
    await mount(); await begin();
    mockRead.mockResolvedValue({ ...initial, elevated: true, factors: [{ id: "pending", name: "Recovery device", verified: true }] });
    await act(async () => input("authenticator-code", "123456"));
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(mockVerify).toHaveBeenCalledWith("owned-user", "pending", "123456");
    expect(container.textContent).toContain("Verified this session"); expect(container.textContent).not.toContain(setup.secret);
    await act(async () => root.unmount()); mounted = false; expect(cancel).not.toHaveBeenCalled();
  });
  it("does not display a success state after provider rejection", async () => {
    await mount(); await begin(); mockVerify.mockRejectedValue({ code: "mfa_verification_failed", message: "PRIVATE_PROVIDER_PAYLOAD" });
    await act(async () => input("authenticator-code", "123456"));
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(container.textContent).toContain("That code wasn’t accepted"); expect(container.textContent).not.toContain("Authenticator verified.");
    expect(container.textContent).not.toContain("PRIVATE_PROVIDER_PAYLOAD");
  });
  it("requires explicit confirmation before removing a verified factor", async () => {
    mockRead.mockResolvedValue({ ...initial, elevated: true, factors: [{ id: "verified", name: "Primary device", verified: true }] });
    await mount(); await act(async () => button("Remove").click()); expect(mockRemove).not.toHaveBeenCalled();
    await act(async () => button("Confirm removal").click()); expect(mockRemove).toHaveBeenCalledWith("owned-user", "verified");
  });
});

describe("safe MFA recovery messages", () => {
  it.each([
    [{ code: "insufficient_aal" }, "Verify an authenticator, then try again."],
    [{ code: "mfa_factor_name_conflict" }, "That authenticator name is already in use."],
    [{ code: "too_many_enrolled_mfa_factors" }, "Remove an unused authenticator before adding another."],
    [new Error("Login details can't be changed during a support session."), "Login details can't be changed during a support session."],
    [new Error("PRIVATE_SETUP_KEY"), "Couldn’t complete that action. Try again."],
  ])("reports a recovery action without reflecting provider secrets", (error, expected) => {
    expect(authenticatorError(error)).toBe(expected);
  });
});
