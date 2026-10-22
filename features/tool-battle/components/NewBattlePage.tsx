"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Swords, Trash2 } from "lucide-react";
import { Badge, Button, EmptyState, Input, RegionSkeleton, SearchField, Switch, Textarea, Tile } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { Checkbox } from "@/components/ui/checkbox";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { useAppDispatch } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { createBattle, fetchJobParameters, listBattleJobs, listBattleSources } from "../service";
import { coerce, inputFields, subjectLabel, type InputField } from "../subjectFields";
import type { BattleJob, BattleSource } from "../types";
import { BypassStrip } from "./BypassStrip";
import { BATTLE_HOME } from "./ToolBattlePage";

/** The server's own ceilings (knobs `tools.battle.max_lanes` / `max_subjects`); it refuses past them. */
const MAX_LANES = 6;

type Rows = Record<string, string>[];

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs tabular-nums">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function NewBattlePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [jobs, setJobs] = useState<BattleJob[] | null>(null);
  const [jobsError, setJobsError] = useState<unknown>(null);
  const [query, setQuery] = useState("");
  const [job, setJob] = useState<BattleJob | null>(null);
  const [sources, setSources] = useState<BattleSource[] | null>(null);
  const [sourcesError, setSourcesError] = useState<unknown>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [rows, setRows] = useState<Rows>([{}]);
  const [more, setMore] = useState(false);
  const [paste, setPaste] = useState("");
  const [title, setTitle] = useState("");
  const [blind, setBlind] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    listBattleJobs().then(
      (j) => alive && setJobs(j),
      (e) => alive && setJobsError(e),
    );
    return () => {
      alive = false;
    };
  }, []);

  const choose = (next: BattleJob) => {
    setJob(next);
    setSources(null);
    setSourcesError(null);
    setPicked([]);
    setRows([{}]);
    fetchJobParameters(next.toolId).then(
      (parameters) => setJob((current) => (current?.toolId === next.toolId ? { ...current, parameters } : current)),
      (e) => setSourcesError(e),
    );
    listBattleSources(next.toolId).then(
      (s) => {
        setSources(s);
        setPicked(s.filter((x) => x.state === "live").slice(0, 3).map((x) => x.endpointId));
      },
      (e) => setSourcesError(e),
    );
  };

  const fields: InputField[] = job ? inputFields(job.parameters) : [];
  const shown = fields.filter((f) => more || f.primary);
  const primary = fields.find((f) => f.required) ?? fields[0];

  const addPasted = () => {
    if (!primary) return;
    const lines = paste.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setRows((r) => [...r.filter((x) => Object.values(x).some(Boolean)), ...lines.map((l) => ({ [primary.key]: l }))]);
    setPaste("");
  };

  const subjects = rows
    .map((row, i) => {
      const inputs: Record<string, unknown> = {};
      for (const f of fields) {
        const v = coerce(f, row[f.key] ?? "");
        if (v !== undefined) inputs[f.key] = v;
      }
      return { label: subjectLabel(inputs, `Subject ${i + 1}`), inputs };
    })
    .filter((s) => Object.keys(s.inputs).length > 0);
  const missing = subjects.some((s) => fields.some((f) => f.required && s.inputs[f.key] === undefined));
  const lookups = picked.length * subjects.length;
  const canRun = job !== null && picked.length >= 2 && picked.length <= MAX_LANES && subjects.length > 0 && !missing && !busy;

  const run = async () => {
    if (!job) return;
    setBusy(true);
    const chosen = (sources ?? []).filter((s) => picked.includes(s.endpointId));
    const result = await createBattle(dispatch, {
      title: title.trim(),
      job_key: job.jobKey,
      tool_id: job.toolId,
      lanes: chosen.map((s) => ({
        endpoint_id: s.endpointId,
        label: `${s.providerName}${s.via === "treg" ? " via treg" : ""}`,
        provider_slug: s.providerSlug,
        via: s.via,
      })),
      subjects,
      blind,
      run: true,
    });
    setBusy(false);
    if (result.error || !result.data) {
      toast.error(result.error ?? "Could not start the battle.");
      return;
    }
    router.push(`${BATTLE_HOME}/${result.data.battle_id}`);
  };

  const visibleJobs = (jobs ?? []).filter((j) => `${j.displayName} ${j.jobKey} ${j.jobFamily}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <RecordPageHeader
        backHref={BATTLE_HOME}
        parents={[{ label: "Tool Battle", href: BATTLE_HOME }]}
        level={{ name: "New battle" }}
        actions={[{ label: lookups ? `Run ${lookups} lookups` : "Run", icon: Swords, primary: true, showLabel: true, disabled: !canRun, onPress: () => void run() }]}
      />
      <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col gap-6 overflow-y-auto [&>*]:shrink-0 px-[var(--matrx-page-gutter)] pb-10 pt-[calc(var(--shell-header-h)+var(--matrx-page-top))]">
        <BypassStrip />
        <Section n={1} title="Job">
          {jobsError ? (
            <ReadFailure what="catalog" error={jobsError} />
          ) : jobs === null ? (
            <RegionSkeleton shape="rows" count={3} aria-label="Loading jobs" />
          ) : jobs.length === 0 ? (
            <EmptyState icon={<Swords />} title="No catalog Tools yet" />
          ) : (
            <>
              <SearchField value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search jobs" />
              <div className="grid max-h-64 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {visibleJobs.map((j) => (
                  <Tile
                    key={j.toolId}
                    title={j.displayName}
                    line={`${j.jobFamily} · ${j.jobKey}`}
                    selected={job?.toolId === j.toolId}
                    onClick={() => choose(j)}
                  />
                ))}
              </div>
            </>
          )}
        </Section>

        {job && (
          <Section n={2} title="Sources">
            {sourcesError ? (
              <ReadFailure what="sources" error={sourcesError} />
            ) : sources === null ? (
              <RegionSkeleton shape="rows" count={3} aria-label="Loading sources" />
            ) : sources.length === 0 ? (
              <EmptyState icon={<Swords />} title="No sources for this job" />
            ) : (
              <div className="flex flex-col gap-1">
                {sources.map((s) => {
                  const on = picked.includes(s.endpointId);
                  return (
                    <label key={s.endpointId} className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm">
                      <Checkbox
                        checked={on}
                        disabled={!on && picked.length >= MAX_LANES}
                        onCheckedChange={(v) => setPicked((p) => (v ? [...p, s.endpointId] : p.filter((x) => x !== s.endpointId)))}
                        aria-label={s.providerName}
                      />
                      <span className="min-w-0 flex-1 truncate text-foreground">{s.providerName}</span>
                      <Badge tone={s.via === "treg" ? "warning" : "success"}>{s.via === "treg" ? "treg" : "Direct"}</Badge>
                      <Badge tone={s.state === "live" ? "success" : "neutral"}>{s.state}</Badge>
                    </label>
                  );
                })}
              </div>
            )}
          </Section>
        )}

        {job && sources && sources.length > 0 && (
          <Section n={3} title="Inputs">
            <div className="flex flex-col gap-2">
              {rows.map((row, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-2">
                  {shown.map((f) => (
                    <label key={f.key} className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-muted-foreground">
                      {f.title}
                      <Input
                        value={row[f.key] ?? ""}
                        placeholder={f.example ?? ""}
                        aria-label={`${f.title}, subject ${i + 1}`}
                        onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))}
                      />
                    </label>
                  ))}
                  {rows.length > 1 && (
                    <Button variant="quiet" aria-label="Remove subject" icon={<Trash2 />} onClick={() => setRows((r) => r.filter((_, j) => j !== i))} />
                  )}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" icon={<Plus />} onClick={() => setRows((r) => [...r, {}])}>
                  Add subject
                </Button>
                {fields.some((f) => !f.primary) && (
                  <Button variant="link" onClick={() => setMore((m) => !m)}>
                    {more ? "Fewer fields" : "More fields"}
                  </Button>
                )}
              </div>
              {primary && (
                <div className="flex items-start gap-2">
                  <Textarea
                    value={paste}
                    rows={3}
                    onChange={(e) => setPaste(e.target.value)}
                    placeholder={`One ${primary.title.toLowerCase()} per line`}
                    aria-label={`Paste a list of ${primary.title}`}
                  />
                  <Button variant="outline" disabled={!paste.trim()} onClick={addPasted}>
                    Add list
                  </Button>
                </div>
              )}
            </div>
          </Section>
        )}

        {job && sources && sources.length > 0 && (
          <Section n={4} title="Options">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${job.displayName} battle`} aria-label="Title" />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Switch checked={blind} onCheckedChange={setBlind} aria-label="Blind" />
              Blind
            </label>
            <p className="text-xs tabular-nums text-muted-foreground">
              {picked.length} {picked.length === 1 ? "source" : "sources"} × {subjects.length}{" "}
              {subjects.length === 1 ? "subject" : "subjects"}
              {subjects.length > 0 ? ` = ${lookups} lookups` : ""}
            </p>
          </Section>
        )}
      </div>
    </>
  );
}
