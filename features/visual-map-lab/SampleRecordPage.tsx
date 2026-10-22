"use client";

// features/visual-map-lab/SampleRecordPage.tsx — /visual-maps/lab/[sampleId]
//
// One sample, side by side: the rendered picture (the one VisualMap) and the screenshots on the left; the numbers and
// documents on the right (measurements, diagnostics, receipt, spec, Mermaid version, every saved repair round, send to
// agent). Actions: Inspect again (Alchemy inspect + measure), Copy for AI (inspectionForAI).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCopy, ScanSearch } from "lucide-react";
import VisualMap from "@ai-matrx/rich-content/visual-map/VisualMap";
import { copyInspectionPackage, inspectionForAI, type Inspection } from "@ai-matrx/alchemy/operate/inspect";
import { RecordId } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { useFileUpload } from "@/features/files/handler/hooks/useFileUpload";
import { useAppDispatch } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { createVisualMapLabScope, VISUAL_MAP_LAB_SURFACE_NAME } from "@/features/surfaces/manifests/visual-map-lab.manifest";
import { DataTable, JsonTables, RawJson } from "./JsonTables";
import { LabError } from "./LabError";
import { MeasurementTables, inspectionEntries } from "./MeasurementTables";
import { MermaidPanel } from "./MermaidPanel";
import { StoredScreenshot } from "./Screenshot";
import { SendToAgentPanel } from "./SendToAgentPanel";
import { sampleValues } from "./agentMapping";
import { loadLabSample, firstInspection } from "./service";
import { SOURCE_LABEL, visualMapValueOf, type LabSample } from "./types";
import { useLabInspect } from "./useLabInspect";

type Loaded = { state: "loading" } | { state: "failed"; message: string } | { state: "ready"; sample: LabSample };

export function SampleRecordPage({ sampleId }: { sampleId: string }) {
  const dispatch = useAppDispatch();
  const [answered, setAnswered] = useState<{ key: string; loaded: Loaded }>({ key: "", loaded: { state: "loading" } });
  const [attempt, setAttempt] = useState(0);
  const key = `${sampleId}:${attempt}`;

  useEffect(() => {
    let live = true;
    loadLabSample(sampleId, dispatch)
      .then((sample) => live && setAnswered({ key, loaded: { state: "ready", sample } }))
      .catch((e) => live && setAnswered({ key, loaded: { state: "failed", message: e instanceof Error ? e.message : "The sample could not be read." } }));
    return () => {
      live = false;
    };
  }, [sampleId, dispatch, key]);

  const loaded: Loaded = answered.key === key ? answered.loaded : { state: "loading" };
  const sample = loaded.state === "ready" ? loaded.sample : null;
  const scope = useCallback(
    () =>
      createVisualMapLabScope({
        lab_view: "sample",
        sample_id: sampleId,
        sample_load_status: loaded.state === "ready" ? "loaded" : loaded.state,
        ...(sample
          ? {
              sample_title: sample.title,
              sample_source: sample.source,
              diagram_type: sample.type ?? undefined,
              verified: sample.verified,
              issue_count: sample.issues,
              round_count: sample.rounds.length,
              spec: sample.spec ?? undefined,
              diagnostics: sample.diagnostics ?? undefined,
              measurements: sample.measurements ?? undefined,
            }
          : {}),
      }),
    [sampleId, loaded.state, sample],
  );

  return (
    <SurfaceRuntimeProvider surfaceName={VISUAL_MAP_LAB_SURFACE_NAME} getScope={scope}>
      <RecordPageHeader record={{ name: sample?.title ?? "Sample" }} />
      <div className="h-full overflow-x-hidden overflow-y-auto px-4 pb-6 pt-[calc(var(--shell-header-h)+var(--matrx-page-top))] sm:px-6" data-matrx-page-scroll="" data-testid="visual-map-lab-sample">
        {loaded.state === "loading" && <span className="type-secondary text-muted-foreground">Loading</span>}
        {loaded.state === "failed" && (
          <div className="flex items-center gap-3">
            <LabError message={loaded.message} />
            <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
          </div>
        )}
        {sample && <SampleBody sample={sample} />}
      </div>
    </SurfaceRuntimeProvider>
  );
}

