"use client";

// features/launchpad/components/LaunchpadPage.tsx — /launchpad/<key>: ONE OF THE PERSON'S LAUNCHPADS (project
// custom-experience §5.6). Bookmarkable; the record name in the header switches between launchpads.
//
// A LaunchpadDoc of widgets on the GridCanvas. View mode by default; Edit opens the grid editor (drag to move,
// drag the corner to resize, arrows to nudge, Add / Set up panels) and Done saves ONE version. History
// previews any version in place and "Set active" restores it as a new version — nothing is ever lost. The
// launchpad maintainer (mandate `start_page.maintainer`) edits through the same verbs from chat.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Check, Copy, History, MessageCircle, Pencil, Plus, Rocket, X } from "lucide-react";
import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";
import { resolveMandate } from "@ai-matrx/chat/mandates/service";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import { TextInputDialog } from "@ai-matrx/design-system";
import { RecordPageHeader, type RecordPageAction } from "@/features/shell/components/header/templates/RecordPageHeader";
import { launchpadHref } from "@/features/shell/shell-layout/resolve";
import type { LaunchpadDoc } from "@/features/shell/shell-layout/contract";
import { useOpenAgentRunWindow } from "@/features/overlays/definitions/agentRunWindow.overlay";
import { LAUNCHPAD_SURFACE_NAME } from "@/features/surfaces/manifests/launchpad.manifest";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { toast } from "@/lib/toast";
import { START_LAUNCHPAD_KEY, useLaunchpadHistory, useLaunchpads, versionAuthor, versionNote } from "../useLaunchpads";
import { addWidget, applyPlacements, configureWidget, readingOrder, removeWidget, resizeWidget, sameLaunchpadDoc, summarizeEdit } from "../doc";
import { keyFromTitle, personOwner } from "../launchpad.typed-table";
import { describeLaunchpadWidget, getLaunchpadWidgetSpec } from "../widgets/catalog";
import { sizeWord } from "../tools/agentEdits";
import { WidgetNotice } from "../widgets/frame";
import { useLaunchpadAgentTools } from "../tools/useLaunchpadAgentTools";
import { startLaunchpadDoc } from "../templates";
import { LaunchpadGrid } from "./LaunchpadGrid";
import { AddWidgetPanel, ConfigureWidgetPanel, HistoryPanel } from "./LaunchpadPanels";
import { LaunchpadsMount } from "./LaunchpadsMount";

/** The launchpad maintainer (declared in aidream services/start_page/mandates.py). */
const MAINTAINER_KEY = MANDATE_KEYS.start_page__maintainer;

export function LaunchpadPage({ launchpadKey }: { launchpadKey: string }) {
  return (
    <LaunchpadsMount fallback={<RecordPageHeader backHref="/launchpad" record={{ name: "Launchpad" }} />}>
      <LaunchpadBody launchpadKey={launchpadKey} />
    </LaunchpadsMount>
  );
}

type Panel = { kind: "add" } | { kind: "configure"; id: string } | { kind: "history" } | null;

