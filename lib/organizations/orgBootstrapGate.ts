// lib/organizations/orgBootstrapGate.ts
//
// This tab's single "has the organization question been answered yet?" gate.
// The logic (settle once, bounded wait, never rejects) is the package's
// `createOrganizationBootstrapGate`; this file only owns the one instance and
// keeps the names the boot path and writers already import.
// Law: common-docs/policies/context-is-carried-never-rebuilt.md.

import {
  createOrganizationBootstrapGate,
  ORGANIZATION_RESOLUTION_TIMEOUT_MS,
} from "@ai-matrx/auth/organizations";

/** How long a write may wait for the boot answer before refusing anyway. */
export const RESOLUTION_TIMEOUT_MS = ORGANIZATION_RESOLUTION_TIMEOUT_MS;

const gate = createOrganizationBootstrapGate();

export const isOrgBootstrapResolved = (): boolean => gate.isResolved();
export const markOrgBootstrapResolved = (): void => gate.markResolved();
export const whenOrgBootstrapResolved = (timeoutMs?: number): Promise<void> =>
  gate.whenResolved(timeoutMs);
/** Reset the gate. For tests and in-place auth swaps only. */
export const resetOrgBootstrapGate = (): void => gate.reset();
