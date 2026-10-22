"use client";

/**
 * AgentContextPoliciesManager
 *
 * Smart component — manages context policies for the active agent.
 * UI matches Variables row: compact chips (key only) + Dialog/Drawer editor.
 *
 * Persists the full `ContextPolicy` shape per the server contract
 * (see `/Users/armanisadeghi/code/common-docs/systems/data/scopes-context/context-delivery/STATE.md`):
 *   key, type, label, description, max_inline_chars, summary_agent_id,
 *   mutable, persist, source.
 */

import { BuilderRowAction } from "@/features/agents/components/builder/BuilderRowAction";
import { useState, useCallback, useMemo } from "react";
import { Plus, X, ChevronDown, Layers, Search, Link2, Pencil } from "lucide-react";
import { useOpenScopeBatchImportWindow } from "@/features/overlays/definitions/scopeBatchImportWindow.overlay";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@ai-matrx/design-system";
import { TextareaLegacy as Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ai-matrx/design-system";
import { Checkbox } from "@/components/ui/checkbox";
import { InfoHint } from "@ai-matrx/design-system/controls";
import { ContextItemPicker } from "@/features/scopes/components/pages/ContextItemPicker";
import { contextItemValueTypeToPolicyType } from "@ai-matrx/chat/agents/utils/context-item-policy-mapping";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTriggerLegacy as SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectAgentContextPolicies } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import {
  setAgentContextPolicies,
} from "@/features/agents/redux/agent-builder.slice";
import type {
  ContextObjectType,
  ContextPolicy,
} from "@ai-matrx/chat/agents/types/agent-api-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { sanitizeVariableName } from "@ai-matrx/chat/agents/utils/variable-utils";
import { LabelKeyField } from "@/features/agents/components/shared/LabelKeyField";
import { typedNameDraft } from "@/features/agents/components/variables-management/variable-name-edit";
import { AgentListDropdown } from "@ai-matrx/agents/catalog/react";
import {
  InlinePolicyControl,
} from "@/features/agents/components/context-policies-management/InlinePolicyControl";
import { AgentEditAccessControl } from "@/features/agents/components/context-policies-management/AgentEditAccessControl";
import { AgentContextInjectionSwitch } from "@/features/agents/components/context-policies-management/AgentContextInjectionSwitch";
import { SCOPE_ITEM_DEFAULT_SAVE_MODE } from "@ai-matrx/chat/agents/utils/agent-edit-access";
import { cn } from "@/lib/utils";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

const CONTEXT_TYPES: ContextObjectType[] = [
  "text",
  "json",
  "file_url",
  "db_ref",
  "user",
  "org",
  "workspace",
  "project",
  "task",
  "variable",
];

// Suggested default `max_inline_chars` per type, per the FE guide.
const SUGGESTED_INLINE_MODE_BY_TYPE: Record<
  ContextObjectType,
  "default" | "never"
> = {
  text: "default",
  json: "default",
  file_url: "default",
  db_ref: "never",
  user: "default",
  org: "default",
  workspace: "default",
  project: "default",
  task: "default",
  variable: "default",
};

import {
  EMPTY_FORM,
  formToContextPolicy,
  getPolicyKey,
  policyToForm,
  type PolicyFormState,
} from "@/features/agents/components/context-policies-management/policy-form";

// ─────────────────────────────────────────────────────────────────────────────
// Editor — UI
// ─────────────────────────────────────────────────────────────────────────────

interface PolicyEditorFieldsProps {
  form: PolicyFormState;
  onChange: (patch: Partial<PolicyFormState>) => void;
  isEdit: boolean;
  keyDuplicate: boolean;
  keyRulesOk: boolean;
  formError: string | null;
}

