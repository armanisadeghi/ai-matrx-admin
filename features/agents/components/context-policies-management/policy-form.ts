/**
 * The context-policy editor's form state and its two conversions (policy ↔ form).
 * Pure — no React — so the label/key rule (A22: the Name field shows the label,
 * the key is derived from it) is testable without the editor.
 */
import { sanitizeVariableName } from "@ai-matrx/chat/agents/utils/variable-utils";
import type {
  ContextObjectType,
  ContextPolicy,
  ContextPolicyPersist,
  ContextPolicySource,
} from "@ai-matrx/chat/agents/types/agent-api-types";
import {
  decodeInlinePolicy,
  encodeInlinePolicy,
  type InlineMode,
} from "@/features/agents/components/context-policies-management/InlinePolicyControl";
import {
  labelFor,
  shownVariableName,
} from "@/features/agents/components/variables-management/variable-name-edit";

// ─────────────────────────────────────────────────────────────────────────────
// Form state
// ─────────────────────────────────────────────────────────────────────────────

export interface PolicyFormState {
  key: string;
  label: string;
  description: string;
  type: ContextObjectType;
  // Inline policy — encoded as three explicit modes.
  inlineMode: InlineMode;
  inlineCustomChars: string; // string for the input; parsed on save
  // Summary sub-agent
  summaryAgentId: string;
  // Mutation
  mutable: boolean;
  persist: ContextPolicyPersist;
  // Source (only meaningful when persist="auto")
  sourceKind: string;
  sourceId: string;
  sourceField: string;
  sourceExtra: string; // JSON string in the textarea
  // Scope-context binding (source.kind="ctx_item") — fills the policy from the active scope.
  // Independent of mutable/persist (read-fill always; writeback only if mutable+auto).
  ctxBound: boolean;
  ctxItemId: string;
  ctxScopeTypeId: string;
  ctxItemKey: string;
  ctxOnMissing: string;
}

export const EMPTY_FORM: PolicyFormState = {
  key: "",
  label: "",
  description: "",
  type: "text",
  inlineMode: "default",
  inlineCustomChars: "",
  summaryAgentId: "",
  mutable: false,
  persist: "never",
  sourceKind: "",
  sourceId: "",
  sourceField: "",
  sourceExtra: "",
  ctxBound: false,
  ctxItemId: "",
  ctxScopeTypeId: "",
  ctxItemKey: "",
  ctxOnMissing: "empty",
};

/**
 * Legacy stored policies (pre-`key` rename) carried an `id` field instead.
 * `ContextPolicy` no longer declares it; read it defensively without widening
 * the type.
 */
function legacyPolicyId(policy: ContextPolicy): string | undefined {
  return "id" in policy && typeof policy.id === "string" ? policy.id : undefined;
}

export function getPolicyKey(policy: ContextPolicy): string {
  if (policy.key) return policy.key;
  return legacyPolicyId(policy) ?? "";
}

export function policyToForm(policy: ContextPolicy): PolicyFormState {
  const legacyId = legacyPolicyId(policy);

  // Decode max_inline_chars into the three-mode UI (shared canonical helper).
  const { mode: inlineMode, customChars: inlineCustomChars } =
    decodeInlinePolicy(policy.max_inline_chars);

  const source = policy.source;
  const isCtx = source?.kind === "ctx_item";

  return {
    key: policy.key || legacyId || "",
    // The Name field shows what people read; the key sits under it (A22).
    label: shownVariableName(policy.key || legacyId || "", policy.label),
    description: policy.description ?? "",
    type: policy.type ?? "text",
    inlineMode,
    inlineCustomChars,
    summaryAgentId: policy.summary_agent_id ?? "",
    mutable: policy.mutable ?? false,
    persist: policy.persist ?? "never",
    // Manual source inputs are only for non-ctx_item kinds.
    sourceKind: isCtx ? "" : (source?.kind ?? ""),
    sourceId: isCtx ? "" : (source?.id ?? ""),
    sourceField: source?.field ?? "",
    sourceExtra:
      source?.extra && Object.keys(source.extra).length > 0
        ? JSON.stringify(source.extra, null, 2)
        : "",
    ctxBound: isCtx,
    ctxItemId: isCtx ? (source?.id ?? "") : "",
    ctxScopeTypeId: isCtx ? (source?.scope_type_id ?? "") : "",
    ctxItemKey: isCtx ? (source?.item_key ?? "") : "",
    ctxOnMissing: isCtx ? (source?.on_missing ?? "empty") : "empty",
  };
}

export function formToContextPolicy(form: PolicyFormState): {
  policy: ContextPolicy | null;
  error: string | null;
} {
  const key = form.key.trim() ? sanitizeVariableName(form.key) : "";
  if (!key) return { policy: null, error: "Key is required." };

  const policy: ContextPolicy = { key, type: form.type };

  const label = form.label.trim() ? labelFor(form.label.trim(), key) : undefined;
  if (label) policy.label = label;
  if (form.description.trim()) policy.description = form.description.trim();

  // max_inline_chars (shared canonical encode; default → omit so server uses 200).
  const encodedInline = encodeInlinePolicy({
    mode: form.inlineMode,
    customChars: form.inlineCustomChars,
  });
  if ("error" in encodedInline)
    return { policy: null, error: encodedInline.error };
  if (encodedInline.maxInlineChars !== null) {
    policy.max_inline_chars = encodedInline.maxInlineChars;
  }

  if (form.summaryAgentId.trim()) {
    policy.summary_agent_id = form.summaryAgentId.trim();
  }

  if (form.mutable) {
    policy.mutable = true;
    policy.persist = form.persist;
  }

  // Scope-context binding (independent of agent access): fills the policy from the active
  // scope, and — when also agent-editable + save-to-source — is the same source used for
  // write-back.
  if (form.ctxBound) {
    if (!form.ctxItemId.trim()) {
      return {
        policy: null,
        error: "Choose a context item to bind this policy to.",
      };
    }
    policy.source = {
      kind: "ctx_item",
      id: form.ctxItemId.trim(),
      scope_type_id: form.ctxScopeTypeId.trim() || undefined,
      item_key: form.ctxItemKey.trim() || undefined,
      on_missing: form.ctxOnMissing.trim() || "empty",
    };
  } else if (form.mutable && form.persist === "auto") {
    if (!form.sourceKind.trim()) {
      return {
        policy: null,
        error:
          "Source 'kind' is required when the agent's edits save to the source.",
      };
    }
    const source: ContextPolicySource = { kind: form.sourceKind.trim() };
    if (form.sourceId.trim()) source.id = form.sourceId.trim();
    if (form.sourceField.trim()) source.field = form.sourceField.trim();
    if (form.sourceExtra.trim()) {
      try {
        const parsed = JSON.parse(form.sourceExtra);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          source.extra = parsed as Record<string, unknown>;
        } else {
          return { policy: null, error: "Source extra must be a JSON object." };
        }
      } catch {
        return { policy: null, error: "Source extra is not valid JSON." };
      }
    }
    policy.source = source;
  }

  return { policy, error: null };
}
