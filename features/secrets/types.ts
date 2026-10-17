

import type { components } from "@ai-matrx/api/types";
import type { Database } from "@/types/database.types";

type ApiSchemas = components["schemas"];
export type VaultHandling = NonNullable<ApiSchemas["FieldIn"]["handling"]>;

/** Validate the protection value at every DB/API ingress. Omitted API values
 *  materialize the server default; any other string means the stored contract
 *  is corrupt and must fail loudly instead of reaching permission UI. */
export function normalizeVaultHandling(value: unknown): VaultHandling {
  if (value === undefined || value === null) return "revealable";
  if (value === "visible" || value === "revealable" || value === "sealed") {
    return value;
  }
  throw new Error(`Invalid Vault protection value: ${String(value)}`);
}

// ── Wire shapes (generated — the source of truth) ─────────────────────────

export type VaultItemWire = ApiSchemas["VaultItemOut"];
export type VaultFieldWire = ApiSchemas["VaultFieldOut"];
export type VaultAttachmentWire = ApiSchemas["VaultAttachmentOut"];
export type VaultCapabilities = ApiSchemas["VaultCapabilities"];

export type VaultAttachment = Pick<
  VaultAttachmentWire,
  | "id"
  | "credential_item_id"
  | "label"
  | "file_name"
  | "media_type"
  | "size_bytes"
  | "value_version"
  | "created_at"
  | "updated_at"
> & {
  description: string | null;
  last_used_at: string | null;
  handling: VaultHandling;
};

/** Wire field with server defaults materialized (see `normalizeWireField`).
 *  Built with `Pick` (not `Omit`) because the generated wire types carry a
 *  string index signature that makes `Omit` collapse every prop to unknown. */
export type VaultField = Pick<
  VaultFieldWire,
  | "id"
  | "credential_item_id"
  | "field_key"
  | "execution_purpose"
  | "created_at"
  | "updated_at"
> & {
  env_key: string | null;
  handling: VaultHandling;
  editable: boolean;
  inject_into_sandbox: boolean;
  value_hint: string;
  value_version: number;
  is_active: boolean;
  description: string | null;
};

/** Wire item with server defaults materialized (see `normalizeWireItem`).
 *  The whole workspace consumes THIS shape from both read paths. */
export type VaultItem = Pick<
  VaultItemWire,
  "id" | "display_name" | "created_at" | "updated_at"
> & {
  definition_key: string;
  definition_version: number;
  status: string;
  source: string;
  access_mode: string;
  user_id: string | null;
  organization_id: string | null;
  provider_key: string | null;
  description: string | null;
  tags: string[];
  lifecycle: Record<string, unknown>;
  /** PLAINTEXT destination metadata (never encrypted; RLS-protected). */
  login_urls: string[];
  uri_match_mode: string;
  notes: string | null;
  non_secret_fields: NonSecretField[];
  browser_fill_enabled: boolean;
  fields: VaultField[];
  attachments: VaultAttachment[];
  capabilities: VaultCapabilities;
};

/** One user-authored PLAINTEXT custom field. Never a secret — the UI labels
 *  the whole section "Not encrypted". */
export interface NonSecretField {
  key: string;
  label: string;
  value: string;
}

export function normalizeNonSecretFields(raw: unknown): NonSecretField[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const e = entry as Record<string, unknown>;
    if (typeof e.key !== "string" || typeof e.label !== "string") return [];
    return [{ key: e.key, label: e.label, value: String(e.value ?? "") }];
  });
}

export function normalizeWireField(wire: VaultFieldWire): VaultField {
  return {
    ...wire,
    // Deliberately do not default missing metadata to `general`: an older
    // server response must retain its compatibility shape rather than making
    // a client-side security promise. The server remains authoritative.
    execution_purpose: normalizeExecutionPurpose(wire.execution_purpose),
    env_key: wire.env_key ?? null,
    handling: normalizeVaultHandling(wire.handling),
    editable: wire.editable ?? true,
    inject_into_sandbox: wire.inject_into_sandbox ?? false,
    value_hint: wire.value_hint ?? "",
    value_version: wire.value_version ?? 1,
    is_active: wire.is_active ?? true,
    description: wire.description ?? null,
  };
}

/** Validate database/API purpose metadata without declaring a parallel type. */
export function normalizeExecutionPurpose(
  value: unknown,
): VaultFieldWire["execution_purpose"] {
  if (value === undefined || value === null) return undefined;
  if (value === "general" || value === "passkey_private") return value;
  throw new Error(`Invalid Vault execution purpose: ${String(value)}`);
}

