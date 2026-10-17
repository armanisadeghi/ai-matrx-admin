/**
 * `rememberOrganizations` is called from an effect in every `useOrganizationsWith` caller. A bump
 * re-renders every subscriber, so remembering FRESH-BUT-EQUAL objects must not bump (it looped:
 * new array -> effect -> bump -> re-render -> new array). A real change still bumps.
 */
jest.mock("@/features/organizations/service", () => ({ getMyOrganizationsByIds: jest.fn(async () => []) }));
jest.mock("@/features/organizations/service/memberOrganizationRows", () => ({ onMemberOrganizationsForgotten: jest.fn() }));

import { organizationLookupVersion, peekOrganization, rememberOrganizations } from "../organizationLookup";
import type { OrganizationWithRole } from "@/features/organizations/types";

const org = (name: string) => ({ id: "11111111-1111-4111-8111-111111111111", name }) as unknown as OrganizationWithRole;

it("does not bump for an equal copy, and bumps for a real change", () => {
  rememberOrganizations([org("A")]);
  const v = organizationLookupVersion();
  rememberOrganizations([org("A")]);
  rememberOrganizations([org("A")]);
  expect(organizationLookupVersion()).toBe(v);
  rememberOrganizations([org("B")]);
  expect(organizationLookupVersion()).toBe(v + 1);
  expect(peekOrganization(org("A").id)?.name).toBe("B");
});
