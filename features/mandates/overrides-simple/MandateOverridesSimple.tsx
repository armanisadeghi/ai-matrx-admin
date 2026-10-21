"use client";

/**
 * MandateOverridesSimple — the simple Overrides tab for one mandate.
 *
 * Arman, 2026-09-24, on the existing tab: *"All it's really doing is showing
 * you what the current agent's settings are and then letting you override
 * them."* Since 2026-10-21 (one settings experience) the rows ARE the agent
 * builder's: THE model-settings panel through `ConversationModelSettings`
 * over this level's draft — the agent's value on every row, a change made
 * here with its own reset back to the agent, the model row with a
 * "Use the agent's model" choice. Same data, same writer as the binding
 * screen (`OneBindingWorkspace`):
 *   · the draft lives in the canonical `instanceModelOverrides` slice, seeded
 *     with the agent's own settings (plus anything a higher level already
 *     overrides);
 *   · Save builds the body with `buildBindingSavePayload` and writes it through
 *     `putMandateBinding` — the stored holder, mapping and auto-run are sent
 *     back unchanged, and `config_overrides` is `selectSettingsOverridesForApi`.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ReadFailure } from "@ai-matrx/design-system";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { toast } from "@/lib/toast";
import { isJsonObject, type JsonObject } from "@/types/json";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { selectIsSuperAdmin } from "@/lib/redux/slices/userSlice";
import { useMandateSystemSeat } from "@/features/mandates/admin/useMandateSystemSeat";
import { displayResolutionOrgId, usePageOrgFilter } from "@/features/mandates/display-org";
import { useOrganizationsWith } from "@/features/organizations/hooks/useOrganizationsWith";
import { fetchAgentVersionSnapshot, resolveAgentVersionId } from "@/features/agents/redux/builder-versions.thunks";
import { fetchAgentExecutionFull } from "@/features/agents/redux/builder-tier.thunks";
import {
  selectAgentCustomExecutionPayload,
} from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import {
  initInstanceOverrides,
  markRemoved,
  removeInstanceOverrides,
  replaceOverrides,
  setOverrides,
} from "@ai-matrx/chat/agents/redux/execution-system/instance-model-overrides/instance-model-overrides.slice";
import {
  selectInstanceOverrideState,
  selectSettingsOverridesForApi,
} from "@ai-matrx/chat/agents/redux/execution-system/instance-model-overrides/instance-model-overrides.selectors";
import { buildInstanceBaseSettings } from "@ai-matrx/chat/agents/redux/execution-system/instance-model-overrides/base-settings";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { ConversationModelSettings } from "@ai-matrx/chat/agents/components/run-controls/ConversationModelSettings";
import { fetchMandateLadder } from "@/features/mandates/workspace/useMandateLadder";
import {
  inheritedModelOverrides,
  MODEL_OVERRIDE_SOURCE,
} from "@/features/bindings/inherited-model-overrides";
import { parseBindingWave1 } from "@/features/mandates/provision-shapes";
import { useMandateInputSurface } from "@/features/mandates/input-surface";
import { describedOfferFrom } from "@/features/bindings/described-offer";
import { buildBindingSavePayload } from "@/features/mandates/workspace/save-payload";
import {
  putMandateBinding,
  putMandateDefaultHolder,
} from "@/features/mandates/overrides";
import { defaultAnswerSettingsOf } from "@/features/bindings/system-answer-record";
import {
  SYSTEM_RUNG_PERSONAL_HOLDER_REFUSAL,
  systemRungHolderIsPersonal,
} from "@/features/bindings/system-rung";
import { DEFAULT_HOLDER_RUNG } from "@/features/bindings/default-holder-rung";
import { GlobalBindAgentGuard } from "@/features/surfaces/components/bind/GlobalBindAgentGuard";
import { describeFailure } from "@/lib/failure/transport";
import type { WorkspaceRung } from "@/features/bindings/ScopeHolderBar";
import type {
  MandateBindingRowDb,
  MandateWorkspaceData,
} from "@/features/mandates/workspace/useMandateWorkspaceData";
import {
  defaultHolderDraftOf,
  effectiveAgentId,
  findBinding,
  holderChoiceForSave,
  holderDraftOf,
  overridesHolderOf,
  rungForLevel,
  withoutUnpicked,
  type OverridesLevel,
  type ResolvedHolderForOverrides,
} from "./binding-lookup";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { storedMandateKey } from "@ai-matrx/agents/mandates";
import { useBuiltinAgents } from "@ai-matrx/chat/agents/identity/agent-catalog-lists";

export type {
  OverridesLevel,
  ResolvedHolderForOverrides,
} from "./binding-lookup";

export interface MandateOverridesSimpleProps {
  data: MandateWorkspaceData;
  /** Which level's overrides this edits — the workspace's own perspective. */
  level: OverridesLevel;
  /** Required for `level="organization"`: the organization being edited. */
  organizationId?: string | null;
  /** Called after a successful save so the host re-reads the mandate. */
  onChanged: () => void;
  /**
   * Who runs this job for the viewer today (the server's verdict). Used when
   * this level names no holder of its own — the usual case for a person — so
   * the tab shows the settings of the agent that actually runs. Omitted on
   * the system level, which is the bottom of the ladder.
   */
  resolvedHolder?: ResolvedHolderForOverrides | null;
}

