/**
 * @jest-environment jsdom
 *
 * AT-FIX-E3 fix 1: the OrganizationChooser is a VALUE picker. Picking any organization — including
 * the one the person is already working in, and one listed under "Test organizations" — hands it
 * to the host; a row click never toggles a favorite.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ORGS = [
  { id: "org-real", name: "Real Co", slug: "real", settings: {} },
  { id: "org-active", name: "admin's Workspace", slug: "admins-workspace", settings: { test_fixture: true } },
];
jest.mock("@/features/organizations/hooks/usePagedOrganizations", () => ({
  usePagedOrganizations: () => ({ organizations: ORGS, loading: false, error: null, isPartial: false }),
  pagedPickerProps: () => ({}),
}));
jest.mock("@/features/organizations/hooks/useOrganizationsWith", () => ({
  useOrganizationsWith: () => ({ organizations: [] }),
}));

import { OrganizationChooser } from "@/features/organizations/components/OrganizationChooser";

async function openAndPick(name: string) {
  const onChange = jest.fn();
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<OrganizationChooser value={null} onChange={onChange} placeholder="Choose one" />);
  });
  await act(async () => {
    (document.querySelector('[data-testid="organization-chooser"]') as HTMLElement).click();
  });
  const disclosure = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes("Test organizations"));
  if (disclosure && !document.body.textContent?.includes(name)) {
    await act(async () => disclosure.click());
  }
  const row = Array.from(document.querySelectorAll('[role="option"]')).find((b) => b.textContent?.includes(name)) as HTMLElement;
  expect(row).toBeTruthy();
  await act(async () => row.click());
  await act(async () => root.unmount());
  return { onChange };
}

describe("OrganizationChooser", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });
  it("picking a real org hands it to the host", async () => {
    const { onChange } = await openAndPick("Real Co");
    expect(onChange).toHaveBeenCalledWith({ id: "org-real", name: "Real Co", slug: "real" });
  });
  it("picking the active test-fixture org hands it to the host and toggles no favorite", async () => {
    const { onChange } = await openAndPick("admin's Workspace");
    expect(onChange).toHaveBeenCalledWith({ id: "org-active", name: "admin's Workspace", slug: "admins-workspace" });
    expect(document.querySelector('[data-slot="organization-picker-favorite"]')).toBeNull();
  });
});
