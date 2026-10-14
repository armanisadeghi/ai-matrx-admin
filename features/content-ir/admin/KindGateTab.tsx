"use client";

/**
 * Gate tab — runs the REAL dual gate (`registry/kind-dual-gate.ts`, the
 * activation law) in the browser against a selected `kind_example` row or a
 * pasted sample, and shows both legs with their failure detail:
 *
 *   structural — ajv over `emitted_json_schema` (Pydantic-parity leg)
 *   render     — an active `role='output'` component must exist, and a compiled
 *                bridge (when the kind has one) must produce real serverData.
 *                Satisfied by EITHER tier: a compiled `legacyBlockType` bridge
 *                or a `source='db'` `kind_component` row. n/a for data-only
 *                contract families.
 *
 * READ-ONLY by design: this page never writes `is_active` — it shows what the
 * gate WOULD decide, which is what makes it trustworthy as the thing you check
 * after a change. The write path is `content_ir.set_kind_activation`, surfaced
 * on the owner's studio page (`/shapes/[kind]`). Loaded via
 * next/dynamic({ ssr:false }) behind its tab so ajv stays out of the initial
 * chunk.
 */

import { Button, Select } from "@ai-matrx/design-system/controls";
import { useEffect, useState } from "react";
import { Check, CircleAlert, Info, Play, X } from "lucide-react";
import {
  describeDualGateFailure,
  runKindDualGate,
  validateStructuralLeg,
  type DualGateDefinition,
  type LegResult,
} from "@ai-matrx/content-ir";
import { kindRegistry } from "@/features/content-ir/registry/kind-registry";
import {
  componentRegistry,
  resolveSharedComponent,
} from "@/features/content-ir/registry/component-registry";
import { GENERATED_CONTRACT_FAMILY_VALUES } from "@/features/content-ir/registry/schema-source-kind-tables";
import type { Json } from "@/types/database.types";
import type { ExamplesState } from "@/features/content-ir/studio/kind-examples";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdminDebugger } from "@/lib/redux/selectors/userSelectors";

const PASTED = "__pasted__";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface GateRun {
  ranAgainst: string;
  structural: LegResult;
  /** null = not runnable (sample is not an object — no block render path). */
  render: LegResult | null;
  wouldActivate: boolean;
  failureSummary: string;
}

/** Pure gate execution — the dual gate itself is synchronous, so the
 * canonical example's verdict is computed during render (no effect) and a
 * manual "Run gate now" simply stores a fresh run. */
function computeGateRun(
  kind: string,
  sample: unknown,
  ranAgainst: string,
  emittedJsonSchema: Json | null,
  family: string | null,
): GateRun {
  const def = kindRegistry.getDefinition(kind);
  const gateDefinition: DualGateDefinition | null = def
    ? {
        legacyBlockType: def.legacyBlockType,
        toLegacyServerData: def.toLegacyServerData,
        component: def.component,
      }
    : null;

  // The resolver answers for BOTH tiers, so an agent-authored kind whose
  // renderer is a `source='db'` row satisfies the render leg the same way a
  // compiled one does. Without this the gate reports "no component" about
  // kinds that have a live, working component.
  // The SHARED answer explicitly: the admin gate grades what everyone gets,
  // never this viewer's own layered view.
  const resolution = resolveSharedComponent(kind, "web", "output");
  // Data-only contract families are never rendered — the render leg is n/a
  // (shape-doctor's `data_only` rule, mirrored by
  // `content_ir.evaluate_kind_activation`).
  const dataOnly = family !== null && GENERATED_CONTRACT_FAMILY_VALUES.has(family);

  if (isRecord(sample)) {
    const result = runKindDualGate({
      kind,
      sample,
      emittedJsonSchema,
      definition: gateDefinition,
      resolvedComponent: resolution
        ? {
            componentKey: resolution.componentKey,
            isActive: resolution.isActive,
            source: resolution.source,
          }
        : null,
      dataOnly,
    });
    return {
      ranAgainst,
      structural: result.structural,
      render: result.render,
      wouldActivate: result.isActive,
      failureSummary: describeDualGateFailure(kind, result),
    };
  }

  // Scalar/array samples (workflow I/O kinds): only the structural leg is
  // runnable — there is no block render path to exercise.
  const structural = validateStructuralLeg(sample, emittedJsonSchema);
  return {
    ranAgainst,
    structural,
    render: null,
    wouldActivate: false,
    failureSummary: structural.ok
      ? `kind "${kind}" sample is not an object — the render leg cannot run, so the dual gate cannot pass`
      : `structural(Pydantic): ${structural.detail ?? "failed"}`,
  };
}

interface KindGateTabProps {
  kind: string;
  emittedJsonSchema: Json | null;
  examples: ExamplesState;
  /** `kind_definition.metadata.family` — drives the render leg's n/a doctrine. */
  family?: string | null;
  /** Whether the shape is switched on today — the check advises, it never switches anything. */
  isActive?: boolean;
}

