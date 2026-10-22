// features/esign/editor/agent-writes.ts — the e-sign editor as the `matrx-user/esign-envelope` /
// `matrx-user/esign-template` surfaces: the scope an agent reads and the pure, whole-list parsers for
// what it may change. Every change goes through the editor's own `edit` (undoable, synced to the
// server draft like typing); nothing is ever sent — Send stays the person's press.

import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";

import type { DraftRecipient, EnvelopeDraftV1, RecipientRole } from "../contract/draft";
import { draftWarnings, isEmail, newRecipient, sendBlockers } from "./model";

const ROLES: readonly RecipientRole[] = ["signer", "viewer", "cc_recipient"];

export const renumberRecipients = (list: DraftRecipient[], sequential: boolean) =>
  list.map((r, i) => ({ ...r, order: sequential ? i + 1 : 1 }));

function fail(problems: string[]): never {
  throw new Error(`${problems.join(" ")} Nothing was changed.`);
}

const asList = (value: unknown, what: string): Record<string, unknown>[] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) fail([`${what} takes a JSON array of 1-20 objects.`]);
  return value as Record<string, unknown>[];
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);

export interface RecipientSeed {
  full_name: string;
  email: string;
  role: RecipientRole;
  company?: string | null;
  job_title?: string | null;
  private_message?: string | null;
}

const OPTIONAL = ["company", "job_title", "private_message"] as const;

function readSeed(item: Record<string, unknown>, i: number, problems: string[], partial: boolean): Partial<RecipientSeed> {
  const out: Partial<RecipientSeed> = {};
  const at = `Item ${i + 1}:`;
  for (const k of Object.keys(item)) {
    if (!["key", "full_name", "email", "role", ...OPTIONAL].includes(k)) problems.push(`${at} unknown field "${k}".`);
  }
  if ("full_name" in item || !partial) {
    const n = text(item.full_name);
    if (!n) problems.push(`${at} full_name is required.`);
    else out.full_name = n;
  }
  if ("email" in item || !partial) {
    const e = text(item.email);
    if (!e || !isEmail(e)) problems.push(`${at} a valid email is required.`);
    else out.email = e;
  }
  if ("role" in item) {
    if (!ROLES.includes(item.role as RecipientRole)) problems.push(`${at} role must be "signer", "viewer" or "cc_recipient".`);
    else out.role = item.role as RecipientRole;
  } else if (!partial) out.role = "signer";
  for (const k of OPTIONAL) {
    if (!(k in item)) continue;
    const v = item[k];
    if (v !== null && typeof v !== "string") problems.push(`${at} ${k} must be text or null.`);
    else if (k === "private_message" && typeof v === "string" && v.length > 2000) problems.push(`${at} private_message is over 2000 characters.`);
    else out[k] = v === null ? null : (v as string).trim();
  }
  return out;
}

export function parseCreateRecipients(value: unknown, draft: EnvelopeDraftV1): RecipientSeed[] {
  const items = asList(value, "create_recipients");
  const problems: string[] = [];
  const seeds = items.map((item, i) => {
    if ("key" in item) problems.push(`Item ${i + 1}: has a key — use update_recipients to change someone already on the envelope.`);
    return readSeed(item, i, problems, false) as RecipientSeed;
  });
  if (draft.recipients.length + seeds.length > 20) problems.push(`An envelope holds at most 20 recipients (it has ${draft.recipients.length}).`);
  if (problems.length) fail(problems);
  return seeds;
}

export function applyCreateRecipients(d: EnvelopeDraftV1, seeds: RecipientSeed[]): { draft: EnvelopeDraftV1; added: DraftRecipient[] } {
  let recipients = [...d.recipients];
  const added: DraftRecipient[] = [];
  for (const seed of seeds) {
    const r = newRecipient(recipients, { ...seed, user_id: null });
    recipients = [...recipients, r];
    added.push(r);
  }
  const sorted = renumberRecipients(recipients.sort((a, b) => a.order - b.order), d.settings.signing_order === "sequential");
  return { draft: { ...d, recipients: sorted }, added: sorted.filter((r) => added.some((a) => a.key === r.key)) };
}

