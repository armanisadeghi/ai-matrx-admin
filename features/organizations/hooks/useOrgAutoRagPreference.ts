// features/organizations/hooks/useOrgAutoRagPreference.ts
//
// The organization's auto-ingest controls for the knowledge graph.
//
// 🚨 THE TWO SWITCHES ARE KNOBS; THE BUDGET IS STILL A ROW (2026-10-22).
// `enabled` and `suggestionSweeps` read and write `knowledge.auto_rag_enabled`
// and `knowledge.suggestion_sweeps_enabled` at the `organization` rung through
// `lib/scoped-config` — the platform's one scoped-knob register. Until
// 2026-10-22 they were boolean COLUMNS on `iam.organization_preferences`,
// resolved by a second per-tenant precedence chain in aidream
// (`effective_setting.py`, now deleted). The server reads the register, so a
// control still writing those columns would move on screen and change nothing.
//
// The budget trio stays on the preference row and keeps the
// `public.org_preferences_set` door, because it is not one value per key: it is
// a CEILING the admin sets beside a live spend METER aidream writes
// (`daily_auto_rag_cost_used_usd`, `daily_auto_rag_window_start`), which the
// door deliberately refuses to let a browser reset. Moving the ceiling into the
// register is its own piece of work ("every limit is a knob"), filed as a node
// task — not a line in this hook.
//
// Surface budgeting math:
//   - `usedTodayUsd` / `budgetUsd` come straight from the row (millicents
//     rolled into USD by the auto-ingest writer).
//   - `percentUsed` is computed in-hook so consumers don't reinvent it.
//   - `windowStart` tells the user when the 24h cap will roll over.

"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import {
  AUTO_RAG_DEFAULT,
  AUTO_RAG_KEY,
  AUTO_RAG_KNOB,
  KNOWLEDGE_FEATURE,
  SUGGESTION_SWEEPS_DEFAULT,
  SUGGESTION_SWEEPS_KEY,
  SUGGESTION_SWEEPS_KNOB,
  asKnobBoolean,
} from "@/features/kg-suggestions/autoRagKnobs";
import { describeWriteFailure } from "@/lib/errors/writeFailure";
import { useEffectiveKnob } from "@/lib/scoped-config/effectiveKnobs.client";
import { knobRefusalSentence, setKnobOverride } from "@/lib/scoped-config/service";

export type OrgAutoRagField = "enabled" | "suggestionSweeps" | "budget";

/** Completes "Could not …" for a refused write of each field. */
export const FIELD_ACTION: Record<OrgAutoRagField, string> = {
  enabled: "change auto knowledge-graph for this organization",
  suggestionSweeps: "change scope-value suggestions for this organization",
  budget: "change the daily auto-ingest budget",
};

export interface UseOrgAutoRagPreferenceResult {
  enabled: boolean;
  /** Whether this org opts into auto-ingesting NON-PDF content (notes,
   * transcripts, web scrapes, etc.). NULL/false = OFF (the default); PDFs are
   * always indexed regardless. */
  /** Whether this org opts into suggestion sweeps — when a scope/field is
   * added, an agent proposes back-filled value suggestions over already-
   * extracted content. NULL/false = OFF (the default); suggestions always
   * require confirmation. */
  suggestionSweeps: boolean;
  /** Daily auto-ingest cap in USD (column default 5.00). */
  budgetUsd: number;
  /** Auto-ingest cost charged in the current 24h window. */
  usedTodayUsd: number;
  /** `usedTodayUsd / budgetUsd * 100`, clamped to `>= 0`. `Infinity` when budget is 0. */
  percentUsed: number;
  /** ISO timestamp the current 24h window started at. */
  windowStart: string | null;
  loading: boolean;
  saving: boolean;
  /** Which field's write is in flight (its control shows busy and keeps its value until it lands). */
  pendingField: OrgAutoRagField | null;
  error: string | null;
  setEnabled: (next: boolean) => Promise<void>;
  setSuggestionSweeps: (next: boolean) => Promise<void>;
  setBudgetUsd: (next: number) => Promise<void>;
}

const DEFAULT_BUDGET_USD = 5.0;

/** Stable empty map, so "nothing known for this organization" is not a new object each render. */
const EMPTY_KNOWN: Record<string, boolean> = {};