/**
 * Keyed to the exact stored row it edits, so a save (which moves
 * `updated_at`) re-seeds the draft from what the server now holds.
 */
export function MandateOverridesSimple({
  data,
  level,
  organizationId = null,
  onChanged,
  resolvedHolder = null,
}: MandateOverridesSimpleProps) {
  const userId = useAppSelector(selectUserId);
  const rung = rungForLevel(level, data);
  const orgId = level === "organization" ? organizationId : null;
  const binding = findBinding(data.bindings, rung, userId, orgId);
  const resolvedKey =
    resolvedHolder?.status === "ready"
      ? `${resolvedHolder.agentId}:${resolvedHolder.versionId ?? ""}`
      : (resolvedHolder?.status ?? "");
  // On the bottom rung the edited row IS the definition, so its `updated_at`
  // is what a save moves.
  const identity = `${data.mandate.id}:${rung}:${orgId ?? ""}:${binding?.id ?? "new"}:${binding?.updated_at ?? (rung === DEFAULT_HOLDER_RUNG ? (data.mandate.updated_at ?? "") : "")}:${resolvedKey}`;
  return (
    <OverridesBody
      key={identity}
      data={data}
      level={level}
      rung={rung}
      organizationId={orgId}
      binding={binding}
      onChanged={onChanged}
      resolvedHolder={resolvedHolder}
    />
  );
}

type LoadState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

/** Key-order-independent serialization, for "is there anything unsaved?". */
function stableJson(value: Record<string, unknown> | null | undefined): string {
  if (!value) return "{}";
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) sorted[key] = value[key];
  return JSON.stringify(sorted);
}

/** The panel's words on this tab: the baseline is the agent that runs this job. */
const MANDATE_OVERRIDE_WORDS = {
  modelEmptyChoiceLabel: "Use the agent's model",
  baselineSourceLabel: "Agent",
  noModelNote: "No model resolved for this agent yet.",
};

