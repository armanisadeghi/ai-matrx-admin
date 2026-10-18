/** @jest-environment jsdom */
//
// /user-settings signed out used to read platform.taxonomy_node twice and get two 401s (speed-test
// census, live 2026-10-18). A visitor has no settings to file: the provider reads nothing for them,
// and still reads for a signed-in person. Replaced: the data doors and the store selectors only.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { UniversalSettingsProvider } from "../UniversalSettingsContext";
import { fetchTaxonomyIndex } from "../taxonomy";

let mockUserId: string | null = null;
jest.mock("@/lib/scoped-config/service", () => ({ fetchKnobIndex: jest.fn(async () => []) }));
jest.mock("@/features/admin/limits/service", () => ({ fetchFeatureKnobs: jest.fn() }));
jest.mock("../taxonomy", () => ({
  ...jest.requireActual("../taxonomy"),
  fetchTaxonomyIndex: jest.fn(async () => ({ byId: new Map(), bySlug: new Map() })),
}));
jest.mock("@/lib/scoped-config/deviceId", () => ({ getWebDeviceId: () => "dev" }));
jest.mock("@/lib/scoped-config/effectiveKnobs", () => ({ invalidateEffectiveKnob: jest.fn(), catchUpKnobsSinceBoot: jest.fn(async () => false) }));
jest.mock("@/lib/knobs/featureKnobs", () => ({ invalidateFeatureKnobs: jest.fn() }));
jest.mock("@/lib/client-directives/directiveRegistry", () => ({ registerDirectiveHandler: () => () => {} }));
jest.mock("@/features/organizations/hooks", () => ({ useUserOrganizations: () => ({ organizations: [] }) }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: (selector: unknown) => (selector as () => unknown)() }));
jest.mock("@/lib/redux/slices/appContextSlice", () => ({ selectOrganizationId: () => null }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({
  selectUserId: () => mockUserId,
  selectIsSuperAdmin: () => false,
  selectAdminFeature: () => false,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  jest.mocked(fetchTaxonomyIndex).mockClear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function mount() {
  await act(async () => {
    root.render(<UniversalSettingsProvider target="user"><span /></UniversalSettingsProvider>);
  });
}

it("a signed-out visitor makes no taxonomy read", async () => {
  mockUserId = null;
  await mount();
  expect(fetchTaxonomyIndex).not.toHaveBeenCalled();
});

it("a signed-in person still reads the taxonomy", async () => {
  mockUserId = "22222222-2222-4222-8222-222222222222";
  await mount();
  expect(fetchTaxonomyIndex).toHaveBeenCalled();
});
