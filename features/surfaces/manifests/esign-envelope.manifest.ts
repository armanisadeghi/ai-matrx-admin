/**
 * Surface manifest — one e-signature envelope (`matrx-user/esign-envelope`), routes `/esign/new` and
 * `/esign/[envelopeId]`.
 *
 * Two emitters, one key:
 *   - a DRAFT (and `/esign/new`): `EsignEditor` (`features/esign/editor/components/EsignEditor.tsx`),
 *     scope built by the pure `buildEsignEditorScope` in `features/esign/editor/agent-writes.ts`;
 *     editable through the write targets below.
 *   - a SENT envelope: `EnvelopeDetail` (`features/esign/envelopes/EnvelopeDetail.tsx`), read-only
 *     (`editor_mode: "sent"`, recipients carry their signing status).
 *
 * Write targets (draft only; each goes through the editor's undoable `edit`, which syncs the draft
 * to the server like typing): the three text fields (patchable) and the recipient list.
 * NOT writable, on purpose: Send (outward, under the person's name), access codes (a secret the person
 * types), documents (files are picked by the person), field placement on the page, void / resend.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const ESIGN_ENVELOPE_SURFACE_NAME = "matrx-user/esign-envelope";

export const ESIGN_GROUPS: SurfaceValueGroup[] = [
  { key: "esign_envelope", label: "Envelope", sortOrder: 100, description: "Title, email subject, message and status." },
  { key: "esign_people", label: "Recipients", sortOrder: 200, description: "Who signs, views or gets a copy." },
  { key: "esign_documents", label: "Documents and fields", sortOrder: 300, description: "The documents and how many fields are placed." },
];

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  group: string,
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  autoContext: true,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group,
  sortOrder,
  ...extra,
});

/** Values both editor modes show (the template editor reuses them). */
export const ESIGN_COMPOSITION_VALUES: SurfaceValue[] = [
  v("editor_mode", "Page mode", "string", "esign_envelope", 100, '"envelope" (a draft being prepared), "sent" (a sent envelope, read-only) or "template".', {
    alwaysAvailable: true,
    typicalCharCount: 8,
  }),
  v("envelope_title", "Title", "string", "esign_envelope", 120, "The envelope title (up to 300 characters)."),
  v("email_subject", "Email subject", "string", "esign_envelope", 130, 'The email subject recipients get (defaults to "Please sign: <title>").', { typicalCharCount: 60 }),
  v("envelope_message", "Message", "string", "esign_envelope", 140, "The message in the email (up to 4000 characters).", { typicalCharCount: 400, inlineUpTo: 4000 }),
  v("signing_order", "Signing order", "string", "esign_envelope", 150, '"sequential" (in order) or "parallel" (all at once).', { autoContext: false, typicalCharCount: 10 }),
  v("expires_in_days", "Expires after (days)", "number", "esign_envelope", 160, "Days after sending before the envelope expires (draft and template only).", { autoContext: false }),
  v(
    "recipients",
    "Recipients",
    "array",
    "esign_people",
    200,
    'Everyone on it: { key (the id update/delete use), role ("signer" | "viewer" | "cc_recipient"), order (routing step), full_name, email, is_member, company, job_title, private_message, verification, template_role, field_count }. On a sent envelope: { key, role, full_name, email, status, is_member }.',
    { typicalCharCount: 900, inlineUpTo: 4000 },
  ),
  v("documents", "Documents", "array", "esign_documents", 300, "The documents: { key, name, page_count }.", { typicalCharCount: 200 }),
  v("field_count", "Fields placed", "number", "esign_documents", 310, "How many fields are placed across the documents.", { autoContext: false }),
  v("send_blockers", "What stops Send", "array", "esign_envelope", 170, "Every reason Send is refused right now, in the page's words. Empty = ready.", { typicalCharCount: 120 }),
  v("send_warnings", "Warnings", "array", "esign_envelope", 180, "Soft warnings before Send (e.g. a signer with no signature field); none blocks.", { typicalCharCount: 120 }),
];