function LaunchpadBody({ launchpadKey }: { launchpadKey: string }) {
  const router = useRouter();
  const pads = useLaunchpads();
  const entry = pads.byKey(launchpadKey);
  const saved = entry?.parsed.ok ? entry.parsed.doc : null;
  const title = entry?.title ?? (launchpadKey === START_LAUNCHPAD_KEY ? "Start" : launchpadKey);
  const [draft, setDraft] = useState<LaunchpadDoc | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [preview, setPreview] = useState<{ version: number; doc: LaunchpadDoc; seenVersion: number | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const save = (doc: LaunchpadDoc, note: string, opts: { byAgent?: boolean } = {}) =>
    pads.save({ key: launchpadKey, title, doc, ...(entry ? { owner: entry.owner } : {}) }, note, opts);
  const history = useLaunchpadHistory(entry?.recordId ?? null, panel?.kind === "history", (doc, note) => save(doc, note));
  const openRun = useOpenAgentRunWindow();
  const editing = draft !== null;
  const agent = useLaunchpadAgentTools(LAUNCHPAD_SURFACE_NAME, {
    doc: saved,
    personEditing: editing,
    save: (doc, note, opts) => save(doc, note, opts),
  });
  const shown: LaunchpadDoc | null = draft ?? preview?.doc ?? agent.agentDoc ?? saved;

  // The Chat door opens the maintainer in place; it says the assistant is not set up ONLY when the mandate
  // truly fails to resolve here (no holder in reach), never as a silent stand-in.
  const openChat = async () => {
    try {
      const resolved = await resolveMandate(MAINTAINER_KEY, { optional: true });
      if (!resolved) return void toast.info("The launchpad assistant is not set up yet");
      openRun({
        instanceId: `mandate:${MAINTAINER_KEY}`,
        initialAgentId: resolved.agentId,
        initialAgentName: "Launchpad Maintainer",
        mandateKey: MAINTAINER_KEY,
        surfaceName: LAUNCHPAD_SURFACE_NAME,
      });
    } catch (failure) {
      toast.error(`The launchpad assistant could not open: ${failure instanceof Error ? failure.message : String(failure)}`);
    }
  };

  // An agent turn still pending is saved FIRST and the person edits on top of it — never two saves racing.
  const startEdit = async () => {
    const pendingAgentDoc = agent.agentDoc;
    if (pendingAgentDoc) await agent.flush();
    const base = pendingAgentDoc ?? saved;
    if (!base) return;
    setPreview(null);
    setPanel(null);
    setDraft(base);
  };
  const cancelEdit = () => {
    setDraft(null);
    setPanel(null);
  };
  const finishEdit = async () => {
    if (!draft || !saved) return;
    if (sameLaunchpadDoc(draft, saved)) return cancelEdit();
    const result = await save(draft, summarizeEdit(saved, draft));
    if (!result.ok) return void toast.error(result.error);
    setDraft(null);
    setPanel(null);
  };

  const openPreview = async (version: number | null) => {
    if (version === null || !saved) return setPreview(null);
    const answer = await history.preview(version, saved);
    if (!answer.ok) return void toast.error(answer.error);
    setPreview({ version, doc: answer.doc, seenVersion: answer.seenVersion });
  };
  const setActive = async (version: number) => {
    setBusy(true);
    const result = await history.setActive(version, preview?.version === version ? preview.seenVersion : null, saved);
    setBusy(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success(`Version ${version} is active again`);
    setPreview(null);
    pads.reload();
  };

  const duplicate = async () => {
    if (!saved || !pads.userId) return;
    const copyTitle = `${title} copy`;
    const key = keyFromTitle(copyTitle, pads.entries.map((e) => e.key));
    const result = await pads.save({ key, title: copyTitle, doc: saved, owner: personOwner(pads.userId) }, `Copied from ${title}`);
    if (!result.ok) return void toast.error(result.error);
    router.push(launchpadHref(key));
  };
  const archive = async () => {
    if (!entry) return;
    const yes = await confirm({
      title: `Archive "${title}"?`,
      description: "Its link stops opening it. You can restore it from the archive.",
      confirmLabel: "Archive",
      variant: "destructive",
    });
    if (!yes) return;
    const result = await pads.archive(entry);
    if (!result.ok) return void toast.error(result.error);
    router.push("/launchpad");
  };

  const actions: RecordPageAction[] = editing
    ? [
        { label: "Add", icon: Plus, showLabel: true, onPress: () => setPanel({ kind: "add" }) },
        { label: "Cancel", icon: X, showLabel: true, onPress: cancelEdit },
        { label: "Done", icon: Check, primary: true, disabled: pads.saving, onPress: () => void finishEdit() },
      ]
    : [
        { label: "Chat", icon: MessageCircle, onPress: () => void openChat() },
        { label: "History", icon: History, showLabel: true, disabled: !entry, onPress: () => setPanel(panel?.kind === "history" ? null : { kind: "history" }) },
        { label: "Edit", icon: Pencil, showLabel: true, disabled: !saved || pads.loading, onPress: () => void startEdit() },
      ];

  const configuring = panel?.kind === "configure" && draft ? draft.widgets.find((w) => w.id === panel.id) : undefined;
  const siblings = pads.entries.map((e) => ({ label: e.title, href: launchpadHref(e.key), active: e.key === launchpadKey }));

  return (
    <SurfaceRuntimeProvider
      surfaceName={LAUNCHPAD_SURFACE_NAME}
      getScope={() => ({
        start_widgets: shown
          ? readingOrder(shown).map((w, position) => ({
              id: w.id,
              type: w.type,
              size: sizeWord(w.layout.lg.w),
              ...w.layout.lg,
              config: w.config,
              describe: describeLaunchpadWidget(w),
              position,
            }))
          : [],
        start_editing: editing,
      })}
    >
      <RecordPageHeader
        backHref="/launchpad"
        parents={[{ label: "Launchpads", href: "/launchpad" }]}
        record={{ name: title, ...(siblings.length > 1 ? { siblings } : {}) }}
        status={preview ? { label: `Viewing v${preview.version}`, tone: "info" } : editing ? { label: "Editing", tone: "primary" } : undefined}
        actions={actions}
        menu={
          entry && !editing
            ? {
                items: [
                  { id: "rename", label: "Rename", icon: Pencil, onPress: () => setRenaming(true) },
                  { id: "duplicate", label: "Duplicate", icon: Copy, onPress: () => void duplicate(), disabled: !saved },
                  { id: "archive", label: "Archive", icon: Archive, onPress: () => void archive(), destructive: true, group: "danger" },
                ],
              }
            : undefined
        }
      />
      <div className="h-full overflow-y-auto px-3 pb-6 pt-[calc(var(--shell-header-h)+0.75rem)]" data-matrx-page-scroll>
        {pads.loading ? (
          <LaunchpadGrid doc={startLaunchpadDoc()} skeleton />
        ) : !entry ? (
          <MissingLaunchpad launchpadKey={launchpadKey} />
        ) : !shown ? (
          <WidgetNotice tone="error">
            {pads.error ?? (entry.parsed.ok ? "This launchpad could not be read." : entry.parsed.error)}
            <ErrorAlchemyMenu error={pads.error ?? (entry.parsed.ok ? null : entry.parsed.error)} />
          </WidgetNotice>
        ) : shown.widgets.length === 0 && !editing ? (
          <EmptyState
            icon={<Rocket />}
            title="Nothing here yet"
            line="Add widgets from across the app"
            action={
              <Button variant="primary" icon={<Pencil />} onClick={() => void startEdit()}>
                Edit
              </Button>
            }
          />
        ) : (
          <LaunchpadGrid
            doc={shown}
            previewing={Boolean(preview)}
            editing={
              draft
                ? {
                    selectedId: panel?.kind === "configure" ? panel.id : null,
                    onPlace: (placements) => setDraft(applyPlacements(draft, placements)),
                    onRemove: (id) => {
                      setDraft(removeWidget(draft, id));
                      if (panel?.kind === "configure" && panel.id === id) setPanel(null);
                    },
                    onConfigure: (id) => setPanel({ kind: "configure", id }),
                  }
                : null
            }
          />
        )}
      </div>
      {panel?.kind === "add" && draft ? (
        <AddWidgetPanel
          onClose={() => setPanel(null)}
          onAdd={(spec) => {
            const next = addWidget(draft, { type: spec.type, config: { ...spec.defaultConfig } });
            setDraft(next);
            // One rule for every widget: the new widget opens in Set up (size, and its fields if any).
            const added = next.widgets.find((w) => !draft.widgets.some((d) => d.id === w.id));
            if (added) setPanel({ kind: "configure", id: added.id });
          }}
        />
      ) : null}
      {configuring && draft ? (
        <ConfigureWidgetPanel
          key={configuring.id}
          widget={configuring}
          spec={getLaunchpadWidgetSpec(configuring.type)}
          launchpads={pads.entries.filter((e) => e.key !== launchpadKey).map((e) => ({ key: e.key, title: e.title }))}
          onClose={() => setPanel(null)}
          onResize={(size) => setDraft(resizeWidget(draft, configuring.id, size))}
          onConfigure={(patch) => setDraft(configureWidget(draft, configuring.id, patch))}
        />
      ) : null}
      {panel?.kind === "history" ? (
        <HistoryPanel
          entries={history.entries}
          error={history.error}
          author={(e) => versionAuthor(e, pads.userId)}
          note={versionNote}
          previewVersion={preview?.version ?? null}
          busy={busy}
          onPreview={(v) => void openPreview(v)}
          onSetActive={(v) => void setActive(v)}
          onClose={() => {
            setPanel(null);
            setPreview(null);
          }}
        />
      ) : null}
      <TextInputDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Rename launchpad"
        defaultValue={title}
        confirmLabel="Rename"
        onConfirm={async (next) => {
          if (!saved || !entry) return;
          const result = await pads.save({ key: launchpadKey, title: next.trim(), doc: saved, owner: entry.owner }, `Renamed to ${next.trim()}`);
          if (!result.ok) toast.error(result.error);
          setRenaming(false);
        }}
      />
    </SurfaceRuntimeProvider>
  );
}

function MissingLaunchpad({ launchpadKey }: { launchpadKey: string }) {
  return (
    <EmptyState
      icon={<Rocket />}
      title={launchpadKey === START_LAUNCHPAD_KEY ? "Setting up your launchpad" : "No launchpad with this link"}
      line={launchpadKey === START_LAUNCHPAD_KEY ? "Your Start page is moving here" : "It may be archived, or in another organization"}
      action={
        <Button variant="outline" asChild>
          <Link href="/launchpad">Your launchpads</Link>
        </Button>
      }
    />
  );
}
