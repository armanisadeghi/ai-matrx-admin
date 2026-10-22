/**
 * Surface manifests — the client portal (`app/(portal)/portal/c/[slug]/**`).
 *
 * A client of a business follows the business's link, signs in, and sees HER records only: her
 * jobs and invoices, the forms she may send, and one record with its messages. She is a SIGNED-IN
 * person with no organization of her own here (`app/(portal)/layout.tsx`), so the parent is not
 * `matrx-default/public-web` (no signed-in person) but the Data module: a portal is the external
 * lane of an organization's custom-data store (`custom.portal_*`). The module's organization
 * values are empty for her, which they already say ("empty in their personal workspace").
 *
 * Emitter: `PortalSurfaceRuntime` (`features/portals/`), handed the values the Server Component
 * pages already rendered. Only the record page writes: a field the portal lets her change and a
 * message, through the page's own server actions. Paying stays her button (a checkout), sending a
 * form stays her press, and nothing reaches another client's records.
 */

import type { SurfaceManifest, SurfaceValue, SurfaceValueGroup, SurfaceWriteTarget } from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const CLIENT_PORTAL_SURFACE_NAME = "matrx-public/client-portal";
export const CLIENT_PORTAL_FORM_SURFACE_NAME = "matrx-public/client-portal-form";
export const CLIENT_PORTAL_RECORD_SURFACE_NAME = "matrx-public/client-portal-record";

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
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group,
  sortOrder,
  ...extra,
});

const portalGroup: SurfaceValueGroup = {
  key: "portal_identity",
  label: "Portal",
  sortOrder: 100,
  description: "Whose portal this is and who is looking.",
};

/** The values every portal page shows: which portal, whose business, who she is, her access. */
const portalValues: SurfaceValue[] = [
  v("portal_slug", "Portal address", "string", portalGroup.key, 100, "The portal's slug, as in /portal/c/<slug>.", {
    alwaysAvailable: true,
    typicalCharCount: 30,
  }),
  v("portal_title", "Portal title", "string", portalGroup.key, 110, "The portal's title as the business named it."),
  v("business_name", "Business", "string", portalGroup.key, 120, "The business whose portal this is (its own name or brand)."),
  v(
    "portal_access",
    "Access",
    "string",
    portalGroup.key,
    130,
    '"client" (signed in and on this portal), "signed_out" (the sign-in panel is shown), "not_on_portal" (signed in as an address the business did not invite) or "unavailable" (the business switched its store off; the page shows its sentence).',
    { alwaysAvailable: true, typicalCharCount: 12 },
  ),
  v("client_name", "Client", "string", portalGroup.key, 140, "Who she is to the business (the client record's name). Empty unless access is client."),
];

const portalGroups = [portalGroup];

// ── /portal/c/[slug] ───────────────────────────────────────────────────────

const homeGroup: SurfaceValueGroup = { key: "portal_home", label: "Her portal", sortOrder: 200, description: "What the business shares with her." };

const homeValues: SurfaceValue[] = [
  ...portalValues,
  v("unavailable_message", "Store message", "string", homeGroup.key, 200, "The business's sentence when the portal is unavailable."),
  v("portal_forms", "Forms", "array", homeGroup.key, 210, "The forms she can send, in order: { form_id, label }."),
  v(
    "portal_tables",
    "Her records",
    "array",
    homeGroup.key,
    220,
    "Each shared list: { table_id, name, record_count, records: [{ id, headline, details: { field label: value } }] }. Only her own records; a search narrows them.",
    { typicalCharCount: 2000 },
  ),
  v("search_text", "Search", "string", homeGroup.key, 230, "What she searched for (?q=); empty when not searching."),
  v("search_match_count", "Matches", "number", homeGroup.key, 240, "How many of her records match the search."),
];

const homeDeclared: Omit<SurfaceManifest, "readiness"> = {
  surfaceName: CLIENT_PORTAL_SURFACE_NAME,
  situation:
    "They are a client of {business_name|a business} on its portal {portal_title|for clients} (access: {portal_access|loading}), seeing only their own records as {client_name|a visitor}. Nothing is changed from this page.",
  inheritsFrom: "matrx-default/data",
  client: "matrx-public",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Client portal",
  description: "A business's client portal: the forms she can send and her own records.",
  urlPattern: "/portal/c/[slug]",
  groups: [...portalGroups, homeGroup],
  values: homeValues,
  skipBaselineValues: true,
};

/** No typed `readiness` (D2: earned, never typed); the installed type still requires the key. */
export const clientPortalManifest = homeDeclared as SurfaceManifest;

// ── /portal/c/[slug]/f/[formId] ────────────────────────────────────────────

const formGroup: SurfaceValueGroup = { key: "portal_form", label: "Form", sortOrder: 200, description: "The form she is filling in." };

