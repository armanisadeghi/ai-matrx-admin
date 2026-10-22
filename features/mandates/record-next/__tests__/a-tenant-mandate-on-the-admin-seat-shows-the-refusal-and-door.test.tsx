/**
 * The admin management route serves SYSTEM mandates only (FEATURE.md "THE ADMIN SEAT"). An
 * organization's mandate must show the refusal and the door to Mandate support lookup — never a
 * blank body, even when the owner's name cannot be drawn.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { NotSystemMandateNotice } from "../NotSystemMandateNotice";

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    schema: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { organization_id: "o1", created_by: null }, error: null }),
          }),
        }),
      }),
    }),
  }),
}));
jest.mock("@/features/organizations/hooks/useOrganizationLabel", () => ({ useOrganizationLabel: () => null }));
// The owner's name fails to draw (a missing provider, a throwing chip): the refusal still stands.
jest.mock("@/components/official/entity-ref/EntityRef", () => ({
  EntityRef: () => {
    throw new Error("owner chip cannot draw");
  },
}));
jest.mock("@/features/admin/users/components/AdminUserRef", () => ({ AdminUserRef: () => null }));
jest.mock("@/lib/diagnostics/captureReactError", () => ({ captureReactRenderError: jest.fn() }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));

it("names the refusal and offers the support door even when the owner name cannot draw", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  const container = document.createElement("div");
  await act(async () => {
    createRoot(container).render(
      <NotSystemMandateNotice
        mandateId="c4f4752f-b357-4073-b5d6-84a4479bd762"
        supportHref="/administration/intelligence/mandates/support/c4f4752f-b357-4073-b5d6-84a4479bd762"
        listHref="/administration/intelligence/mandates"
      />,
    );
  });
  spy.mockRestore();
  expect(container.textContent).toContain("Not a system mandate");
  const door = container.querySelector('a[href*="/mandates/support/"]');
  expect(door).not.toBeNull();
});
