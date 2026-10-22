/**
 * Surface manifest — HR employee-relations case (`matrx-user/hr-relations-case`),
 * `/hr/people/relations/[caseId]`.
 *
 * One incident or corrective action (`hr_incident_get` / `hr_corrective_action_get`, opened
 * through the audited read with a justification): what happened, who it is about, its state,
 * the parties, and whether it is voided or under a legal hold.
 *
 * Emitter: `SurfaceRuntimeProvider` in
 * `features/hr/people/relations/components/CaseSurface.tsx`.
 *
 * Read-only for the agent: state changes, notes, OSHA determinations and acknowledgements are
 * audited acts of the investigator or the employee, each in its own panel. Never sent to the
 * agent: restricted note bodies (only their count) and the OSHA medical fields.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValueGroup,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import type { HrCaseDetail } from "@/features/hr/people/relations/types";
import { compact, hrValue, type HrLoadStatus } from "./hr-surface-kit";

export const HR_RELATIONS_CASE_SURFACE_NAME = "matrx-user/hr-relations-case";

const groups: SurfaceValueGroup[] = [
  { key: "case", label: "Case", sortOrder: 100, description: "One employee-relations case." },
];

const values = [
  hrValue("case_status", "Load status", "string", "case", 10,
    '"loading", "loaded", "failed" or "no_access".', { alwaysAvailable: true, typicalCharCount: 10 }),
  hrValue("case_id", "Case ID", "string", "case", 20, "The case's id.", { alwaysAvailable: true, typicalCharCount: 36 }),
  hrValue("case_kind", "Case kind", "string", "case", 30, '"incident" or "corrective_action".'),
  hrValue("case_title", "Case", "string", "case", 35, "What the page calls it: the incident kind, or Corrective action."),
  hrValue("case_subject", "About", "string", "case", 40, "The employee the case is about, when this viewer may see the name."),
  hrValue("case_state", "State", "string", "case", 50, "Where the case is (open, investigating, resolved …)."),
  hrValue("case_summary", "What happened", "string", "case", 60,
    "The case summary as written.", { typicalCharCount: 600, inlineUpTo: 4000 }),
  hrValue("case_details", "Case details", "object", "case", 70,
    "The case record's own fields as shown: for an incident { occurred_at, reported_at, reported_anonymously, osha_recordable, follow_up_on, resolution_summary, resolved_at }; for a corrective action { level, issued_on, incident_on, policy_cited, expected_improvement, consequence_if_unmet, follow_up_on, follow_up_outcome, employee_acknowledged_at, employee_statement, outcome, outcome_on }.",
    { typicalCharCount: 700 }),
  hrValue("case_parties", "People involved", "array", "case", 80,
    "Incident parties: { role, name, interviewed_at }.", { typicalCharCount: 300 }),
  hrValue("case_flags", "Holds and voids", "object", "case", 90,
    "{ voided, void_reason, legal_hold (nothing may be disposed of while true) }."),
  hrValue("case_viewer_role", "Viewing as", "string", "case", 100,
    "How this viewer relates to the case: investigator, issuer, reporter, subject or hr."),
  hrValue("case_restricted_note_count", "Restricted notes", "number", "case", 110,
    "How many restricted notes are on the case (their text is never sent here)."),
];

export const hrRelationsCaseManifest: SurfaceManifest = {
  surfaceName: HR_RELATIONS_CASE_SURFACE_NAME,
  situation:
    "They are working an employee-relations case: {case_title|a case} about {case_subject|an employee}, state {case_state|unknown}, as {case_viewer_role|a viewer} (page: {case_status}). It is a confidential, audited record.",
  inheritsFrom: "matrx-default/human-resources",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "One employee-relations case: incident or corrective action (/hr/people/relations/[caseId]).",
  label: "HR Relations case",
  urlPattern: "/hr/people/relations/[caseId]",
  intro: `<surface_intro>
A confidential employee-relations case. Help the investigator think: summarize, list open questions, draft wording for notes or letters for them to paste.
You cannot change the case; every change is an audited act in its own panel. Never guess the reporter of an anonymous report or the contents of restricted notes.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), values),
};

export function buildHrRelationsCaseScope(input: {
  status: HrLoadStatus;
  caseId: string;
  caseKind: string | null;
  title: string | null;
  detail: HrCaseDetail | null;
}): SurfaceScopePayload {
  const d = input.detail;
  const incident = d?.incident;
  const action = d?.corrective_action;
  const legalHold = (incident?.legal_hold_count ?? action?.legal_hold_count ?? 0) > 0;
  return compact({
    case_status: input.status,
    case_id: input.caseId,
    case_kind: d ? input.caseKind : null,
    case_title: d ? input.title : null,
    case_subject: incident?.subject_name ?? action?.subject_name ?? null,
    case_state: incident?.state ?? action?.state ?? null,
    case_summary: incident?.summary ?? action?.summary ?? null,
    case_details: incident
      ? compact({
          occurred_at: incident.occurred_at,
          reported_at: incident.reported_at,
          reported_anonymously: incident.reported_anonymously,
          osha_recordable: incident.osha_recordable,
          follow_up_on: incident.follow_up_on,
          resolution_summary: incident.resolution_summary,
          resolved_at: incident.resolved_at,
        })
      : action
        ? compact({
            level: action.level,
            issued_on: action.issued_on,
            incident_on: action.incident_on,
            policy_cited: action.policy_cited,
            expected_improvement: action.expected_improvement,
            consequence_if_unmet: action.consequence_if_unmet,
            follow_up_on: action.follow_up_on,
            follow_up_outcome: action.follow_up_outcome,
            employee_acknowledged_at: action.employee_acknowledged_at,
            employee_statement: action.employee_statement,
            outcome: action.outcome,
            outcome_on: action.outcome_on,
          })
        : null,
    case_parties: d?.parties?.length
      ? d.parties.map((p) =>
          compact({ role: p.role, name: p.display_name ?? p.external_name ?? null, interviewed_at: p.interviewed_at }),
        )
      : null,
    case_flags: d
      ? compact({
          voided: Boolean(incident?.voided_at),
          void_reason: incident?.void_reason ?? null,
          legal_hold: legalHold,
        })
      : null,
    case_viewer_role: d?.viewer_role ?? null,
    case_restricted_note_count: d ? (d.restricted_notes?.length ?? 0) : null,
  }) as SurfaceScopePayload;
}