function OverridesBody({
  data,
  level,
  rung,
  organizationId,
  binding,
  onChanged,
  resolvedHolder,
}: {
  data: MandateWorkspaceData;
  level: OverridesLevel;
  rung: WorkspaceRung;
  organizationId: string | null;
  binding: MandateBindingRowDb | null;
  onChanged: () => void;
  resolvedHolder: ResolvedHolderForOverrides | null;
}) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const pageOrgFilter = usePageOrgFilter();
  const { organizations } = useOrganizationsWith([organizationId, pageOrgFilter, data.mandate.organization_id]);
  // Admin feature "mandate.system-seat": the system answer of a SYSTEM mandate.
  const holdsSystemSeat = useMandateSystemSeat(data.mandate);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin) || holdsSystemSeat;
  const builtinAgents = useBuiltinAgents();

  const ownHolder =
    rung === DEFAULT_HOLDER_RUNG
      ? defaultHolderDraftOf(data.mandate)
      : holderDraftOf(binding);
  // This level usually names nobody (a person rarely picks their own agent):
  // then the agent that actually runs — from a lower rung — is the one whose
  // settings are shown and overridden.
  const picked = overridesHolderOf(ownHolder, rung, data, resolvedHolder);
  const holder =
    picked.source === "own" || picked.source === "resolved"
      ? picked.holder
      : ownHolder;
  const inheritedHolder = picked.source === "resolved";
  const agentId =
    picked.source === "own" || picked.source === "resolved"
      ? effectiveAgentId(holder, data)
      : null;
  const selectedVersionId = holder.useLatest ? null : holder.agentVersionId;
  // The row the settings live on: the job's own default on the system level
  // (aidream 1037), the level's binding everywhere else.
  const settingsRow =
    rung === DEFAULT_HOLDER_RUNG
      ? defaultAnswerSettingsOf(data.mandate)
      : binding;
  const storedOverrides: JsonObject | null = isJsonObject(
    settingsRow?.config_overrides,
  )
    ? settingsRow.config_overrides
    : null;
  const storedJson = JSON.stringify(storedOverrides);

  // Its own scratch entry — never shared with the existing tab's draft.
  const instanceId = `mandate-overrides-simple-${data.mandate.id}-${rung}-${organizationId ?? "self"}`;
  const entry = useAppSelector(selectInstanceOverrideState(instanceId));
  const wireJson = useAppSelector((s) =>
    stableJson(selectSettingsOverridesForApi(instanceId)(s)),
  );

  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [retry, setRetry] = useState(0);
  const [holderSettings, setHolderSettings] = useState<Record<string, unknown>>(
    {},
  );
  const [sources, setSources] = useState<Record<string, string>>({});
  const [savedJson, setSavedJson] = useState<string>("{}");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [guardOpen, setGuardOpen] = useState(false);

  useEffect(
    () => () => {
      dispatch(removeInstanceOverrides(instanceId));
    },
    [dispatch, instanceId],
  );

  // ── Seed: the agent's own settings, plus what higher levels override ──────
  // Same sequence as the existing tab (OneBindingWorkspace "Settings
  // overrides"), so both show the same baseline for the same row.
  // The person level inherits from the mandate's own home organization (or the
  // page's org filter) — never from whichever organization is active.
  const inheritanceOrganizationId =
    rung === "org"
      ? organizationId
      : displayResolutionOrgId({
          pageOrgFilter,
          homeOrganizationId: data.mandate.organization_id,
          memberOrganizationIds: organizations.map((o) => o.id),
        });
  useEffect(() => {
    if (holder.kind !== "agent" || !agentId) return;
    let cancelled = false;
    setLoad({ status: "loading" });
    void (async () => {
      let referenceId = agentId;
      if (selectedVersionId) {
        const version = await dispatch(
          resolveAgentVersionId(selectedVersionId),
        ).unwrap();
        if (!version)
          throw new Error("The pinned agent version is unavailable.");
        await dispatch(
          fetchAgentVersionSnapshot({
            agentId: version.agentId,
            version: version.versionNumber,
          }),
        ).unwrap();
        referenceId = selectedVersionId;
      } else {
        await dispatch(fetchAgentExecutionFull(agentId)).unwrap();
      }
      if (cancelled) return;
      const payload = selectAgentCustomExecutionPayload(
        store.getState(),
        referenceId,
      );
      if (!payload.isReady)
        throw new Error("The agent's settings could not be read.");
      const own = buildInstanceBaseSettings(payload.settings, payload.modelId);
      // The org level reads ITS organization's rung, so it needs one. The
      // person level never waits on an organization: without one the ladder
      // simply has no organization rung.
      if (rung === "org" && !inheritanceOrganizationId) {
        throw new Error("Pick the organization first.");
      }
      const ladder =
        rung === "org" || rung === "user"
          ? await fetchMandateLadder(
              storedMandateKey(data.mandate.mandate_key),
              inheritanceOrganizationId,
            )
          : [];
      if (cancelled) return;
      const inherited = inheritedModelOverrides(ladder, rung);
      dispatch(
        initInstanceOverrides({
          conversationId: instanceId,
          baseSettings: { ...own, ...inherited.values },
        }),
      );
      const stored = JSON.parse(storedJson) as JsonObject | null;
      if (stored) {
        const changes: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(stored)) {
          if (value === null)
            dispatch(markRemoved({ conversationId: instanceId, key }));
          else changes[key] = value;
        }
        if (Object.keys(changes).length)
          dispatch(setOverrides({ conversationId: instanceId, changes }));
      }
      setHolderSettings(own as Record<string, unknown>);
      setSources(inherited.sources);
      setSavedJson(
        stableJson(selectSettingsOverridesForApi(instanceId)(store.getState())),
      );
      setLoad({ status: "ready" });
    })().catch((error: unknown) => {
      if (!cancelled)
        setLoad({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "The agent's settings could not be read.",
        });
    });
    return () => {
      cancelled = true;
    };
  }, [
    holder.kind,
    agentId,
    selectedVersionId,
    rung,
    inheritanceOrganizationId,
    data.mandate.mandate_key,
    instanceId,
    storedJson,
    retry,
    dispatch,
    store,
  ]);

  // ── The mandate's offer decides whether the mapping travels (unchanged) ───
  const surfaceState = useMandateInputSurface(
    data.provisionKey ? null : storedMandateKey(data.mandate.mandate_key),
  );
  const describedOffer =
    !data.provisionKey && surfaceState.status === "ready"
      ? describedOfferFrom({
          mandateKey: storedMandateKey(data.mandate.mandate_key),
          label: data.mandate.label,
          draftInputs: (data.mandate as { draft_inputs?: unknown })
            .draft_inputs,
          surface: surfaceState.surface,
        })
      : null;
  const offerKnown =
    Boolean(data.offer) ||
    Boolean(data.provisionKey) ||
    surfaceState.status !== "loading";
  const hasOffer = Boolean(data.offer ?? describedOffer);

  const dirty = load.status === "ready" && wireJson !== savedJson;

  function cancel() {
    dispatch(
      replaceOverrides({
        conversationId: instanceId,
        changes: JSON.parse(savedJson) as Record<string, unknown>,
      }),
    );
    setSaveError(null);
  }

  // ── Who may save, said beside the button (never a dead Save) ───────────────
  const systemLevel = level === "system";
  const orgRole = organizations.find((o) => o.id === organizationId)?.role;
  const refusal = !offerKnown
    ? "Reading this job…"
    : systemLevel && !isSuperAdmin
      ? "Only a super admin can change this for everyone."
      : systemLevel &&
          systemRungHolderIsPersonal(
            agentId,
            builtinAgents.map((a) => a.id),
          )
        ? SYSTEM_RUNG_PERSONAL_HOLDER_REFUSAL
        : level === "organization" && !organizationId
          ? "Pick the organization first."
          : level === "organization" &&
              orgRole !== "owner" &&
              orgRole !== "admin"
            ? "Only an owner or admin of this organization can change this."
            : null;

  async function write(bindAgentId: string | null) {
    setBusy(true);
    setSaveError(null);
    try {
      const captured = selectSettingsOverridesForApi(instanceId)(
        store.getState(),
      );
      const stored = parseBindingWave1(settingsRow);
      const consumptionMap = withoutUnpicked(stored.consumptionMap);
      if (systemLevel) {
        // 🚨 THE SYSTEM ANSWER IS THE JOB'S OWN DEFAULT (aidream 1037). Its
        // settings are written to the default itself — never to a
        // platform-wide binding beside it. The holder, map and auto-run go
        // back exactly as stored; only `config_overrides` changes here.
        const own = defaultHolderDraftOf(data.mandate);
        const swapped = bindAgentId != null && bindAgentId !== agentId;
        const result = await putMandateDefaultHolder(
          dispatch,
          storedMandateKey(data.mandate.mandate_key),
          own.kind === "workflow"
            ? {
                holderType: "workflow",
                agentId: null,
                agentVersionId: null,
                useLatest: true,
                holderId: own.workflowId,
                holderVersionId: null,
              }
            : {
                holderType: "agent",
                agentId: swapped
                  ? bindAgentId
                  : own.useLatest
                    ? own.agentId
                    : null,
                agentVersionId:
                  swapped || own.useLatest ? null : own.agentVersionId,
                useLatest: swapped ? true : own.useLatest,
                holderId: null,
                holderVersionId: null,
              },
          {
            configOverrides:
              captured && Object.keys(captured).length > 0
                ? (captured as JsonObject)
                : null,
          },
        );
        if (result.notes.length > 0) {
          toast.warning("Saved", {
            description: result.notes.join(" "),
            duration: 12_000,
          });
        } else {
          toast.success("Saved");
        }
        onChanged();
        return;
      }
      const payload = buildBindingSavePayload({
        holder: holderChoiceForSave({ picked, agentId, bindAgentId }),
        hasOffer,
        consumptionMap,
        autoRun: stored.autoRun,
        settingsOpened: true,
        capturedOverrides: isJsonObject(captured) ? captured : undefined,
        storedOverrides,
      });
      const report = await putMandateBinding(
        dispatch,
        storedMandateKey(data.mandate.mandate_key),
        level === "organization"
          ? { principalType: "org", organizationId: organizationId as string }
          : { principalType: "user" },
        payload,
      );
      if (report.notes.length > 0) {
        toast.warning("Saved", {
          description: report.notes.join(" "),
          duration: 12_000,
        });
      } else {
        toast.success("Saved");
      }
      onChanged();
    } catch (err) {
      const failure = describeFailure(err, {
        action: "saving these settings",
        retrySafe: true,
        fallback: "Save failed.",
      });
      setSaveError(
        failure.remedy
          ? `${failure.sentence} ${failure.remedy}`
          : failure.sentence,
      );
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (refusal || busy) return;
    // Every system-level write decides for everyone — the same audit the
    // existing tab runs before it (builtin agents pass straight through).
    if (systemLevel && agentId) {
      setGuardOpen(true);
      return;
    }
    void write(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (holder.kind === "workflow") {
    return (
      <p className="type-body text-muted-foreground">
        A workflow runs this job; it has no model settings.
      </p>
    );
  }
  if (picked.source === "loading") {
    return (
      <RegionSkeleton shape="form" count={4} aria-label="Reading who runs this job" />
    );
  }
  if (picked.source === "error") {
    return (
      <ReadFailure
        error={picked.error}
        what="who runs this job for you"
        className="m-0"
      />
    );
  }
  if (!agentId) {
    return (
      <p className="type-body text-muted-foreground">
        {picked.source === "none" && picked.message
          ? picked.message
          : "No agent is set for this job yet."}
      </p>
    );
  }

  const agentName = data.agentsById[agentId]?.name ?? "this agent";

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 items-center gap-1.5 type-body text-muted-foreground">
          <span className="shrink-0">Settings from</span>
          <EntityRef
            token="agent"
            id={agentId}
            name={agentName}
            showIcon={false}
            labelClassName="font-medium text-foreground"
          />
          {inheritedHolder ? (
            <span className="shrink-0 type-secondary text-muted-foreground">
              (runs for you today)
            </span>
          ) : null}
        </div>
      </div>

      {load.status === "error" ? (
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 type-body">
          <span className="text-destructive">{load.message} <ErrorAlchemyMenu error={load.message} /></span>
          <Button
            variant="outline"
            onClick={() => setRetry((n) => n + 1)}
          >
            Retry
          </Button>
        </div>
      ) : load.status === "loading" || !entry ? (
        <RegionSkeleton shape="form" count={4} aria-label="Reading the agent's settings" />
      ) : (
        // THE model-settings panel (the builder's rows) over this level's draft.
        <ConversationModelSettings
          conversationId={instanceId}
          model="override"
          words={MANDATE_OVERRIDE_WORDS}
          inheritedSources={sources}
          nullOverrideDefaults={holderSettings}
          overrideSource={MODEL_OVERRIDE_SOURCE[rung]}
          disabled={busy}
        />
      )}

      {dirty || saveError ? (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {saveError ? (
            <span className="mr-auto type-body text-destructive">
              {saveError}
              <ErrorAlchemyMenu error={saveError} />
            </span>
          ) : refusal ? (
            <span className="mr-auto type-body text-muted-foreground">
              {refusal}
              <ErrorAlchemyMenu error={refusal} />
            </span>
          ) : null}
          {dirty ? (
            <>
              <Button
                variant="quiet"
                onClick={cancel}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={save}
                disabled={busy || refusal !== null}
              >
                {busy ? "Saving…" : "Save"}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {systemLevel && agentId ? (
        <GlobalBindAgentGuard
          open={guardOpen}
          agentId={agentId}
          onProceed={(id) => {
            setGuardOpen(false);
            void write(id === agentId ? null : id);
          }}
          onUseSystemTwin={(twin) => {
            setGuardOpen(false);
            void write(twin.id);
          }}
          onCancel={() => setGuardOpen(false)}
        />
      ) : null}
    </div>
  );
}
