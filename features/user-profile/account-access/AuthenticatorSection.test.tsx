import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AuthenticatorSection } from "./AuthenticatorSection";
import { authenticatorError, type AuthenticatorSetup, type AuthenticatorState } from "./mfa";

const mockRead = jest.fn();
const mockEnroll = jest.fn();
const mockVerify = jest.fn();
const mockRemove = jest.fn();
const mockGenerate = jest.fn();
const mockRecover = jest.fn();
let mockAuthChanged: (event: string, session: null) => void;
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({ auth: { onAuthStateChange: (callback: typeof mockAuthChanged) => { mockAuthChanged = callback; return { data: { subscription: { unsubscribe() {} } } }; } } }) }));
jest.mock("./mfa", () => ({ ...jest.requireActual("./mfa"), generateRecoveryCodes: (...args: unknown[]) => mockGenerate(...args), verifyRecoveryCode: (...args: unknown[]) => mockRecover(...args), readAuthenticators: () => mockRead(), enrollAuthenticator: (...args: unknown[]) => mockEnroll(...args), verifyAuthenticator: (...args: unknown[]) => mockVerify(...args), removeAuthenticator: (...args: unknown[]) => mockRemove(...args) }));

const initial: AuthenticatorState = { userId: "owned-user", factors: [], elevated: false, hasRecoveryCodes: false };
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
  it("displays native codes once and clears them on acknowledgement", async () => {
    mockRead.mockResolvedValue({ ...initial, elevated: true, factors: [{ id: "primary", name: "Primary", verified: true }] });
    mockGenerate.mockResolvedValue(["OWNEDRECOVERYCODE"]);
    await mount(); await act(async () => button("Generate recovery codes").click());
    expect(mockGenerate).toHaveBeenCalledWith("owned-user", false);
    expect(container.textContent).toContain("OWNEDRECOVERYCODE");
    await act(async () => button("I saved these codes").click());
    expect(container.textContent).not.toContain("OWNEDRECOVERYCODE");
  });
  it("keeps the one-time display available if subsequent provider readback fails", async () => {
    mockRead.mockResolvedValueOnce({ ...initial, elevated: true, factors: [{ id: "primary", name: "Primary", verified: true }] }).mockRejectedValue(new Error("readback unavailable"));
    mockGenerate.mockResolvedValue(["OWNED_ONCE_ONLY"]);
    await mount(); await act(async () => button("Generate recovery codes").click());
    expect(container.textContent).toContain("OWNED_ONCE_ONLY");
    expect(container.textContent).toContain("Couldn’t complete that action");
  });
  it("requires confirmation before invalidating previous codes", async () => {
    mockRead.mockResolvedValue({ ...initial, elevated: true, hasRecoveryCodes: true, factors: [{ id: "primary", name: "Primary", verified: true }] });
    mockGenerate.mockResolvedValue(["OWNEDREPLACEMENT"]);
    await mount(); await act(async () => button("Replace recovery codes").click());
    expect(mockGenerate).not.toHaveBeenCalled();
    await act(async () => button("Confirm replacement").click());
    expect(mockGenerate).toHaveBeenCalledWith("owned-user", true);
  });
  it("does not expose delayed recovery codes after sign-out", async () => {
    mockRead.mockResolvedValue({ ...initial, elevated: true, factors: [{ id: "primary", name: "Primary", verified: true }] });
    const pending = deferred<string[]>(); mockGenerate.mockReturnValue(pending.promise);
    await mount(); await act(async () => button("Generate recovery codes").click());
    await act(async () => mockAuthChanged("SIGNED_OUT", null));
    await act(async () => pending.resolve(["PRIVATE_RECOVERY"]));
    expect(container.textContent).not.toContain("PRIVATE_RECOVERY");
  });
  it("offers a masked saved-code challenge from AAL1 and clears it after verification", async () => {
    mockRead.mockResolvedValue({ ...initial, hasRecoveryCodes: true });
    await mount(); expect(container.querySelector<HTMLInputElement>("#recovery-code")?.type).toBe("password");
    await act(async () => input("recovery-code", "OWNEDSAVEDCODE"));
    mockRead.mockResolvedValue({ ...initial, elevated: true, hasRecoveryCodes: true });
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(mockRecover).toHaveBeenCalledWith("owned-user", "OWNEDSAVEDCODE");
    expect(container.textContent).toContain("Recovery code verified.");
    expect(container.querySelector("#recovery-code")).toBeNull();
  });
  it("challenge mode opens the code box for the verified factor and reports aal2", async () => {
    const elevated = jest.fn();
    mockVerify.mockResolvedValue(undefined);
    mockRead.mockResolvedValue({ ...initial, factors: [{ id: "primary", name: "Primary", verified: true }] });
    await act(async () => root.render(<AuthenticatorSection challenge onElevated={elevated} />));
    expect(container.querySelector("#authenticator-code")).not.toBeNull();
    await act(async () => input("authenticator-code", "654321"));
    mockRead.mockResolvedValue({ ...initial, elevated: true, factors: [{ id: "primary", name: "Primary", verified: true }] });
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(mockVerify).toHaveBeenCalledWith("owned-user", "primary", "654321");
    expect(elevated).toHaveBeenCalledTimes(1);
  });
  it("challenge mode with no authenticator offers enrollment and never reports aal2 early", async () => {
    const elevated = jest.fn();
    await act(async () => root.render(<AuthenticatorSection challenge onElevated={elevated} />));
    expect(container.querySelector("#authenticator-code")).toBeNull();
    expect(button("Add authenticator")).toBeTruthy();
    expect(elevated).not.toHaveBeenCalled();
  });

});

describe("safe MFA recovery messages", () => {
  it.each([
    [{ code: "insufficient_aal" }, "Verify an authenticator, then try again."],
    [{ code: "mfa_factor_name_conflict" }, "That authenticator name is already in use."],
    [{ code: "too_many_enrolled_mfa_factors" }, "Remove an unused authenticator before adding another."],
    [new Error("Login details can't be changed during a support session."), "Login details can't be changed during a support session."],
    [{ code: "mfa_recovery_codes_enroll_not_enabled" }, "Recovery codes aren’t enabled. Use another authenticator."],
    [new Error("Enter a saved recovery code."), "Enter a saved recovery code."],
    [{ code: "mfa_recovery_codes_locked" }, "Too many recovery attempts. Wait or use another authenticator."],
    [new Error("PRIVATE_SETUP_KEY"), "Couldn’t complete that action. Try again."],
  ])("reports a recovery action without reflecting provider secrets", (error, expected) => {
    expect(authenticatorError(error)).toBe(expected);
  });
});