export function parseUpdateRecipients(value: unknown, draft: EnvelopeDraftV1): { key: string; change: Partial<RecipientSeed> }[] {
  const items = asList(value, "update_recipients");
  const problems: string[] = [];
  const seen = new Set<string>();
  const plans = items.map((item, i) => {
    const key = text(item.key) ?? "";
    if (!draft.recipients.some((r) => r.key === key)) problems.push(`Item ${i + 1}: no recipient has key "${key}".`);
    if (seen.has(key)) problems.push(`Item ${i + 1}: key "${key}" is listed twice.`);
    seen.add(key);
    const change = readSeed(item, i, problems, true);
    if (Object.keys(change).length === 0) problems.push(`Item ${i + 1}: nothing to change.`);
    return { key, change };
  });
  if (problems.length) fail(problems);
  return plans;
}

export function parseDeleteRecipients(value: unknown, draft: EnvelopeDraftV1): string[] {
  const raw = Array.isArray(value) ? value : [];
  if (raw.length === 0 || raw.length > 20) fail(["delete_recipients takes a JSON array of 1-20 recipient keys."]);
  const problems: string[] = [];
  const keys = raw.map((v, i) => {
    const key = typeof v === "string" ? v : text((v as Record<string, unknown>)?.key) ?? "";
    if (!draft.recipients.some((r) => r.key === key)) problems.push(`Item ${i + 1}: no recipient has key "${key}".`);
    return key;
  });
  if (new Set(keys).size !== keys.length) problems.push("A key is listed twice.");
  if (problems.length) fail(problems);
  return keys;
}

export function applyDeleteRecipients(d: EnvelopeDraftV1, keys: string[]): EnvelopeDraftV1 {
  const gone = new Set(keys);
  return {
    ...d,
    recipients: renumberRecipients(d.recipients.filter((r) => !gone.has(r.key)).sort((a, b) => a.order - b.order), d.settings.signing_order === "sequential"),
    fields: d.fields.filter((f) => !gone.has(f.recipient_key)),
    groups: d.groups.filter((g) => !gone.has(g.recipient_key)),
  };
}

export const TEXT_LIMITS = { envelope_title: 300, email_subject: 200, envelope_message: 4000 } as const;

export function parseText(target: keyof typeof TEXT_LIMITS, value: unknown): string {
  if (typeof value !== "string") fail([`${target} takes text.`]);
  const v = (value as string).trim();
  if (v.length > TEXT_LIMITS[target]) fail([`${target} is over ${TEXT_LIMITS[target]} characters.`]);
  if (target !== "envelope_message" && v.includes("\n")) fail([`${target} is one line.`]);
  return v;
}

export function buildEsignEditorScope(input: {
  mode: "envelope" | "template";
  envelopeId: string | null;
  template: { id: string | null; name: string; version: number } | null;
  draft: EnvelopeDraftV1;
  subject: string;
  saveState: string | null;
}): SurfaceScopePayload {
  const { draft } = input;
  return {
    editor_mode: input.mode,
    ...(input.mode === "template"
      ? { template_id: input.template?.id ?? null, template_name: input.template?.name ?? "" }
      : { envelope_id: input.envelopeId, envelope_status: "draft", draft_save_state: input.saveState }),
    envelope_title: draft.title,
    email_subject: input.subject,
    envelope_message: draft.message,
    documents: draft.documents.map((d) => ({ key: d.key, name: d.name, page_count: d.page_count })),
    recipients: draft.recipients.map((r) => ({
      key: r.key,
      role: r.role,
      order: r.order,
      full_name: r.full_name,
      email: r.email,
      is_member: !!r.user_id,
      company: r.company ?? null,
      job_title: r.job_title ?? null,
      private_message: r.private_message ?? null,
      verification: r.verification,
      template_role: r.template_role ?? null,
      field_count: draft.fields.filter((f) => f.recipient_key === r.key).length,
    })),
    field_count: draft.fields.length,
    signing_order: draft.settings.signing_order,
    expires_in_days: draft.settings.expires_in_days,
    send_blockers: sendBlockers(draft),
    send_warnings: draftWarnings(draft),
  } as SurfaceScopePayload;
}
