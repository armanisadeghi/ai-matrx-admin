/**
 * Two clicks on "Create link" in one frame make ONE link (a reviewer saw two links and two "Link copied"
 * toasts from a single click). Proven failing first: with the guard on the `creating` STATE both clicks
 * read it before React re-renders the disabled button, and createShareLink runs twice.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const createShareLink = jest.fn(async () => {
  await new Promise((r) => setTimeout(r, 20));
  return { success: true, url: "http://x/r/abc", token: "t1" };
});
jest.mock("@/utils/permissions/shareLinks", () => ({
  createShareLink: (...a: unknown[]) => (createShareLink as (...x: unknown[]) => unknown)(...a),
  listShareLinks: async () => [],
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

it("two quick clicks create one link", async () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<ShareLinkPanel resourceType="workbook" resourceId="w1" isOwner />);
  });
  const button = [...host.querySelectorAll("button")].find((b) => /Create link/.test(b.textContent ?? ""))!;
  expect(button).toBeTruthy();
  await act(async () => {
    button.click();
    button.click();
    await new Promise((r) => setTimeout(r, 80));
  });
  expect(createShareLink).toHaveBeenCalledTimes(1);
  act(() => root.unmount());
});
