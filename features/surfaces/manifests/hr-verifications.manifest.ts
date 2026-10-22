/**
 * Surface manifest — HR verification letters (`matrx-user/hr-verifications`),
 * `/hr/people/verifications`.
 *
 * Employment and income verification requests across the employers in view
 * (`hr_verification_letters`): who asked, about whom, what kind, consent, and where each
 * letter is (requested, generated, delivered, denied).
 *
 * Emitter: `SurfaceRuntimeProvider` in
 * `features/hr/people/verifications/components/VerificationsSurface.tsx`.
 *
 * Read-only for the agent: generating or delivering a letter is an assertion the organization
 * is held to, made by HR through the row's own controls. Requester email is not sent.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValueGroup,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import type { HrVerificationLetterRow } from "@/features/hr/people/verifications/types";
import { compact, hrValue, type HrLoadStatus } from "./hr-surface-kit";

export const HR_VERIFICATIONS_SURFACE_NAME = "matrx-user/hr-verifications";

const groups: SurfaceValueGroup[] = [
  { key: "letters", label: "Verification letters", sortOrder: 100, description: "Verification requests and letters." },
];

const values = [
  hrValue("verifications_status", "Load status", "string", "letters", 10,
    '"loading", "loaded", "failed" or "no_access".', { alwaysAvailable: true, typicalCharCount: 10 }),
  hrValue("verification_count", "Requests", "number", "letters", 20, "How many verification requests are listed."),
  hrValue("verification_requests", "Verification requests", "array", "letters", 30,
    "Every request listed (first 100): { id, employer, employee, kind, includes_compensation, state, source, requester, requester_organization, requested_at, consent_at (null = the employee has not consented yet), generated_at, delivered_at, delivery_method, denial_basis, expires_at }.",
    { typicalCharCount: 3000 }),
  hrValue("verification_unavailable_employers", "Employers not shown", "array", "letters", 40,
    "Employers whose letters could not be read for this viewer.", { typicalCharCount: 120 }),
  hrValue("verification_selected", "Clicked request", "string", "letters", 50,
    "The id of the request the person last right-clicked, when there is one."),
];

export const hrVerificationsManifest: SurfaceManifest = {
  surfaceName: HR_VERIFICATIONS_SURFACE_NAME,
  situation:
    "They are on the verification letters page: {verification_count|no} employment and income verification requests (page: {verifications_status}). Letters are generated and delivered by HR from each row.",
  inheritsFrom: "matrx-default/human-resources",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "Employment and income verification requests and letters (/hr/people/verifications).",
  label: "HR Verification letters",
  urlPattern: "/hr/people/verifications",
  intro: `<surface_intro>
Verification requests from lenders, landlords and agencies. A letter that includes pay needs the employee's consent first (consent_at); say who they are waiting on.
You cannot generate, deliver or deny a letter; HR does that from the row.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), values),
};

export function buildHrVerificationsScope(input: {
  status: HrLoadStatus;
  rows: (HrVerificationLetterRow & { employer: { name: string | null } })[] | null;
  unavailable: { employer: { name: string } }[];
  selectedId: string | null;
}): SurfaceScopePayload {
  const rows = input.rows;
  return compact({
    verifications_status: input.status,
    verification_count: rows ? rows.length : null,
    verification_requests: rows
      ? rows.slice(0, 100).map((r) =>
          compact({
            id: r.id,
            employer: r.employer.name,
            employee: r.subject_name,
            kind: r.verification_kind,
            includes_compensation: r.includes_compensation,
            state: r.state,
            source: r.request_source,
            requester: r.requester_name,
            requester_organization: r.requester_organization,
            requested_at: r.requested_at,
            consent_at: r.employee_consent_at ?? (r.includes_compensation ? "not given" : null),
            generated_at: r.generated_at,
            delivered_at: r.delivered_at,
            delivery_method: r.delivery_method,
            denial_basis: r.denial_basis ?? r.metadata?.denial_basis ?? null,
            expires_at: r.expires_at,
          }),
        )
      : null,
    verification_unavailable_employers: input.unavailable.length
      ? input.unavailable.map((u) => u.employer.name)
      : null,
    verification_selected: input.selectedId,
  }) as SurfaceScopePayload;
}
