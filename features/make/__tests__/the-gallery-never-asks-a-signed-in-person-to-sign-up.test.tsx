/**
 * @jest-environment jsdom
 */
// features/make/__tests__/the-gallery-never-asks-a-signed-in-person-to-sign-up.test.tsx — TEMPLATE-UI-POLISH (2026-10-20).
//
// THE USE CASE. A signed-in member opens aimatrx.com/templates. BEFORE: the header still said "Sign up free" (the page drew
// it for everyone). NOW: a guest reads the link; a signed-in person does not, and the slot keeps its size either way, so
// nothing moves when the answer lands.
// RED on the prior bytes: the signed-in render contains the sign-up link.
import { act } from "react";
import { createRoot } from "react-dom/client";

let signedIn = false;
jest.mock("@/lib/scoped-config/useSignedIn", () => ({ useSignedIn: () => signedIn }));
jest.mock("next/navigation", () => ({ ...jest.requireActual("next/navigation"), useRouter: () => ({ replace: () => undefined, refresh: () => undefined }) }));

import { PublicGalleryPage } from "../gallery/PublicGalleryPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function draw(): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<PublicGalleryPage title="Templates" cards={[]} all={[]} path="/templates" hub state="open" />));
  return host;
}

it("a guest reads Sign up free", async () => {
  signedIn = false;
  const host = await draw();
  expect(host.querySelector("[data-public-templates-signup]")?.textContent).toBe("Sign up free");
});

it("a signed-in person is not asked to sign up, and the slot keeps its fixed size", async () => {
  signedIn = true;
  const host = await draw();
  expect(host.querySelector("[data-public-templates-signup]")).toBeNull();
  expect(host.textContent).not.toContain("Sign up free");
  const slot = host.querySelector("[data-public-templates-signup-slot]");
  expect(slot?.className).toContain("h-9");
  expect(slot?.className).toContain("w-[7.5rem]");
});
