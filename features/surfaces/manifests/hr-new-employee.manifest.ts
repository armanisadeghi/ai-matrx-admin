/**
 * Surface manifest — HR new employee (`matrx-user/hr-new-employee`), `/hr/people/new`.
 *
 * The hire form: how the person is being added (new, an existing platform member, a CRM
 * contact, a candidate), every field as typed so far, what still stops Save, and the
 * employer's structure the pickers offer (job titles, departments, locations, pay groups).
 *
 * Emitter: `SurfaceRuntimeProvider` in `features/hr/people/new/HrNewEmployee.tsx`.
 *
 * Write target: `new_employee_draft` fills the form for the person to review. NOTHING is
 * created until they press the form's own create button (duplicate and rehire checks run
 * there). Never writable and never sent: the SSN (the person types it), and the member / CRM
 * contact links (chosen in their own pickers).
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import { compact, hrValue } from "./hr-surface-kit";

export const HR_NEW_EMPLOYEE_SURFACE_NAME = "matrx-user/hr-new-employee";

const groups: SurfaceValueGroup[] = [
  { key: "hire", label: "New employee", sortOrder: 100, description: "The hire form as typed." },
];

/** The form fields an agent may see and fill. Never the SSN or the link ids. */
export const NEW_EMPLOYEE_DRAFT_FIELDS = [
  "legal_first_name",
  "legal_last_name",
  "preferred_first_name",
  "work_email",
  "work_phone",
  "hire_date",
  "worker_class",
  "pay_group_id",
  "job_title_id",
  "department_id",
  "location_id",
  "flsa_status",
  "flsa_exemption_basis",
  "fte",
  "standard_hours_per_week",
  "pay_basis",
  "compensation_amount",
] as const;
type DraftField = (typeof NEW_EMPLOYEE_DRAFT_FIELDS)[number];
export type NewEmployeeDraftForm = Record<DraftField, string>;

export interface NewEmployeeStructure {
  jobTitles: { id: string; title: string }[];
  departments: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  payGroups: { id: string; name: string }[];
  workerClasses: readonly string[];
}

const values = [
  hrValue("hire_status", "Form status", "string", "hire", 10,
    '"choosing" (picking how to add the person), "editing", "created", or "no_access".',
    { alwaysAvailable: true, typicalCharCount: 10 }),
  hrValue("hire_mode", "How they are added", "string", "hire", 20,
    '"new-person", "link-member" (already on the platform), "link-party" (already in the CRM) or "convert-candidate".'),
  hrValue("hire_form", "Form as typed", "object", "hire", 30,
    `The form as it stands, unsaved: { ${NEW_EMPLOYEE_DRAFT_FIELDS.join(", ")} } with the chosen job title, department, location and pay group also by name. The SSN box is never included.`,
    { typicalCharCount: 700 }),
  hrValue("hire_problems", "What stops Save", "array", "hire", 40,
    "Every reason the form cannot be saved yet, in the page's words. Empty when it can be saved.", { typicalCharCount: 200 }),
  hrValue("hire_choices", "Picker choices", "object", "hire", 50,
    "What the pickers offer at this employer: { job_titles: [{id, title}], departments: [{id, name}], locations: [{id, name}], pay_groups: [{id, name}], worker_classes, flsa_statuses, pay_bases }.",
    { typicalCharCount: 1500, autoContext: false }),
  hrValue("hire_created_employee_id", "Created employee", "string", "hire", 60,
    "The new employee's id once the form has been saved."),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "new_employee_draft",
    label: "Fill the new-employee form",
    description:
      'Fill the hire form for the person to review. NOTHING is created until they press the create button. Value: an object with any of: legal_first_name, legal_last_name, preferred_first_name, work_email, work_phone, hire_date ("YYYY-MM-DD"), worker_class (one of hire_choices.worker_classes), job_title, department, location, pay_group (each an id or the exact name/title from hire_choices), flsa_status ("exempt" | "nonexempt"), flsa_exemption_basis, fte (0-2), standard_hours_per_week, pay_basis ("hourly" | "salary" | "daily" | "piece"), compensation_amount. Only the keys you send change. When no way of adding is chosen yet, the form opens as "Add someone new". Refused: an "ssn" key, an unknown field, a name not in hire_choices, a bad date or fte.',
    valueType: "object",
    mode: "draft",
    applyPolicy: "ask",
    updatesValue: "hire_form",
    group: "hire",
    sortOrder: 100,
  },
];