const formValues: SurfaceValue[] = [
  ...portalValues,
  v("form_id", "Form ID", "string", formGroup.key, 200, "UUID of the form (from the address).", { alwaysAvailable: true, typicalCharCount: 36 }),
  v("form_title", "Form", "string", formGroup.key, 210, "The form's label as she sees it."),
  v(
    "form_state",
    "Form state",
    "string",
    formGroup.key,
    220,
    '"open" (she can fill it in), "closed" or "full" (not taking answers), "refused" (not open to her) or "sign_in" (she must sign in first).',
    { alwaysAvailable: true, typicalCharCount: 8 },
  ),
  v("form_message", "Form message", "string", formGroup.key, 230, "The sentence shown instead of the form when it is not open."),
  v("form_intro", "Intro", "string", formGroup.key, 240, "The form's intro text.", { typicalCharCount: 200, inlineUpTo: 2000 }),
  v(
    "form_questions",
    "Questions",
    "array",
    formGroup.key,
    250,
    "Each question in order: { field, ask, help, required }. `field` is the field key; `ask` the question as worded.",
    { typicalCharCount: 800 },
  ),
];

const formDeclared: Omit<SurfaceManifest, "readiness"> = {
  surfaceName: CLIENT_PORTAL_FORM_SURFACE_NAME,
  situation:
    "They are filling in the form {form_title|a form} on {business_name|a business}'s client portal (form: {form_state|loading}). Sending it is their own press; help them answer its questions.",
  inheritsFrom: "matrx-default/data",
  client: "matrx-public",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Client portal form",
  description: "One form a client sends to a business from its portal.",
  urlPattern: "/portal/c/[slug]/f/[formId]",
  groups: [...portalGroups, formGroup],
  values: formValues,
  skipBaselineValues: true,
};

export const clientPortalFormManifest = formDeclared as SurfaceManifest;

// ── /portal/c/[slug]/r/[recordId] ──────────────────────────────────────────

const recordGroup: SurfaceValueGroup = { key: "portal_record", label: "Record", sortOrder: 200, description: "One of her records." };
const messagesGroup: SurfaceValueGroup = { key: "portal_messages", label: "Messages", sortOrder: 300, description: "The record's message thread." };

const recordValues: SurfaceValue[] = [
  ...portalValues,
  v("record_id", "Record ID", "string", recordGroup.key, 200, "UUID of the record (from the address).", { alwaysAvailable: true, typicalCharCount: 36 }),
  v(
    "record_state",
    "Record state",
    "string",
    recordGroup.key,
    205,
    '"shown", "not_hers" (not shared with her), or "sign_in" (she must sign in first).',
    { alwaysAvailable: true, typicalCharCount: 8 },
  ),
  v("record_headline", "Record", "string", recordGroup.key, 210, "The record's headline (its first worded field), else its list's name."),
  v("table_name", "List", "string", recordGroup.key, 220, "The list (Table) the record is in, e.g. Jobs or Invoices."),
  v("record_stage", "Stage", "string", recordGroup.key, 230, "Where the record is in its stages, when the portal shows them."),
  v(
    "record_fields",
    "Fields",
    "array",
    recordGroup.key,
    240,
    "Every field shown: { key, label, value, editable }. Editable fields are the ones update_record_fields can change.",
    { typicalCharCount: 800 },
  ),
  v("payment", "Payment", "object", recordGroup.key, 250, "When the record asks for payment: { description, amount (formatted), status }. Paying is her own button."),
  v("messages_enabled", "Takes messages", "boolean", messagesGroup.key, 300, "Whether this record takes messages."),
  v(
    "messages",
    "Messages",
    "array",
    messagesGroup.key,
    310,
    'The thread, oldest first: { author ("You" or the business), body, when }.',
    { typicalCharCount: 1500 },
  ),
];

const recordWriteTargets: SurfaceWriteTarget[] = [
  {
    name: "update_record_fields",
    label: "Change her fields",
    description:
      'Change fields on this record that the portal lets her change (record_fields with editable true). SAVED after she approves, exactly as her own field editor saves. Value is a JSON ARRAY of 1+ objects, each { "key": a field key (required), "value": the new text (string, required) }. Refused (nothing saved): a field that is not editable, a key listed twice, a non-string value. If the business changed the record since the page loaded, the save is refused and says so.',
    valueType: "array",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "record_fields",
    group: recordGroup.key,
    sortOrder: 400,
  },
  {
    name: "post_message",
    label: "Send a message",
    description:
      "Send one message to the business on this record's thread, as her. SENT after she approves. Value is the message text (a string). Refused when the record does not take messages (messages_enabled false) or the text is empty.",
    valueType: "string",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "messages",
    group: messagesGroup.key,
    sortOrder: 410,
  },
];

const recordDeclared: Omit<SurfaceManifest, "readiness"> = {
  surfaceName: CLIENT_PORTAL_RECORD_SURFACE_NAME,
  situation:
    "They are looking at {record_headline|one of their records} in {table_name|a list} on {business_name|a business}'s client portal (stage: {record_stage|none shown}). You can change the fields the portal lets them change and send the business a message; paying stays their button.",
  inheritsFrom: "matrx-default/data",
  client: "matrx-public",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Client portal record",
  description: "One of a client's records on a business's portal: its fields, stage, payment and messages.",
  urlPattern: "/portal/c/[slug]/r/[recordId]",
  groups: [...portalGroups, recordGroup, messagesGroup],
  values: recordValues,
  writeTargets: recordWriteTargets,
  skipBaselineValues: true,
};

export const clientPortalRecordManifest = recordDeclared as SurfaceManifest;