function SampleBody({ sample }: { sample: LabSample }) {
  const { upload } = useFileUpload();
  const pictureRef = useRef<HTMLDivElement>(null);
  const { fresh, freshRef, busy, error, run } = useLabInspect(pictureRef);
  const values = useMemo(() => sampleValues(sample), [sample]);
  const mapValue = useMemo(() => visualMapValueOf(sample), [sample]);
  const [tab, setTab] = useState("measurements");
  const lastStored = sample.screenshotFileIds[sample.screenshotFileIds.length - 1] ?? null;

  const measurementsFor = (f: typeof fresh) => (f ? f.measurements : (firstInspection(sample.measurements)?.inspection as Inspection | undefined));

  const copyForAi = async () => {
    // The picture and numbers of this very moment when there is a picture on screen; else the stored numbers alone.
    const taken = freshRef.current ?? (mapValue ? await run() : null);
    const measurements = measurementsFor(taken);
    if (!measurements) {
      toast.error("Nothing measured yet");
      return;
    }
    const pkg = inspectionForAI(
      {
        inspection: { measurements, ...(taken ? { png: taken.png, image: taken.image } : {}) },
        subject: { title: sample.title, spec: sample.spec, diagnostics: sample.diagnostics, payload: sample.receipt ?? undefined },
        location: `/visual-maps/lab/${encodeURIComponent(sample.id)}`,
      },
      { route: `/visual-maps/lab/${sample.id}` },
    );
    const landed = await copyInspectionPackage(pkg, (reason) => toast.info(reason));
    if (landed) toast.success(`Copied for AI · ${pkg.issues.total} ${pkg.issues.total === 1 ? "issue" : "issues"}`);
  };

  const getScreenshotFileId = async (): Promise<string | null> => {
    if (lastStored) return lastStored;
    const taken = freshRef.current ?? (mapValue ? await run() : null);
    if (!taken) return null;
    const uploaded = await upload(
      { kind: "blob", blob: taken.png, fileName: `visual-map-lab-${Date.now()}.png`, mime: "image/png" },
      { folderPath: "Visual map lab" },
    );
    return uploaded.fileId;
  };

  const getMessageText = async (): Promise<string> => {
    const taken = freshRef.current;
    const measurements = measurementsFor(taken);
    if (!measurements) return "";
    return inspectionForAI({
      inspection: { measurements },
      subject: { title: sample.title, spec: sample.spec, diagnostics: sample.diagnostics, payload: sample.receipt ?? undefined },
    }).text;
  };

  const meta = [
    { name: "Source", value: SOURCE_LABEL[sample.source] },
    { name: "Subject", value: sample.subject },
    { name: "Diagram type", value: sample.type ?? "Not a visual map" },
    { name: "Layout", value: sample.verified ? "Verified" : `Not verified · ${sample.issues} ${sample.issues === 1 ? "issue" : "issues"}` },
    ...(sample.createdAt ? [{ name: "Saved", value: new Date(sample.createdAt).toLocaleString() }] : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" icon={<ScanSearch className="h-4 w-4" />} onClick={() => void run()} disabled={busy || !mapValue} aria-label="Inspect again">
          {busy ? "Inspecting" : "Inspect again"}
        </Button>
        <Button variant="outline" icon={<ClipboardCopy className="h-4 w-4" />} onClick={() => void copyForAi()} aria-label="Copy for AI">
          Copy for AI
        </Button>
        <RecordId value={sample.id} label="Sample" />
        {error && <LabError message={error} />}
      </div>

      {sample.notes.length > 0 && (
        <DataTable columns={["label", "reason"]} rows={sample.notes.map((n) => ({ label: n.label, reason: n.reason }))} />
      )}

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="flex min-w-0 flex-col gap-3">
          <DataTable columns={["name", "value"]} rows={meta} />
          <div ref={pictureRef} className="min-h-[12rem] overflow-auto rounded-md border border-border bg-card p-2">
            {mapValue ? <VisualMap value={mapValue} openOnCanvas={false} /> : <span className="type-secondary text-muted-foreground">Not a visual map</span>}
          </div>
          {fresh && (
            <figure className="flex flex-col gap-1">
              <span className="type-secondary font-medium">Inspected now · {fresh.image.width} x {fresh.image.height}</span>
              <img src={fresh.url} alt="Fresh screenshot" className="max-w-full rounded-md border border-border" />
            </figure>
          )}
          {sample.screenshotFileIds.length > 0 ? (
            sample.screenshotFileIds.map((id, i) => <StoredScreenshot key={id} fileId={id} label={`Screenshot ${i + 1}`} />)
          ) : (
            !fresh && <span className="type-secondary text-muted-foreground">No stored screenshot</span>
          )}
        </section>

        <section className="min-w-0">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="measurements">Measurements</TabsTrigger>
              <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
              <TabsTrigger value="receipt">Receipt</TabsTrigger>
              <TabsTrigger value="spec">Spec</TabsTrigger>
              {sample.mermaid && <TabsTrigger value="mermaid">Mermaid</TabsTrigger>}
              <TabsTrigger value="rounds">Rounds · {sample.rounds.length}</TabsTrigger>
              {sample.documents.length > 0 && <TabsTrigger value="documents">Documents · {sample.documents.length}</TabsTrigger>}
              <TabsTrigger value="send">Send to agent</TabsTrigger>
            </TabsList>
            <TabsContent value="measurements" className="pt-3">
              {fresh && (
                <div className="mb-4 flex flex-col gap-2">
                  <span className="type-body font-medium">Inspected now</span>
                  <MeasurementTables measurements={fresh.measurements} label="Fresh measurements" />
                </div>
              )}
              <MeasurementTables measurements={sample.measurements} />
            </TabsContent>
            <TabsContent value="diagnostics" className="pt-3"><JsonTables value={sample.diagnostics} label="Diagnostics" /></TabsContent>
            <TabsContent value="receipt" className="pt-3"><JsonTables value={sample.receipt} label="Receipt" /></TabsContent>
            <TabsContent value="spec" className="pt-3">
              {sample.spec ? <RawJson value={sample.spec} label="Spec" /> : <span className="type-secondary text-muted-foreground">None</span>}
              {sample.nodeMap && <div className="mt-3"><JsonTables value={sample.nodeMap} label="Node map" /></div>}
            </TabsContent>
            {sample.mermaid && (
              <TabsContent value="mermaid" className="pt-3"><MermaidPanel source={sample.mermaid.source} fileId={sample.mermaid.fileId} /></TabsContent>
            )}
            <TabsContent value="rounds" className="pt-3"><Rounds sample={sample} /></TabsContent>
            <TabsContent value="documents" className="flex flex-col gap-4 pt-3">
              {sample.documents.map((d) => (
                <section key={d.id} className="flex flex-col gap-1">
                  <span className="type-body font-medium">{d.label}</span>
                  <JsonTables value={d.value} label={d.label} />
                </section>
              ))}
            </TabsContent>
            <TabsContent value="send" className="pt-3">
              <SendToAgentPanel title={sample.title} values={values} getScreenshotFileId={getScreenshotFileId} getMessageText={getMessageText} />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}

function Rounds({ sample }: { sample: LabSample }) {
  if (sample.rounds.length === 0) return <span className="type-secondary text-muted-foreground">None saved</span>;
  return (
    <div className="flex flex-col gap-4">
      {sample.rounds.map((r, i) => {
        const entries = inspectionEntries(r.measurements);
        const isCurrent = r.id === sample.id.replace(/^inspection:/, "");
        return (
          <section key={r.id} className="flex flex-col gap-2 rounded-md border border-border p-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="type-body font-medium">Round {r.round}</span>
              <span className="type-secondary text-muted-foreground">#{i + 1}{isCurrent ? " · open" : ""}</span>
              {r.createdAt && <span className="type-secondary text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>}
              {r.id.startsWith("report-") ? null : <RecordId value={r.id} label="Round row" />}
            </div>
            <DataTable
              columns={["part", "state"]}
              rows={[
                { part: "Spec", state: r.spec ? "saved" : "none" },
                { part: "Diagnostics", state: Array.isArray(r.diagnostics) ? `${r.diagnostics.length}` : r.diagnostics ? "saved" : "none" },
                { part: "Measurements", state: entries.length ? `${entries.length} measured` : r.measurements ? "saved" : "none" },
                { part: "Screenshot", state: r.screenshotFileId ? "stored" : "none" },
              ]}
            />
            {r.screenshotFileId && <StoredScreenshot fileId={r.screenshotFileId} label={`Round ${r.round}`} />}
            {r.spec != null && <RawJson value={r.spec} label={`Round ${r.round} spec`} />}
            {r.diagnostics != null && <JsonTables value={r.diagnostics} label={`Round ${r.round} diagnostics`} />}
            {r.measurements != null && <MeasurementTables measurements={r.measurements} label={`Round ${r.round} measurements`} />}
          </section>
        );
      })}
    </div>
  );
}