export default function KindGateTab({
  kind,
  emittedJsonSchema,
  examples,
  family = null,
  isActive = false,
}: KindGateTabProps) {
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [manualRun, setManualRun] = useState<GateRun | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const debug = useAppSelector(selectIsAdminDebugger);

  // `resolveComponent` is SYNCHRONOUS and answers from the compiled floor until
  // the DB tier warms. Running the gate before that resolves a `source='db'`
  // component to nothing and reports "no component" about a kind that has a
  // live one — a false negative that depends purely on timing. Gate the whole
  // verdict on the warm tick rather than publishing a wrong answer first.
  const [componentsWarm, setComponentsWarm] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void componentRegistry
      .ensureWarm()
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) setComponentsWarm(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = examples.status === "ready" ? examples.rows : [];
  const selectedId = sourceId ?? rows[0]?.id ?? PASTED;

  // The canonical example's verdict, computed during render (rows come
  // canonical-first from the shell's fetch). A manual run supersedes it.
  const autoRun =
    rows.length > 0 && componentsWarm
      ? computeGateRun(
          kind,
          rows[0].data,
          rows[0].isCanonical
            ? "canonical example"
            : `example ${rows[0].id.slice(0, 8)}`,
          emittedJsonSchema,
          family,
        )
      : null;
  const run = manualRun ?? autoRun;

  function runNow() {
    setInputError(null);
    if (selectedId === PASTED) {
      if (!pasted.trim()) {
        setInputError("Paste a JSON sample first.");
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(pasted);
      } catch (err) {
        setInputError(
          `Pasted sample is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }
      setManualRun(
        computeGateRun(kind, parsed, "pasted sample", emittedJsonSchema, family),
      );
      return;
    }
    const row = rows.find((r) => r.id === selectedId);
    if (!row) {
      setInputError("Selected example no longer exists.");
      return;
    }
    setManualRun(
      computeGateRun(
        kind,
        row.data,
        row.isCanonical ? "canonical example" : `example ${row.id.slice(0, 8)}`,
        emittedJsonSchema,
        family,
      ),
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      {/* Sample source */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground" htmlFor="gate-sample-source">
          Sample
        </label>
        <Select
          aria-label="Sample"
          value={selectedId}
          onValueChange={setSourceId}
          options={[
            ...rows.map((r) => ({
              value: r.id,
              label: `${r.isCanonical ? "canonical" : r.source} · ${r.label ?? r.id.slice(0, 8)} · ${r.validationStatus}`,
            })),
            { value: PASTED, label: "Pasted sample" },
          ]}
        />
        <Button variant="primary" icon={<Play />} onClick={runNow}>
          Run gate now
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Read-only — running this never changes the shape.
        </span>
      </div>

      {examples.status === "error" && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          {examples.message} — paste a sample to run the gate anyway.
          <ErrorAlchemyMenu error={examples.message} />
        </div>
      )}

      {selectedId === PASTED && (
        <Textarea mono minHeight={192} maxHeight={192}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder={`{ "__kind": "${kind}", ... }`}
          spellCheck={false}
          className="w-full"
        />
      )}

      {inputError && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          {inputError}
          <ErrorAlchemyMenu error={inputError} />
        </div>
      )}

      {emittedJsonSchema === null && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <Info className="h-3.5 w-3.5 shrink-0" />
          No schema yet — the structural leg fails until one exists
        </div>
      )}

      {/* Legs */}
      {run && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <LegCard
              debug={debug}
              failText="This sample doesn't match the shape's fields."
              title="Structure check"
              subtitle="Checked against the emitted schema"
              leg={run.structural}
            />
            <LegCard
              debug={debug}
              failText="The shape can't be drawn from this sample yet."
              title="Drawing check"
              subtitle="Checked by drawing the shape from the sample"
              leg={run.render}
            />
          </div>

          <div
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              run.wouldActivate
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                : "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300"
            }`}
          >
            {run.wouldActivate ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <p className="font-medium">
                {run.wouldActivate
                  ? `Against the ${run.ranAgainst}, this shape passes.`
                  : isActive
                    ? `Against the ${run.ranAgainst}, this shape does not pass. It is still switched on; this check is advice, not a switch.`
                    : `Against the ${run.ranAgainst}, this shape does not pass yet.`}
              </p>
              {debug && !run.wouldActivate && run.failureSummary && (
                <p className="mt-0.5 font-mono text-xs opacity-90">
                  {run.failureSummary}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {examples.status === "loading" && !run && (
        <p className="text-xs text-muted-foreground">
          Waiting for saved samples — or paste your own
        </p>
      )}
    </div>
  );
}

function LegCard({
  title,
  subtitle,
  leg,
  debug,
  failText,
}: {
  /** Admin debugging only: the raw checker message. */
  debug: boolean;
  /** What a failure means, in the reader's words. */
  failText: string;
  title: string;
  subtitle: string;
  leg: LegResult | null;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        {leg === null ? (
          <Info className="h-4 w-4 text-muted-foreground" />
        ) : leg.ok ? (
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <X className="h-4 w-4 text-red-500" />
        )}
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span
          className={`ml-auto rounded px-1.5 py-0.5 text-[11px] font-medium ${
            leg === null
              ? "bg-muted text-muted-foreground"
              : leg.ok
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/10 text-red-700 dark:text-red-300"
          }`}
        >
          {leg === null ? "not runnable" : leg.ok ? "pass" : "fail"}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>
      <p className={`mt-2 text-xs text-foreground ${debug ? "font-mono" : ""}`}>
        {leg === null
          ? "This sample isn't a set of named fields, so there is nothing to draw."
          : debug
            ? (leg.detail ?? (leg.ok ? "passed" : "failed"))
            : leg.ok
              ? "Passed."
              : failText}
      </p>
    </div>
  );
}