const surfaceSpecific: SurfaceValue[] = [
  v("envelope_id", "Envelope ID", "string", "esign_envelope", 105, "UUID of the envelope; null on /esign/new until the draft is first kept.", { typicalCharCount: 36 }),
  v("envelope_status", "Status", "string", "esign_envelope", 110, '"draft", or once sent: "sent", "delivered", "completed", "declined", "voided", "expired".', { typicalCharCount: 9 }),
  v("draft_save_state", "Draft save state", "string", "esign_envelope", 190, "Whether the draft is saved to the server (draft only).", { autoContext: false, typicalCharCount: 8 }),
  v("sent_at", "Sent", "string", "esign_envelope", 191, "When it was sent (sent envelope only).", { autoContext: false, typicalCharCount: 25 }),
  v("expires_at", "Expires", "string", "esign_envelope", 192, "When it expires (sent envelope only).", { autoContext: false, typicalCharCount: 25 }),
  v("completed_at", "Completed", "string", "esign_envelope", 193, "When everyone finished (sent envelope only).", { autoContext: false, typicalCharCount: 25 }),
  v("void_reason", "Void reason", "string", "esign_envelope", 194, "Why it was voided, when it was.", { autoContext: false }),
];

const textTarget = (
  name: "envelope_title" | "email_subject" | "envelope_message",
  label: string,
  limit: number,
  sortOrder: number,
): SurfaceWriteTarget => ({
  name,
  label,
  description: `Fill in the ${label.toLowerCase().replace(/^(set|write) the /, "")} of the draft (up to ${limit} characters${name === "envelope_message" ? "" : ", one line"}). It lands in the editor and the draft keeps it; NOTHING is sent until the person presses Send. Refused on a sent envelope.`,
  valueType: "string",
  mode: "draft",
  applyPolicy: "ask",
  updatesValue: name,
  patchable: true,
  group: "esign_envelope",
  sortOrder,
});

export const ESIGN_WRITE_TARGETS: SurfaceWriteTarget[] = [
  textTarget("envelope_title", "Set the title", 300, 400),
  textTarget("email_subject", "Set the email subject", 200, 410),
  textTarget("envelope_message", "Write the message", 4000, 420),
  {
    name: "create_recipients",
    label: "Add recipients",
    description:
      'Add people to the draft. Lands in the editor (undoable); nothing is sent. Value is a JSON ARRAY of 1-20 objects, each { "full_name": string (required), "email": valid email (required), "role"?: "signer" (default) | "viewer" | "cc_recipient", "company"?: string, "job_title"?: string, "private_message"?: string up to 2000 }. They are added at the end of the signing order. Refused (nothing changes): a missing name or bad email, an unknown field, a "key" (use update_recipients), more than 20 recipients in total. Returns each new recipient with its key.',
    valueType: "array",
    mode: "draft",
    applyPolicy: "ask",
    updatesValue: "recipients",
    group: "esign_people",
    sortOrder: 500,
  },
  {
    name: "update_recipients",
    label: "Change recipients",
    description:
      'Change people already on the draft. Value is a JSON ARRAY of objects, each { "key": a key from recipients, plus only the fields to change: full_name, email, role, company, job_title, private_message }. Refused (nothing changes): an unknown key, a key twice, nothing to change, an unknown field, a bad email.',
    valueType: "array",
    mode: "draft",
    applyPolicy: "ask",
    updatesValue: "recipients",
    group: "esign_people",
    sortOrder: 510,
  },
  {
    name: "delete_recipients",
    label: "Remove recipients",
    description:
      'Remove people from the draft. Value is a JSON ARRAY of recipient keys. LOST with each person: every field placed for them on the documents (the person can undo). Refused: an unknown key or a key twice.',
    valueType: "array",
    mode: "draft",
    applyPolicy: "ask",
    updatesValue: "recipients",
    group: "esign_people",
    sortOrder: 520,
  },
];

const declared: Omit<SurfaceManifest, "readiness"> = {
  surfaceName: ESIGN_ENVELOPE_SURFACE_NAME,
  situation:
    "They have the e-signature envelope {envelope_title|a new envelope} open ({envelope_status|draft}). On a draft you can fill in its title, subject and message and add or change recipients; only the person sends it.",
  inheritsFrom: "matrx-default/content",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "E-signature envelope",
  description: "One envelope: its documents, recipients, message and status — editable while a draft.",
  urlPattern: "/esign/[envelopeId]",
  groups: ESIGN_GROUPS,
  values: mergeBaselineValues(pickBaseline("selection"), [...ESIGN_COMPOSITION_VALUES, ...surfaceSpecific]),
  writeTargets: ESIGN_WRITE_TARGETS,
};

/** No typed `readiness` (D2: earned, never typed). The installed `@ai-matrx/chat` type still
 * requires the key until the D2 package change ships, hence the one cast. */
export const esignEnvelopeManifest = declared as SurfaceManifest;

export function createEsignEnvelopeScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