export function normalizeWireItem(wire: VaultItemWire): VaultItem {
  return {
    ...wire,
    definition_key: wire.definition_key ?? "custom",
    definition_version: wire.definition_version ?? 1,
    status: wire.status ?? "active",
    source: wire.source ?? "manual",
    access_mode: wire.access_mode ?? "all_members",
    user_id: wire.user_id ?? null,
    organization_id: wire.organization_id ?? null,
    provider_key: wire.provider_key ?? null,
    description: wire.description ?? null,
    tags: wire.tags ?? [],
    lifecycle: wire.lifecycle ?? {},
    login_urls: wire.login_urls ?? [],
    uri_match_mode: wire.uri_match_mode ?? "host",
    notes: wire.notes ?? null,
    non_secret_fields: normalizeNonSecretFields(wire.non_secret_fields),
    browser_fill_enabled: wire.browser_fill_enabled ?? false,
    fields: (wire.fields ?? []).map(normalizeWireField),
    attachments: (wire.attachments ?? []).map(normalizeWireAttachment),
    capabilities: wire.capabilities ?? {
      can_use: false,
      can_edit: false,
      can_reveal: false,
      can_manage: false,
    },
  };
}
export function normalizeWireAttachment(
  wire: VaultAttachmentWire,
): VaultAttachment {
  return {
    ...wire,
    description: wire.description ?? null,
    last_used_at: wire.last_used_at ?? null,
    handling: normalizeVaultHandling(wire.handling),
  };
}
export type VaultItemCreateRequest = ApiSchemas["VaultItemCreateRequest"];
export type VaultMemberAccessList = ApiSchemas["VaultMemberAccessListResponse"];
export type VaultMemberAccessSetResponse =
  ApiSchemas["VaultMemberAccessSetResponse"];

/** A member's reach into an organization's vault (access ladder decision 14).
 *  `use` = they and their agents sign in with its logins without seeing the
 *  values; `editor` = see and edit; `admin` = an owner/admin (always full). */
export type OrganizationVaultAccess = "none" | "use" | "editor" | "admin";
/** What an owner/admin may set for one member. */
export type MemberVaultAccessChoice = Exclude<OrganizationVaultAccess, "admin">;

export function isOrganizationVaultAccess(
  value: unknown,
): value is OrganizationVaultAccess {
  return (
    value === "none" ||
    value === "use" ||
    value === "editor" ||
    value === "admin"
  );
}

export const MEMBER_VAULT_ACCESS_LABELS: Record<
  OrganizationVaultAccess,
  string
> = {
  none: "No access",
  use: "Use only",
  editor: "Editor",
  admin: "Full (owner or admin)",
};

/**
 * The list scope the user is looking at. Each is a DELIBERATE query, never a
 * bare RLS-filtered read (THE VIEW LAW): `mine` filters on ownership,
 * `shared` starts from the user's own grant rows, `organization` filters on
 * the org. Widening access must never silently flood a scope.
 */
export type VaultScope =
  | { kind: "mine" }
  | { kind: "shared" }
  /** `organizationId: null` is ALL the person's organizations (the tab's default — a filter,
   *  never a permission: RLS still decides what each item lets them see and do). */
  | { kind: "organization"; organizationId: string | null };

// ── Direct-Supabase masked rows (explicit column lists — see service) ─────

type CredentialItemsRow =
  Database["users"]["Tables"]["credential_items"]["Row"];
type UserSecretsRow = Database["users"]["Tables"]["user_secrets"]["Row"];
type CredentialAttachmentsRow =
  Database["users"]["Tables"]["credential_attachments"]["Row"];

/** Masked item metadata columns the browser may select. NEVER `select *`.
 *  The destination-login columns are plaintext BY DESIGN and safe to list. */
export const CREDENTIAL_ITEM_COLUMNS =
  "id, user_id, organization_id, definition_key, definition_version, provider_key, display_name, description, tags, status, source, access_mode, lifecycle, login_urls, uri_match_mode, notes, non_secret_fields, browser_fill_enabled, created_at, updated_at" as const;

/** Masked field columns. `value_encrypted` is UNREADABLE by client roles —
 *  never select it, never `select *` on `users.user_secrets`. */
export const VAULT_FIELD_COLUMNS =
  "id, credential_item_id, field_key, execution_purpose, key, handling, editable, inject_into_sandbox, value_hint, value_version, is_active, description, created_at, updated_at" as const;

/** Attachment metadata only. Encrypted file bytes are deliberately absent and
 *  are not selectable by browser roles even if a caller changes this list. */
export const VAULT_ATTACHMENT_COLUMNS =
  "id, credential_item_id, label, description, file_name, media_type, size_bytes, handling, value_version, last_used_at, created_at, updated_at" as const;

export type CredentialItemMaskedRow = Pick<
  CredentialItemsRow,
  | "id"
  | "user_id"
  | "organization_id"
  | "definition_key"
  | "definition_version"
  | "provider_key"
  | "display_name"
  | "description"
  | "tags"
  | "status"
  | "source"
  | "access_mode"
  | "lifecycle"
  | "login_urls"
  | "uri_match_mode"
  | "notes"
  | "non_secret_fields"
  | "browser_fill_enabled"
  | "created_at"
  | "updated_at"
>;

export type VaultFieldMaskedRow = Pick<
  UserSecretsRow,
  | "id"
  | "credential_item_id"
  | "field_key"
  | "execution_purpose"
  | "key"
  | "handling"
  | "editable"
  | "inject_into_sandbox"
  | "value_hint"
  | "value_version"
  | "is_active"
  | "description"
  | "created_at"
  | "updated_at"
>;

export type VaultAttachmentMaskedRow = Pick<
  CredentialAttachmentsRow,
  | "id"
  | "credential_item_id"
  | "label"
  | "description"
  | "file_name"
  | "media_type"
  | "size_bytes"
  | "handling"
  | "value_version"
  | "last_used_at"
  | "created_at"
  | "updated_at"
>;
