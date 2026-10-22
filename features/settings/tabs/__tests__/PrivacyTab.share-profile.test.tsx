/**
 * @jest-environment jsdom
 *
 * Review 2026-10-21, finding 7: "Share my profile with my agents" vanished with no reason when its knob row was not
 * loaded, while the server treats an unread setting as OFF. The switch is shown loading, and a failed read says so
 * with a retry. The real primitives render; only the data edges are stand-ins.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockSettings = { isLoading: false, error: null as string | null, knobByKey: jest.fn(() => null as unknown), refresh: jest.fn() };
jest.mock("../../universal/UniversalSettingsContext", () => ({ useUniversalSettings: () => mockSettings }));
jest.mock("../../universal/UniversalSettingsPane", () => ({
  UniversalSettingsRows: () => <div data-testid="knob-rows">rows</div>,
}));
jest.mock("@/features/kg-suggestions/hooks/useAutoRagPreference", () => ({
  useAutoRagPreference: () => ({ enabled: false, loading: false, saving: false, setEnabled: jest.fn() }),
}));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/errors/toastWriteFailure", () => ({ toastWriteFailure: jest.fn() }));
jest.mock("@ai-matrx/design-system/settings", () => ({
  ...jest.requireActual("@ai-matrx/design-system/settings"),
  SettingsLink: () => null,
}));
jest.mock("../../doors/settingDoorTarget", () => ({ settingDoorHref: () => "/x" }));

// eslint-disable-next-line import/first -- after the mocks
import PrivacyTab from "../PrivacyTab";

function render() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => createRoot(host).render(<PrivacyTab />));
  return host;
}

describe("PrivacyTab: the agents switch is never silently absent", () => {
  beforeEach(() => {
    mockSettings.isLoading = false;
    mockSettings.error = null;
    mockSettings.knobByKey.mockReturnValue(null);
    mockSettings.refresh.mockClear();
  });

  it("while the setting loads: the switch is there, disabled", () => {
    mockSettings.isLoading = true;
    const host = render();
    expect(host.textContent).toContain("Share my profile with my agents");
    const sw = host.querySelector('[role="switch"]') as HTMLElement;
    expect(sw).not.toBeNull();
    expect(sw.hasAttribute("disabled") || sw.getAttribute("aria-disabled") === "true" || (sw as HTMLButtonElement).disabled).toBe(true);
  });

  it("when the read failed: says so briefly, and Retry reads again", () => {
    mockSettings.error = "network";
    const host = render();
    expect(host.textContent).toContain("Share my profile with my agents");
    expect(host.textContent).toContain("Could not load");
    const retry = [...host.querySelectorAll("button")].find((b) => b.textContent?.includes("Retry")) as HTMLButtonElement;
    act(() => retry.click());
    expect(mockSettings.refresh).toHaveBeenCalledTimes(1);
  });

  it("when it loaded but this key is absent: not hidden either", () => {
    const host = render();
    expect(host.textContent).toContain("Share my profile with my agents");
    expect(host.textContent).toContain("Not available");
  });

  it("when the knob is present: the knob row renders instead", () => {
    mockSettings.knobByKey.mockReturnValue({ description: "d", ui: { help: "h" } });
    const host = render();
    expect(host.querySelector('[data-testid="knob-rows"]')).not.toBeNull();
    expect(host.textContent).not.toContain("Retry");
  });
});
