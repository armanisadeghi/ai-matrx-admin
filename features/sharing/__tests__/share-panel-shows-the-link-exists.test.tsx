/**
 * After a link exists the panel says so: header "Link is on", the button becomes "New link", and the row
 * carries copy and turn-off controls. Q-14: the dialog kept saying "Create link" with a link already made.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const link = { id: "l1", token: "t1", shortToken: null, permissionLevel: "viewer", label: null, expiresAt: null, maxUses: null, useCount: 0, isActive: true, createdAt: null, lastUsedAt: null };
jest.mock("@/utils/permissions/shareLinks", () => ({
  createShareLink: async () => ({ success: true }),
  listShareLinks: async () => [link],
  revokeShareLink: async () => ({ success: true }),
  shareUrlForLink: () => "http://x/r/abc",
}));
jest.mock("@/features/sharing/hooks/useShare", () => ({
  useShare: () => ({ share: jest.fn(), copy: jest.fn(async () => "copied"), fallbackDialog: null }),
}));
jest.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/components/ui/confirm-dialog", () => ({ ConfirmDialog: () => null }));

import { ShareLinkPanel } from "../components/ShareLinkPanel";

it("an existing link shows as on, with copy and turn-off controls, not 'Create link'", async () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<ShareLinkPanel resourceType="workbook" resourceId="w1" isOwner />);
  });
  const text = host.textContent ?? "";
  expect(text).toContain("Link is on");
  expect(text).not.toContain("Create link");
  expect(host.querySelector('[aria-label="Copy share link"]')).toBeTruthy();
  expect(host.querySelector('[aria-label="Turn off share link"]')).toBeTruthy();
  act(() => root.unmount());
});
