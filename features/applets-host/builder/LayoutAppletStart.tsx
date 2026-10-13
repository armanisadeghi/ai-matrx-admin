"use client";

// features/applets-host/builder/LayoutAppletStart.tsx — START AN APPLET FROM A STOCK LAYOUT.
//
// The restored template gallery and AutoCreate (agent-apps, deleted 2026-10-07), on today's Applet host:
//   1. pick one of the six stock layouts (form, form to chat, chat, centered input, chat with history, widget) —
//      a live preview runs it over a sample job in memory (no run is spent, nothing is saved);
//   2. pick the agent or workflow it runs (made a job of her organization — `jobForHolder`, the builder's own door);
//   3. title, where the answer shows, accent;
//   4. "Create Applet" makes the record directly (`createLayoutApplet`: no code, no AI), or "Build with AI" opens
//      the builder seeded with the job and the layout (the code path).
// The old hardcoded generator agents are not revived: a layout Applet needs no AI to exist.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Workflow } from "lucide-react";

import { STOCK_LAYOUTS, stockLayout, stockLayoutInfo, type AppletLayout, type AppletLayoutAccent, type AppletLayoutKind, type AppletRecord, type JobRunView } from "@ai-matrx/applets";
import { createMemoryHost } from "@ai-matrx/applets/host";
import { mountApplet } from "@ai-matrx/applets/frame";
import { AgentListDropdown } from "@ai-matrx/agents/catalog/react";
import { Button, SegmentedControl } from "@ai-matrx/design-system/controls";

import { ProInput } from "@/components/official/ProInput";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { WorkflowListDropdown } from "@/features/workflow-runtime/listings/WorkflowListDropdown";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";
import { useAppDispatch } from "@/lib/redux/hooks";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/lib/toast";

import { AppletWritingBox } from "../AppletWritingBox";
import { jobForHolder } from "./applet-job";
import { holderNaming } from "./BuildAttachments";
import { buildSeedHref, jobReference, layoutReference } from "./build-references";
import { createLayoutApplet, LAYOUT_JOB_ALIAS } from "./layout-applet";

const ACCENTS: { value: AppletLayoutAccent; label: string; dot: string }[] = [
  { value: "primary", label: "Primary", dot: "bg-primary" },
  { value: "info", label: "Blue", dot: "bg-info" },
  { value: "success", label: "Green", dot: "bg-success" },
  { value: "warning", label: "Amber", dot: "bg-warning" },
  { value: "destructive", label: "Red", dot: "bg-destructive" },
  { value: "neutral", label: "Gray", dot: "bg-muted-foreground" },
];

interface ChosenJob {
  holder: "agent" | "workflow";
  holderId: string;
  label: string;
  description: string | null;
  jobKey: string;
}

// ─── the live preview: the real layout over a sample job, in memory ───────────

const SAMPLE_KEY = "preview.sample_job";

function previewRecord(layout: AppletLayout): AppletRecord {
  return {
    id: "layout-preview",
    version: 1,
    organizationId: "00000000-0000-0000-0000-000000000000",
    slug: "layout-preview",
    published: false,
    files: {},
    entry: "",
    scope: { entries: [], shadowDangerousGlobals: true },
    pages: [],
    mandates: [{ alias: LAYOUT_JOB_ALIAS, key: SAMPLE_KEY }],
    sources: [],
    parentId: null,
    surfaceName: "applets/layout-preview",
    layout,
  };
}

function SampleAnswer({ run }: { run: JobRunView }) {
  return (
    <div data-applet-stand-in="sample-answer" className="rounded-md border border-dashed border-border p-2 text-sm text-muted-foreground">
      {run.status === "done" ? "A sample answer shows here" : "Working on a sample answer"}
    </div>
  );
}

function LayoutPreview({ layout, conversation }: { layout: AppletLayout; conversation: boolean }) {
  // One mount per layout: a new kind or option shows a fresh preview.
  const [mounted] = useState(() => {
    const host = createMemoryHost({
      record: previewRecord(layout),
      viewer: { userId: null, guest: true },
      mandates: {
        [SAMPLE_KEY]: {
          label: layout.options?.title || "Sample job",
          goal: "Show how this layout works",
          inputs: conversation ? [] : [{ name: "topic", kind: "text", sourcing: "require", label: "Topic", required: true }],
          script: () => [{ type: "text", delta: "Sample answer" }, { type: "status", status: "completed" }],
        },
      },
      latencyMs: 400,
    });
    return mountApplet(previewRecord(layout), host, { entries: [], shadowDangerousGlobals: true }, {
      renderRun: (run) => <SampleAnswer run={run} />,
      renderWritingBox: (props) => <AppletWritingBox {...props} surfaceName="applets/layout-preview" />,
    });
  });
  if (!mounted.ok) return <div className="p-3 text-sm text-destructive">{mounted.error.message}</div>;
  const Component = mounted.Component;
  return (
    <div className="flex h-[26rem] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-background" data-applet-layout-preview={layout.kind}>
      <Component />
    </div>
  );
}