function PolicyEditorFields({
  form,
  onChange,
  isEdit,
  keyDuplicate,
  keyRulesOk,
  formError,
}: PolicyEditorFieldsProps) {
  const sourceDisabled = !form.mutable || form.persist !== "auto";

  return (
    <div className="space-y-5 py-1">
      {/* ──────────────────── Scope binding ──────────────────── */}
      <Section
        title="Scope binding"
        subtitle="Fill key, label, description and type from a context item"
        hint="Every filled field stays editable; leave unbound for a fully custom policy."
      >
        <Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={form.ctxBound}
              onCheckedChange={(c) => onChange({ ctxBound: c === true })}
            />
            <span className="type-secondary">Bind to a context item</span>
          </label>
        </Field>
        {form.ctxBound && (
          <Field className="pl-6 pt-1 space-y-2">
            <ContextItemPicker
              value={{
                scopeTypeId: form.ctxScopeTypeId,
                contextItemId: form.ctxItemId,
              }}
              onChange={(sel) => {
                const patch: Partial<PolicyFormState> = {
                  ctxItemId: sel.contextItemId,
                  ctxScopeTypeId: sel.scopeTypeId,
                  ctxItemKey: sel.itemKey,
                };
                if (sel.item) {
                  // Pick auto-fills identity from the item; the key stays
                  // locked once a policy exists (its key can't be renamed).
                  if (!isEdit) {
                    const suggestedKey = sanitizeVariableName(
                      sel.item.key || sel.item.label,
                    );
                    if (suggestedKey) patch.key = suggestedKey;
                  }
                  patch.label = sel.item.label;
                  patch.description = sel.item.description ?? "";
                  const nextType = contextItemValueTypeToPolicyType(
                    sel.item.kind,
                  );
                  patch.type = nextType;
                  patch.inlineMode = SUGGESTED_INLINE_MODE_BY_TYPE[nextType];
                  patch.inlineCustomChars = "";
                }
                onChange(patch);
              }}
            />
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                When no scope provides it
              </Label>
              <Select
                value={form.ctxOnMissing}
                onValueChange={(v) => onChange({ ctxOnMissing: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empty">
                    Empty — leave the policy unfilled
                  </SelectItem>
                  <SelectItem value="skip">Skip — same as empty</SelectItem>
                  <SelectItem value="error">
                    Error — refuse to run if missing
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Field>
        )}
      </Section>

      {/* ──────────────────── Identity ──────────────────── */}
      <Section
        title="Identity"
        subtitle={
          form.ctxBound
            ? "Pre-filled from the bound context item — edit freely."
            : undefined
        }
      >
        <Field>
          <LabelKeyField
            id="policy-name"
            titleClassName="text-xs"
            value={form.label}
            onChange={(typed) =>
              onChange(typedNameDraft({ typed, key: form.key, label: form.label, keyLocked: isEdit }))
            }
            placeholder="Clipboard content"
            keyText={form.key}
            keyPrefix="Context key"
            error={keyDuplicate ? "This key already exists" : null}
            hint={form.label.trim() && !keyRulesOk ? "Start with a letter" : null}
          />
        </Field>

        <Field>
          <Label htmlFor="policy-type" className="text-xs">
            Type
          </Label>
          <Select
            value={form.type}
            onValueChange={(v) => {
              const nextType = v as ContextObjectType;
              // Suggest a sensible default inline policy when the type changes.
              const suggested = SUGGESTED_INLINE_MODE_BY_TYPE[nextType];
              onChange({
                type: nextType,
                inlineMode: suggested,
                inlineCustomChars: "",
              });
            }}
          >
            <SelectTrigger id="policy-type" className="text-sm w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTEXT_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs font-mono">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <Label htmlFor="policy-desc" className="text-xs">
            Description{" "}
            <span className="text-muted-foreground font-normal">
              (shown to the model — be specific)
            </span>
          </Label>
          <ProTextarea
            id="policy-desc"
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Customer's open orders and their status"
            className="min-h-[72px] resize-y"
            style={{ fontSize: "16px" }}
          />
        </Field>
      </Section>

      {/* ──────────────────── Inline policy ──────────────────── */}
      {/* Inline = rendered in the manifest; otherwise deferred behind ctx_get. */}
      <Section
        title="Inline policy"
        subtitle="When content is inlined vs fetched on demand"
        hint="The agent's value is a ceiling: surfaces can lower it but never raise it."
      >
        <InlinePolicyControl
          value={{ mode: form.inlineMode, customChars: form.inlineCustomChars }}
          onChange={(v) =>
            onChange({ inlineMode: v.mode, inlineCustomChars: v.customChars })
          }
        />
      </Section>

      {/* ──────────────────── Summary sub-agent ──────────────────── */}
      {/* The model's ctx_get(mode='summary') calls for this policy route through this agent. */}
      <Section
        title="Summary sub-agent"
        subtitle="Optional agent that summarizes this content on request"
      >
        <Field>
          <div className="flex items-stretch gap-2">
            <Input
              value={form.summaryAgentId}
              onChange={(e) => onChange({ summaryAgentId: e.target.value })}
              placeholder="Paste an agent ID, or pick →"
              className="font-mono text-xs flex-1"
              style={{ fontSize: "16px" }}
            />
            <AgentListDropdown
              onSelect={(agentId) => onChange({ summaryAgentId: agentId })}
              triggerSlot={
                <Button
                  iconEnd={<ChevronDown />}
                  type="button"
                  variant="outline"
                  className="shrink-0"
                >
                  Pick agent
                </Button>
              }
            />
            {form.summaryAgentId.trim() && (
              <Button
                type="button"
                variant="quiet"
                className="shrink-0"
                onClick={() => onChange({ summaryAgentId: "" })}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </Field>
      </Section>

      {/* ──────────────────── Agent access ──────────────────── */}
      <Section
        title="Agent access"
        subtitle="Whether the agent may change this value, or only read it"
      >
        <AgentEditAccessControl
          value={{
            access: form.mutable ? "editable" : "read_only",
            saveMode: form.persist,
          }}
          onChange={(next) => {
            // Turning ON edit for a scope-bound policy defaults to writing back to the
            // scope cell — that's what "the agent can edit this" means for a scope
            // value. An unbound policy has no source yet, so it stays conversation-only
            // until the author names one.
            const enabling = next.access === "editable" && !form.mutable;
            const saveMode =
              enabling && form.ctxBound && next.saveMode === "never"
                ? SCOPE_ITEM_DEFAULT_SAVE_MODE
                : next.saveMode;
            onChange({
              mutable: next.access === "editable",
              persist: saveMode,
            });
          }}
        />
      </Section>

      {/* ──────────────────── Source (save-to-source only) ──────────────────── */}
      {form.mutable && form.persist === "auto" && !form.ctxBound && (
        <Section
          title="Source record"
          subtitle="Where the agent's edits are written back · required"
        >
          <Field>
            <Label htmlFor="src-kind" className="text-xs">
              Kind <span className="text-destructive">*</span>
            </Label>
            <Input
              id="src-kind"
              value={form.sourceKind}
              onChange={(e) => onChange({ sourceKind: e.target.value })}
              className="font-mono text-xs"
              data-identifier
              placeholder="note  |  doc  |  table_row"
              disabled={sourceDisabled}
              style={{ fontSize: "16px" }}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <Label htmlFor="src-id" className="text-xs">
                ID
              </Label>
              <Input
                id="src-id"
                value={form.sourceId}
                onChange={(e) => onChange({ sourceId: e.target.value })}
                placeholder="(optional)"
                disabled={sourceDisabled}
                className="font-mono text-xs"
                style={{ fontSize: "16px" }}
              />
            </Field>
            <Field>
              <Label htmlFor="src-field" className="text-xs">
                Field
              </Label>
              <Input
                id="src-field"
                value={form.sourceField}
                onChange={(e) => onChange({ sourceField: e.target.value })}
                placeholder="(optional)"
                disabled={sourceDisabled}
                className="font-mono text-xs"
                style={{ fontSize: "16px" }}
              />
            </Field>
          </div>
          <Field>
            <Label htmlFor="src-extra" className="text-xs">
              Extra{" "}
              <span className="text-muted-foreground font-normal">
                (JSON object, optional)
              </span>
            </Label>
            <Textarea
              id="src-extra"
              value={form.sourceExtra}
              onChange={(e) => onChange({ sourceExtra: e.target.value })}
              placeholder='{ "scope": "user" }'
              disabled={sourceDisabled}
              className="min-h-[72px] resize-y font-mono text-xs"
              style={{ fontSize: "16px" }}
            />
          </Field>
        </Section>
      )}

      {formError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 type-secondary text-destructive-ink">
          {formError}
          <ErrorAlchemyMenu error={formError} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small primitives
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  hint,
  children,
}: {
  title: string;
  /** One line; clamps with `truncate`. Definitions go in `hint`. */
  subtitle?: string;
  /** One-sentence definition shown via InfoHint beside the title. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="min-w-0">
        <h3 className="flex items-center gap-1 type-meta font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
          {hint && <InfoHint text={hint} label={`About ${title}`} />}
        </h3>
        {subtitle && (
          <p className="truncate type-meta text-muted-foreground/80 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("space-y-1.5", className)}>{children}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context policy stack — a single "N context policies" chip that opens a popover
// with the full, scrollable, searchable list. Agents can carry dozens of
// policies (batch-import makes that the common case, not the exception), so the
// row this lives in must stay one line regardless of count. This is purely a
// design-time view of the agent's defined policies — it never reads a resolved
// runtime value or active scope, so it renders identically whether or not
// the agent has ever been run.
// ─────────────────────────────────────────────────────────────────────────────

const SEARCH_THRESHOLD = 6;

function ContextPolicyStackTrigger({
  policies,
  onEdit,
  onDelete,
}: {
  policies: ContextPolicy[];
  onEdit: (idx: number) => void;
  onDelete: (idx: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const indexed = policies.map((policy, i) => ({ policy, i }));
    const q = search.trim().toLowerCase();
    if (!q) return indexed;
    return indexed.filter(({ policy }) => {
      const key = getPolicyKey(policy).toLowerCase();
      const label = (policy.label ?? "").toLowerCase();
      const description = (policy.description ?? "").toLowerCase();
      return (
        key.includes(q) || label.includes(q) || description.includes(q)
      );
    });
  }, [policies, search]);

  if (policies.length === 0) return null;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="truncate">
            {policies.length} context{" "}
            {policies.length === 1 ? "policy" : "policies"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent sizing="content" className="p-0" align="start">
        {policies.length > SEARCH_THRESHOLD && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border/50">
            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter context policies…"
              className="flex-1 min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
              style={{ fontSize: "16px" }}
            />
          </div>
        )}
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-center type-secondary text-muted-foreground py-4">
              No matches
            </p>
          ) : (
            filtered.map(({ policy, i }) => {
              const key = getPolicyKey(policy);
              const detail = policy.label?.trim()
                ? policy.label
                : policy.description?.trim()
                  ? policy.description
                  : "";
              const isBound = policy.source?.kind === "ctx_item";
              return (
                <div
                  key={`${key}-${i}`}
                  className="group flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-accent/50 transition-colors"
                >
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left"
                    onClick={() => {
                      setOpen(false);
                      onEdit(i);
                    }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="type-secondary font-mono font-medium truncate">
                        {key}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 font-normal shrink-0"
                      >
                        {policy.type}
                      </Badge>
                      {isBound && (
                        <Link2
                          className="w-3 h-3 text-primary/70 shrink-0"
                          aria-label="Bound to a scope context item"
                        />
                      )}
                      {policy.mutable && (
                        <Pencil
                          className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0"
                          aria-label="Mutable"
                        />
                      )}
                    </div>
                    {detail && (
                      <p className="type-meta text-muted-foreground truncate mt-0.5">
                        {detail}
                      </p>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(i)}
                    title="Remove context policy"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface AgentContextPoliciesManagerProps {
  agentId: string;
  showCompactInjectionControl?: boolean;
}

export function AgentContextPoliciesManager({
  agentId,
  showCompactInjectionControl = false,
}: AgentContextPoliciesManagerProps) {
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const openBatchImport = useOpenScopeBatchImportWindow();
  const policiesRaw = useAppSelector((state) =>
    selectAgentContextPolicies(state, agentId),
  );
  const policies = useMemo(() => policiesRaw ?? [], [policiesRaw]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<PolicyFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const patchForm = useCallback((patch: Partial<PolicyFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setFormError(null);
  }, []);

  const sanitizedKey = form.key.trim() ? sanitizeVariableName(form.key) : "";
  const keyValid =
    /^[a-z_][a-z0-9_]*$/.test(sanitizedKey) && sanitizedKey.length > 0;

  const existingKeys = policies
    .map((s, i) => (i !== editIndex ? getPolicyKey(s) : ""))
    .filter(Boolean);

  const keyDuplicate =
    editIndex === null &&
    sanitizedKey.length > 0 &&
    existingKeys
      .map((k) => k.toLowerCase())
      .includes(sanitizedKey.toLowerCase());

  const canSave = keyValid && !keyDuplicate;

  const openAdd = () => {
    setEditIndex(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditorOpen(true);
  };

  const openEdit = (idx: number) => {
    const policy = policies[idx];
    if (!policy) return;
    setForm(policyToForm(policy));
    setEditIndex(idx);
    setFormError(null);
    setEditorOpen(true);
  };

  const handleSave = () => {
    if (!canSave) return;
    const { policy: newPolicy, error } = formToContextPolicy(form);
    if (!newPolicy) {
      setFormError(error);
      return;
    }
    const next: ContextPolicy[] =
      editIndex === null
        ? [...policies, newPolicy]
        : policies.map((s, i) => (i === editIndex ? newPolicy : s));

    dispatch(
      setAgentContextPolicies({
        id: agentId,
        contextPolicies: next,
      }),
    );
    setEditorOpen(false);
  };

  const handleDelete = (idx: number) => {
    dispatch(
      setAgentContextPolicies({
        id: agentId,
        contextPolicies: policies.filter((_, i) => i !== idx),
      }),
    );
  };

  const title = editIndex === null ? "Add context policy" : "Edit context policy";
  // A policy declares a key clients may pass in the request `context` object; listed keys get
  // typed handling, labels, inline behavior and optional mutation.
  const description =
    editIndex === null
      ? "A context value this agent can receive, and its rules"
      : "Update this context value and its rules";

  const editorBody = (
    <>
      <PolicyEditorFields
        form={form}
        onChange={patchForm}
        isEdit={editIndex !== null}
        keyDuplicate={keyDuplicate}
        keyRulesOk={keyValid}
        formError={formError}
      />
      <div className="sticky bottom-0 flex justify-end gap-2 pt-3 pb-1 bg-background/95 backdrop-blur-sm">
        <Button variant="outline" onClick={() => setEditorOpen(false)}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!canSave}>
          {editIndex === null ? "Add policy" : "Save changes"}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* The row answers its OWN width: in a narrow builder column the two
          actions keep their icons and drop their words, never clipping to
          "Batc" (the words stay as the accessible names and tooltips). */}
      <div className="@container/policy-row flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
        <Label className="text-xs text-muted-foreground shrink-0">
          Context policy
        </Label>

        <ContextPolicyStackTrigger
          policies={policies}
          onEdit={openEdit}
          onDelete={handleDelete}
        />

        {showCompactInjectionControl && (
          <AgentContextInjectionSwitch agentId={agentId} compact />
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <BuilderRowAction kind="add" label="Add" aria-label="Add context policy" title="Add context policy" onClick={openAdd} />
          <BuilderRowAction
            kind="batch"
            aria-label="Batch add"
            title="Batch add variables and context policies from a scope type"
            onClick={() => openBatchImport({ agentId })}
          />
        </div>
      </div>

      {isMobile ? (
        <Drawer
          open={editorOpen}
          onOpenChange={(o) => !o && setEditorOpen(false)}
        >
          <DrawerContent className="px-4 pb-safe max-h-[92dvh]">
            <DrawerHeader className="px-0">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
            </DrawerHeader>
            <ScrollArea className="flex-1 overflow-y-auto pb-4">
              {editorBody}
            </ScrollArea>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={editorOpen}
          onOpenChange={(o) => !o && setEditorOpen(false)}
        >
          <DialogContent className="sm:max-w-[620px] max-h-[92dvh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 overflow-y-auto pr-2">
              <div className="py-1">{editorBody}</div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