export function useOrgAutoRagPreference(
  organizationId: string | null,
): UseOrgAutoRagPreferenceResult {
  // The two switches are resolved from the register at the ORGANIZATION rung.
  // `userId` is deliberately null: this screen shows what the ORGANIZATION
  // decided, never what the admin happens to have chosen for themselves.
  const resolvedEnabled = useEffectiveKnob(organizationId, null, AUTO_RAG_KNOB);
  const resolvedSweeps = useEffectiveKnob(organizationId, null, SUGGESTION_SWEEPS_KNOB);
  // 🚨 ABSENT IS UNKNOWN, NEVER THE DEFAULT. A successful write calls
  // `invalidateEffectiveKnob`, which does `snapshots.clear()`, so between the
  // write and the refetch the snapshot answers `undefined`. Reading that as the
  // register default made a switch just turned OFF render ON for a frame. The
  // last value actually known — from the snapshot, or from the door's own
  // `effective_value`, which is authoritative and immediate — covers the gap.
  // 🚨 AND IT IS KEYED TO THE ORGANIZATION IT WAS LEARNED FOR. A snapshot answers
  // for ONE organization; this pane can be pointed at another. Holding the value
  // unkeyed showed the previous organization's setting — enabled, not loading —
  // until the new read landed. A value from another organization is not a value
  // we know about this one.
  const [lastKnown, setLastKnown] = useState<{
    organizationId: string | null;
    values: Record<string, boolean>;
  }>({ organizationId: null, values: {} });
  const forThisOrg =
    lastKnown.organizationId === organizationId ? lastKnown.values : EMPTY_KNOWN;
  const remember = useCallback(
    (key: string, value: boolean) => {
      setLastKnown((prev) =>
        prev.organizationId === organizationId
          ? { organizationId, values: { ...prev.values, [key]: value } }
          : { organizationId, values: { [key]: value } },
      );
    },
    [organizationId],
  );
  useEffect(() => {
    if (typeof resolvedEnabled === "boolean") remember(AUTO_RAG_KEY, resolvedEnabled);
  }, [resolvedEnabled, remember]);
  useEffect(() => {
    if (typeof resolvedSweeps === "boolean") remember(SUGGESTION_SWEEPS_KEY, resolvedSweeps);
  }, [resolvedSweeps, remember]);

  const knownEnabled =
    typeof resolvedEnabled === "boolean" ? resolvedEnabled : forThisOrg[AUTO_RAG_KEY];
  const knownSweeps =
    typeof resolvedSweeps === "boolean" ? resolvedSweeps : forThisOrg[SUGGESTION_SWEEPS_KEY];
  const enabled = asKnobBoolean(knownEnabled, AUTO_RAG_DEFAULT);
  const suggestionSweeps = asKnobBoolean(knownSweeps, SUGGESTION_SWEEPS_DEFAULT);
  const [budgetUsd, setBudgetState] = useState<number>(DEFAULT_BUDGET_USD);
  const [usedTodayUsd, setUsedTodayState] = useState<number>(0);
  const [windowStart, setWindowStart] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const { data, error: qErr } = await supabase
          .schema("iam").from("organization_preferences")
          .select(
            "daily_auto_rag_budget_usd, daily_auto_rag_cost_used_usd, daily_auto_rag_window_start",
          )
          .eq("organization_id", organizationId)
          .maybeSingle();
        if (cancelled) return;
        if (qErr) throw qErr;
        // Sensible defaults when the row hasn't been created yet — the first
        // auto-ingest charge will materialize it.
        setBudgetState(
          data?.daily_auto_rag_budget_usd ?? DEFAULT_BUDGET_USD,
        );
        setUsedTodayState(data?.daily_auto_rag_cost_used_usd ?? 0);
        setWindowStart(data?.daily_auto_rag_window_start ?? null);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          const w = describeWriteFailure(err, {
            action: "read this organization's auto-ingest budget",
            remedy: "Reload the page to try again.",
          });
          setError(`${w.title} ${w.description}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  // PENDING, NEVER OPTIMISTIC (GATES-TAIL-2): the value changes only once the door agreed; while
  // the write is in flight `saving` / `pendingField` say so, and a refusal leaves the value as it
  // was with `error` in words (describeWriteFailure), never the database's own line.
  const [pendingField, setPendingField] = useState<OrgAutoRagField | null>(null);

  const writePatch = useCallback(
    async (field: OrgAutoRagField, patch: Record<string, unknown>, apply: () => void) => {
      if (!organizationId) return;
      setSaving(true);
      setPendingField(field);
      try {
        // THROUGH THE DOOR. `iam` is not a client-writable schema (DOORS-ONLY-3).
        // `public.org_preferences_set` writes the preference flags and the budget
        // CEILING and cannot touch `daily_auto_rag_cost_used_usd` or
        // `daily_auto_rag_window_start` — the live spend meter aidream writes, which
        // the base-table UPDATE grant let a browser reset for itself.
        const { error: uErr } = await supabase.schema("iam").rpc("org_preferences_set", {
          p_organization_id: organizationId,
          p_patch: patch as never,
        });
        if (uErr) throw uErr;
        apply();
        setError(null);
      } catch (err) {
        const words = describeWriteFailure(err, { action: FIELD_ACTION[field], remedy: "Try again." });
        setError(`${words.title} ${words.description}`);
        throw err;
      } finally {
        setSaving(false);
        setPendingField(null);
      }
    },
    [organizationId],
  );

  // THROUGH THE KNOB DOOR. `platform.knob_override_set` decides authority,
  // refuses in words, records the change in the knob history and audit, and
  // busts the resolved snapshot — so the displayed value comes back from the
  // read and there is no local copy to keep in step.
  const writeKnob = useCallback(
    async (field: OrgAutoRagField, key: string, next: boolean) => {
      if (!organizationId) return;
      setSaving(true);
      setPendingField(field);
      // Whether the DOOR refused, which is the only case whose sentence is
      // already set. It must be a local flag: `callKnobOverrideSet` throws a
      // real `Error` WITH a message for every transport, permission and RPC
      // failure, so an `err instanceof Error && err.message` test can never
      // tell the two apart — it matched both, so a genuinely failed write set
      // NO message and the pane kept showing a stale sentence or nothing.
      let refused = false;
      try {
        const result = await setKnobOverride({
          feature: KNOWLEDGE_FEATURE,
          key,
          scopeKind: "organization",
          scopeId: organizationId,
          value: next,
          organizationId,
        });
        if (!result.ok) {
          const sentence = knobRefusalSentence(result);
          refused = true;
          setError(sentence);
          throw new Error(sentence);
        }
        remember(key, asKnobBoolean(result.effective_value, next));
        setError(null);
      } catch (err) {
        if (!refused) {
          const words = describeWriteFailure(err, {
            action: FIELD_ACTION[field],
            remedy: "Try again.",
          });
          setError(`${words.title} ${words.description}`);
        }
        throw err;
      } finally {
        setSaving(false);
        setPendingField(null);
      }
    },
    [organizationId, remember],
  );

  const setEnabled = useCallback(
    (next: boolean) => writeKnob("enabled", AUTO_RAG_KEY, next),
    [writeKnob],
  );
  const setSuggestionSweeps = useCallback(
    (next: boolean) => writeKnob("suggestionSweeps", SUGGESTION_SWEEPS_KEY, next),
    [writeKnob],
  );
  const setBudgetUsd = useCallback(
    async (next: number) => {
      if (!Number.isFinite(next) || next < 0) {
        throw new Error("Budget must be a non-negative number");
      }
      return writePatch("budget", { daily_auto_rag_budget_usd: next }, () => setBudgetState(next));
    },
    [writePatch],
  );

  const percentUsed =
    budgetUsd > 0 ? Math.max(0, (usedTodayUsd / budgetUsd) * 100) : Infinity;

  // The switches are not ready until their snapshot has resolved, or a skeleton
  // would be replaced by the register DEFAULT for a frame and then by the real
  // value — a switch that visibly changes state on its own.
  const knobsPending =
    Boolean(organizationId) && (knownEnabled === undefined || knownSweeps === undefined);

  return {
    enabled,
    suggestionSweeps,
    budgetUsd,
    usedTodayUsd,
    percentUsed,
    windowStart,
    loading: loading || knobsPending,
    saving,
    pendingField,
    error,
    setEnabled,
    setSuggestionSweeps,
    setBudgetUsd,
  };
}