// ─── the page body ───────────────────────────────────────────────────────────

export function LayoutAppletStart({ initialKind }: { initialKind: AppletLayoutKind | null }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const active = useOrganizationRequired();
  const organizationId = active.organizationState === "ready" ? active.organizationId : null;
  const [kind, setKind] = useState<AppletLayoutKind>(initialKind ?? "chat");
  const [title, setTitle] = useState("");
  const [response, setResponse] = useState<"stream" | "window">("stream");
  const [accent, setAccent] = useState<AppletLayoutAccent>("primary");
  const [job, setJob] = useState<ChosenJob | null>(null);
  const [making, setMaking] = useState<"job" | "create" | null>(null);
  const [pending, startTransition] = useTransition();

  const info = stockLayoutInfo(kind);
  const layout = stockLayout(kind, LAYOUT_JOB_ALIAS, {
    ...(title.trim() ? { title: title.trim() } : {}),
    ...(response === "window" ? { response } : {}),
    ...(accent !== "primary" ? { accent } : {}),
  });

  const pickHolder = async (holder: "agent" | "workflow", holderId: string) => {
    if (!organizationId) {
      toast.error("Choose the organization you are working in first.");
      return;
    }
    setMaking("job");
    try {
      const naming = await holderNaming(holder, holderId);
      const made = await jobForHolder(dispatch, { organizationId, holder, holderId, name: naming.name, description: naming.description });
      setJob({ holder, holderId, label: naming.name, description: naming.description, jobKey: made.jobKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setMaking(null);
    }
  };

  const create = async () => {
    if (!job || !organizationId) return;
    setMaking("create");
    try {
      const made = await createLayoutApplet(createClient(), {
        organizationId,
        name: title.trim() || job.label,
        description: job.description,
        jobKey: job.jobKey,
        layout,
      });
      startTransition(() => router.push(`/applets/${made.slug}`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setMaking(null);
    }
  };

  const buildWithAi = () => {
    if (!job) return;
    const href = buildSeedHref([
      jobReference({ holder: job.holder, holderId: job.holderId, label: job.label, jobKey: job.jobKey }),
      layoutReference(`${info.label} layout`, layout),
    ]);
    startTransition(() => router.push(href));
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]" data-applet-layout-start="">
      <div className="flex min-w-0 flex-col gap-5">
        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Layout</span>
          <SegmentedControl
            aria-label="Layout"
            value={kind}
            onValueChange={(v: string) => setKind(v as AppletLayoutKind)}
            data={STOCK_LAYOUTS.map((l) => ({ value: l.kind, label: l.label }))}
          />
          <span className="text-xs text-muted-foreground">{info.line}</span>
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Runs</span>
          <div className="flex flex-wrap items-center gap-1">
            <AgentListDropdown
              consumerId="applet-layout-start-agent"
              onSelect={(id) => void pickHolder("agent", id)}
              triggerSlot={
                <Button variant="outline" icon={<AGENT_ICON />} disabled={making !== null}>
                  Agent
                </Button>
              }
            />
            <WorkflowListDropdown
              onSelect={(id) => void pickHolder("workflow", id)}
              triggerSlot={
                <Button variant="outline" icon={<Workflow />} disabled={making !== null}>
                  Workflow
                </Button>
              }
            />
          </div>
          <span className="truncate text-sm" data-applet-layout-job={job?.jobKey ?? ""}>
            {making === "job" ? "Getting it ready" : job ? job.label : "Nothing chosen yet"}
          </span>
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Title</span>
          <ProInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={job?.label ?? "The agent's name"} aria-label="Title" />
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Answer shows</span>
          <SegmentedControl
            aria-label="Answer shows"
            value={response}
            onValueChange={(v: string) => setResponse(v as "stream" | "window")}
            data={[
              { value: "stream", label: "In place" },
              { value: "window", label: "In a window" },
            ]}
          />
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Accent</span>
          <SegmentedControl
            aria-label="Accent"
            value={accent}
            onValueChange={(v: string) => setAccent(v as AppletLayoutAccent)}
            data={ACCENTS.map((a) => ({
              value: a.value,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className={`size-2.5 rounded-full ${a.dot}`} />
                  {a.label}
                </span>
              ),
            }))}
          />
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" icon={<LayoutTemplate />} disabled={!job || !organizationId || making !== null || pending} onClick={() => void create()}>
            {making === "create" ? "Creating" : "Create Applet"}
          </Button>
          <Button variant="outline" disabled={!job || making !== null || pending} onClick={buildWithAi} title="Open the builder with this job and layout">
            Build with AI
          </Button>
        </div>
      </div>

      <LayoutPreview key={JSON.stringify(layout)} layout={layout} conversation={info.conversation && kind !== "form_to_chat"} />
    </div>
  );
}