export const hrNewEmployeeManifest: SurfaceManifest = {
  surfaceName: HR_NEW_EMPLOYEE_SURFACE_NAME,
  situation:
    "They are adding a new employee ({hire_mode|choosing how}); the form is {hire_status} and nothing is saved until they press create. You can fill the form for them to review.",
  inheritsFrom: "matrx-default/human-resources",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "The hire form for a new employee (/hr/people/new).",
  label: "HR New employee",
  urlPattern: "/hr/people/new",
  intro: `<surface_intro>
The person is filling in a new hire. hire_form is what they typed; hire_problems is what still stops Save.
- To fill fields, use new_employee_draft with names or ids from hire_choices. It fills the form; they review and press create.
- Never ask for or send the SSN; they type it themselves.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), values),
  writeTargets,
};

export function buildHrNewEmployeeScope(input: {
  granted: boolean;
  mode: string | null;
  createdEmployeeId: string | null;
  form: NewEmployeeDraftForm;
  problems: { sentence: string }[];
  structure: NewEmployeeStructure;
}): SurfaceScopePayload {
  const s = input.structure;
  const status = !input.granted
    ? "no_access"
    : input.createdEmployeeId
      ? "created"
      : input.mode === null
        ? "choosing"
        : "editing";
  const form: Record<string, unknown> = {};
  for (const key of NEW_EMPLOYEE_DRAFT_FIELDS) form[key] = input.form[key];
  form.job_title = s.jobTitles.find((t) => t.id === input.form.job_title_id)?.title ?? null;
  form.department = s.departments.find((d) => d.id === input.form.department_id)?.name ?? null;
  form.location = s.locations.find((l) => l.id === input.form.location_id)?.name ?? null;
  form.pay_group = s.payGroups.find((g) => g.id === input.form.pay_group_id)?.name ?? null;
  return compact({
    hire_status: status,
    hire_mode: input.mode,
    hire_form: status === "editing" ? compact(form) : null,
    hire_problems: status === "editing" ? input.problems.map((p) => p.sentence) : null,
    hire_choices: input.granted
      ? {
          job_titles: s.jobTitles.map((t) => ({ id: t.id, title: t.title })),
          departments: s.departments.map((d) => ({ id: d.id, name: d.name })),
          locations: s.locations.map((l) => ({ id: l.id, name: l.name })),
          pay_groups: s.payGroups.map((g) => ({ id: g.id, name: g.name })),
          worker_classes: s.workerClasses,
          flsa_statuses: ["nonexempt", "exempt"],
          pay_bases: ["hourly", "salary", "daily", "piece"],
        }
      : null,
    hire_created_employee_id: input.createdEmployeeId,
  }) as SurfaceScopePayload;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const TEXT_FIELDS = new Set<string>([
  "legal_first_name",
  "legal_last_name",
  "preferred_first_name",
  "work_email",
  "work_phone",
  "flsa_exemption_basis",
  "standard_hours_per_week",
  "compensation_amount",
]);

/** Merges an agent's fill into the form. Throws the refusal sentence on anything it cannot place. */
export function mergeNewEmployeeDraft(
  form: NewEmployeeDraftForm,
  value: unknown,
  structure: NewEmployeeStructure,
  refuse: (message: string) => never,
): NewEmployeeDraftForm {
  if (!value || typeof value !== "object" || Array.isArray(value)) refuse("Send a JSON object of form fields.");
  const next: NewEmployeeDraftForm = { ...form };
  const pick = <T extends { id: string }>(list: T[], ref: unknown, label: (t: T) => string, what: string): string => {
    const wanted = String(ref ?? "").trim().toLowerCase();
    const hit = list.find((t) => t.id === ref || label(t).toLowerCase() === wanted);
    if (!hit) refuse(`${what} "${String(ref)}" is not one of this employer's choices in hire_choices.`);
    return hit.id;
  };
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (key === "ssn") refuse("The SSN is never filled by an assistant; the person types it.");
    const text = raw === null || raw === undefined ? "" : String(raw);
    if (TEXT_FIELDS.has(key)) {
      next[key as DraftField] = text;
    } else if (key === "hire_date") {
      if (text && !ISO_DAY.test(text)) refuse('hire_date must be a date like "2026-11-03".');
      next.hire_date = text;
    } else if (key === "worker_class") {
      if (!structure.workerClasses.includes(text)) refuse(`worker_class must be one of: ${structure.workerClasses.join(", ")}.`);
      next.worker_class = text;
    } else if (key === "flsa_status") {
      if (text !== "exempt" && text !== "nonexempt") refuse('flsa_status must be "exempt" or "nonexempt".');
      next.flsa_status = text;
    } else if (key === "pay_basis") {
      if (!["hourly", "salary", "daily", "piece"].includes(text)) refuse('pay_basis must be "hourly", "salary", "daily" or "piece".');
      next.pay_basis = text;
    } else if (key === "fte") {
      const n = Number(text);
      if (!Number.isFinite(n) || n <= 0 || n > 2) refuse("fte must be more than 0 and no more than 2.");
      next.fte = text;
    } else if (key === "job_title" || key === "job_title_id") {
      next.job_title_id = pick(structure.jobTitles, raw, (t) => t.title, "Job title");
    } else if (key === "department" || key === "department_id") {
      next.department_id = pick(structure.departments, raw, (d) => d.name, "Department");
    } else if (key === "location" || key === "location_id") {
      next.location_id = pick(structure.locations, raw, (l) => l.name, "Location");
    } else if (key === "pay_group" || key === "pay_group_id") {
      next.pay_group_id = pick(structure.payGroups, raw, (g) => g.name, "Pay group");
    } else {
      refuse(`"${key}" is not a field this form takes from an assistant.`);
    }
  }
  return next;
}
