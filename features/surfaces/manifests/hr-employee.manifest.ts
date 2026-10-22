/**
 * Surface manifests — HR employee record.
 *
 * `matrx-user/hr-employee` — one employee's profile (`hr_employee_profile`) as THIS viewer may
 * see it: the header (name, job, department, manager, status) and the personal block the server
 * returned, plus which tab is open. Routes: `/hr/people/[employeeId]/[tab]` and
 * `/hr/people/[employeeId]/c/[tabKey]` (a custom tab; the tab is a value, not a new surface).
 * `/hr/people/[employeeId]` itself only redirects to the default tab.
 *
 * `matrx-user/hr-me` — the same record when it is the person's own (`/hr/me`). Same vocabulary,
 * inherited; its own situation. The name is the one the HR assists already target.
 *
 * Emitter: `SurfaceRuntimeProvider` in `features/hr/people/profile/EmployeeProfile.tsx`
 * (`MyInfoSurface` passes the `hr-me` key).
 *
 * Read-only for now: each tab's edits (Personal, Emergency, Job …) live in that tab's own form
 * state and dialogs; none is lifted to the page yet. Protected fields (SSN, home address, work
 * authorization) are never sent to the agent, even where the viewer may reveal them on screen.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValueGroup,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import type { HrEmployeeProfile } from "@/features/hr/types";
import { compact, hrValue, type HrLoadStatus } from "./hr-surface-kit";

export const HR_EMPLOYEE_SURFACE_NAME = "matrx-user/hr-employee";
export const HR_ME_SURFACE_NAME = "matrx-user/hr-me";

const groups: SurfaceValueGroup[] = [
  { key: "employee", label: "Employee", sortOrder: 100, description: "One employee's record as this viewer sees it." },
];

const values = [
  hrValue("employee_status", "Load status", "string", "employee", 10,
    '"loading", "loaded", "failed", "no_access", or "not_an_employee" (on their own page: they have no employee record here).',
    { alwaysAvailable: true, typicalCharCount: 10 }),
  hrValue("employee_id", "Employee ID", "string", "employee", 20, "The employee record's id.", { typicalCharCount: 36 }),
  hrValue("employee_name", "Name", "string", "employee", 30, "The name shown on the record."),
  hrValue("employee_tab", "Open tab", "string", "employee", 40,
    'The tab on screen: personal, job, compensation, emergency, documents, notes, relations, performance, or "c/<key>" for a custom tab.'),
  hrValue("employee_tabs", "Tabs", "array", "employee", 45, "The tabs this viewer may open, in order.", { typicalCharCount: 120 }),
  hrValue("employee_summary", "Record summary", "object", "employee", 50,
    "The header: { employment_id, employee_number, legal_name, pronouns, status, hire_date, worker_class, job_title, department, location, manager_name, direct_report_count, pending_change_count }.",
    { typicalCharCount: 450 }),
  hrValue("employee_personal", "Personal details", "object", "employee", 60,
    "The personal fields this viewer may see: preferred and legal names, work email and phone, directory opt-out, custom fields. Protected fields (SSN, home address, work authorization) are never included.",
    { typicalCharCount: 400 }),
  hrValue("employee_viewer", "Viewing as", "string", "employee", 70,
    "How this viewer relates to the record (self, manager, hr …); it decides what they see."),
  hrValue("employee_pay_visibility", "Pay visibility", "string", "employee", 80,
    '"full", "band_only" or "none": how much pay this viewer may see on the Compensation tab.'),
  hrValue("employee_as_of", "As of", "string", "employee", 90, "The date the record is read at."),
];

const intro = `<surface_intro>
One employee's HR record, exactly as this viewer may see it. employee_summary and employee_personal hold what is on screen; a field that is absent is not visible to this viewer, which is not the same as empty.
Never guess protected details (SSN, home address, work authorization). Changes are made on the tab's own form by the person; you can explain and draft wording.
</surface_intro>`;

export const hrEmployeeManifest: SurfaceManifest = {
  surfaceName: HR_EMPLOYEE_SURFACE_NAME,
  situation:
    "They are on the HR record of {employee_name|an employee}, {employee_tab|personal} tab, viewing as {employee_viewer|unknown} (page: {employee_status}).",
  inheritsFrom: "matrx-default/human-resources",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "One employee's HR record and the open tab (/hr/people/[employeeId]/[tab]).",
  label: "HR Employee",
  urlPattern: "/hr/people/[employeeId]/[tab]",
  intro,
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), values),
};

export const hrMeManifest: SurfaceManifest = {
  surfaceName: HR_ME_SURFACE_NAME,
  situation:
    "This is their own HR record, {employee_tab|personal} tab: what their employer holds about them (page: {employee_status}).",
  inheritsFrom: HR_EMPLOYEE_SURFACE_NAME,
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "The person's own HR record (/hr/me).",
  label: "HR My info",
  urlPattern: "/hr/me",
  intro,
  groups: [],
  values: [],
};

export function buildHrEmployeeScope(input: {
  status: HrLoadStatus | "not_an_employee";
  employeeId: string | null;
  tab: string | null;
  profile: HrEmployeeProfile | null;
}): SurfaceScopePayload {
  const p = input.profile;
  const h = p?.header;
  const personal = p?.personal;
  return compact({
    employee_status: input.status,
    employee_id: input.employeeId,
    employee_name: h?.display_name ?? null,
    employee_tab: p ? input.tab : null,
    employee_tabs: p?.tabs ?? null,
    employee_summary: h
      ? compact({
          employment_id: h.employment_id,
          employee_number: h.employee_number,
          legal_name: h.legal_name ?? null,
          pronouns: h.pronouns,
          status: h.status,
          hire_date: h.hire_date,
          worker_class: h.worker_class,
          job_title: h.job_title,
          department: h.department,
          location: h.location,
          manager_name: h.manager_name,
          direct_report_count: h.direct_report_count,
          pending_change_count: h.pending_change_count,
        })
      : null,
    employee_personal: personal
      ? compact({
          preferred_first_name: personal.preferred_first_name,
          preferred_last_name: personal.preferred_last_name,
          legal_first_name: personal.legal_first_name,
          legal_middle_name: personal.legal_middle_name,
          legal_last_name: personal.legal_last_name,
          legal_name_suffix: personal.legal_name_suffix,
          pronouns: personal.pronouns,
          work_email: personal.work_email,
          work_phone: personal.work_phone,
          directory_opt_out: personal.directory_opt_out,
          custom: personal.custom && Object.keys(personal.custom).length ? personal.custom : null,
        })
      : null,
    employee_viewer: p?.viewer ?? null,
    employee_pay_visibility: p?.comp_visibility ?? null,
    employee_as_of: p?.as_of ?? null,
  }) as SurfaceScopePayload;
}
