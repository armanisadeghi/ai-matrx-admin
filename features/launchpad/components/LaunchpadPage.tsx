"use client";

// features/launchpad/components/LaunchpadPage.tsx — /launchpad/<key>: ONE OF THE PERSON'S LAUNCHPADS (project
// custom-experience §5.6). Bookmarkable; the record name in the header switches between launchpads.
//
// A LaunchpadDoc of widgets on the GridCanvas. View mode by default; Edit opens the grid editor (drag to move,
// drag the corner to resize, arrows to nudge, Add / Set up panels) and Done saves ONE version. History
// previews any version in place and "Set active" restores it as a new version — nothing is ever lost. The
// launchpad maintainer (mandate `start_page.maintainer`) edits through the same verbs from chat.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, BookmarkPlus, Building2, Check, Copy, History, MessageCircle, Pencil, Plus, Rocket, X } from "lucide-react";
import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";
import { resolveMandate } from "@ai-matrx/chat/mandates/service";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { Button, EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { TextInputDialog } from "@ai-matrx/design-system";
import { WhatsNewOffers } from "@/features/shell/shell-layout/editor/WhatsNewOffers";
import { RecordPageHeader, type RecordPageAction } from "@/features/shell/components/header/templates/RecordPageHeader";
import { launchpadHref } from "@/features/shell/shell-layout/resolve";
import type { LaunchpadDoc } from "@/features/shell/shell-layout/contract";
import { useOpenAgentRunWindow } from "@/features/overlays/definitions/agentRunWindow.overlay";
import { LAUNCHPAD_SURFACE_NAME } from "@/features/surfaces/manifests/launchpad.manifest";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { toast } from "@/lib/toast";
import { useUserRole } from "@/features/organizations/hooks";
import { START_LAUNCHPAD_KEY, useLaunchpadHistory, useLaunchpads, versionAuthor, versionNote } from "../useLaunchpads";
import { EMPTY_LAUNCHPAD_DOC, addWidget, applyPlacements, compatibleSources, parseLaunchpadDoc, configureWidget, readingOrder, removeWidget, resizeWidget, sameLaunchpadDoc, setBinding, summarizeEdit } from "../doc";
import { PageBusProvider } from "../bus/react";
import { bindingInto, busAddress, splitBusAddress } from "../bus/ports";
import { keyFromTitle, personOwner } from "../launchpad.typed-table";
import { describeLaunchpadWidget, getLaunchpadWidgetSpec } from "../widgets/catalog";
import { sizeWord } from "../tools/agentEdits";
import { WidgetNotice } from "../widgets/frame";
import { useLaunchpadAgentTools } from "../tools/useLaunchpadAgentTools";
import { forgetPaintedLaunchpad, keepPaintedLaunchpad, readPaintedLaunchpad, type PaintedLaunchpad } from "../paintCache";
import { LaunchpadGrid } from "./LaunchpadGrid";
import { AddWidgetPanel, ConfigureWidgetPanel, HistoryPanel } from "./LaunchpadPanels";
import { LaunchpadsMount } from "./LaunchpadsMount";

/** The launchpad maintainer (declared in aidream services/start_page/mandates.py). */
const MAINTAINER_KEY = MANDATE_KEYS.start_page__maintainer;

/** What the server read for this key (the person's own launchpad): drawn until the browser's read answers. */
export interface InitialLaunchpad {
  title: string;
  savedAt: string | null;
  /** The stored JSON text, parsed here. */
  doc: string;
}

export function LaunchpadPage({
  launchpadKey,
  initial = null,
  initialSiblings = null,
}: {
  launchpadKey: string;
  initial?: InitialLaunchpad | null;
  initialSiblings?: { key: string; title: string }[] | null;
}) {
  return (
    <LaunchpadsMount
      fallback={
        <RecordPageHeader
          backHref="/launchpad"
          record={{
            name: initial?.title ?? "Launchpad",
            // The server's own read of the other launchpads, the same list the body's door shows.
            siblings: (initialSiblings ?? []).map((e) => ({ label: e.title, href: launchpadHref(e.key), active: e.key === launchpadKey })),
          }}
        />
      }
    >
      <LaunchpadBody launchpadKey={launchpadKey} initial={initial} initialSiblings={initialSiblings} />
    </LaunchpadsMount>
  );
}

type Panel = { kind: "add" } | { kind: "configure"; id: string } | { kind: "history" } | null;

function LaunchpadBody({
  launchpadKey,
  initial,
  initialSiblings,
}: {
  launchpadKey: string;
  initial: InitialLaunchpad | null;
  initialSiblings: { key: string; title: string }[] | null;
}) {
  const router = useRouter();
  const pads = useLaunchpads();
  const entry = pads.byKey(launchpadKey);
  const saved = entry?.parsed.ok ? entry.parsed.doc : null;
  // LOCAL FIRST: this device's last-drawn copy paints while the cloud read runs (read after hydration), and
  // the cloud's answer replaces it only when the saved version moved. No copy: a neutral skeleton, never the
  // template, so no widget ever jumps from a template box to its saved place.
  // SERVER FIRST: the server's read of the person's own launchpad is in the first HTML (same on both sides, so
  // hydration matches); this device's copy is the stand-in only when the server had none.
  const fromServer = initialPaint(initial);
  const [painted, setPainted] = useState<PaintedLaunchpad | null>(null);
  const early = fromServer ?? painted;
  const userId = pads.userId;
  useEffect(() => {
    if (userId) setPainted(readPaintedLaunchpad(userId, launchpadKey));
  }, [userId, launchpadKey]);
  const savedAt = entry?.savedAt ?? null;
  const entryTitle = entry?.title ?? null;
  const gone = !pads.loading && !pads.error && !entry;
  useEffect(() => {
    if (!userId) return;
    if (saved && entryTitle !== null) keepPaintedLaunchpad(userId, launchpadKey, { title: entryTitle, savedAt, doc: saved });
    else if (gone) forgetPaintedLaunchpad(userId, launchpadKey);
  }, [userId, launchpadKey, saved, entryTitle, savedAt, gone]);
  // Never the raw key while loading: the saved title, else a neutral word.
  const title = entry?.title ?? early?.title ?? (launchpadKey === START_LAUNCHPAD_KEY ? "Start" : "Launchpad");
  const [draft, setDraft] = useState<LaunchpadDoc | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [preview, setPreview] = useState<{ version: number; doc: LaunchpadDoc; seenVersion: number | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [lastTouched, setLastTouched] = useState<string | null>(null);
  const save = (doc: LaunchpadDoc, note: string, opts: { byAgent?: boolean } = {}) =>
    pads.save({ key: launchpadKey, title, doc, ...(entry ? { owner: entry.owner, organizationId: entry.organizationId } : {}) }, note, opts);
  // AN ORGANIZATION'S LAUNCHPAD is changed only by its owner or admin (the organization Layout's gate); every
  // other member reads it and copies it to their own. The same role decides "for the organization" choices.
  const organizationPad = entry?.owner === "org";
  const role = useUserRole((organizationPad ? entry.organizationId : pads.activeOrganizationId) ?? undefined);
  const mayChange = !organizationPad || role.isAdmin;
  const history = useLaunchpadHistory(entry ? { recordId: entry.recordId, organizationId: entry.organizationId } : null, panel?.kind === "history", (doc, note) => save(doc, note));
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
    const copyTitle = organizationPad ? title : `${title} copy`;
    const key = keyFromTitle(copyTitle, pads.entries.map((e) => e.key));
    const result = await pads.save({ key, title: copyTitle, doc: saved, owner: personOwner(pads.userId) }, `Copied from ${title}`);
    if (!result.ok) return void toast.error(result.error);
    router.push(launchpadHref(key));
  };
  /** A copy of this launchpad that everyone in the organization sees (an owner or admin). */
  const shareWithOrganization = async () => {
    if (!saved) return;
    const key = keyFromTitle(title, pads.entries.map((e) => e.key));
    const result = await pads.save({ key, title, doc: saved, owner: "org" }, `Shared from ${title}`);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Everyone in your organization sees this launchpad");
    router.push(launchpadHref(key));
  };
  const saveAsTemplate = async (to: "mine" | "organization") => {
    if (!saved || !entry) return;
    const result = await pads.saveAsTemplate({ title, doc: saved, owner: entry.owner, organizationId: entry.organizationId }, to);
    if (!result.ok) return void toast.error(result.error);
    toast.success(to === "organization" ? "Your organization can start from this template" : "Saved to your templates");
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
        mayChange
          ? { label: "Edit", icon: Pencil, showLabel: true, disabled: !saved || pads.loading, onPress: () => void startEdit() }
          : { label: "Copy to mine", icon: Copy, showLabel: true, disabled: !saved, onPress: () => void duplicate() },
      ];

  const configuring = panel?.kind === "configure" && draft ? draft.widgets.find((w) => w.id === panel.id) : undefined;
  const siblingSource = pads.loading && initialSiblings ? initialSiblings : pads.entries;
  const siblings = siblingSource.map((e) => ({ label: e.title, href: launchpadHref(e.key), active: e.key === launchpadKey }));

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
        status={
          preview
            ? { label: `Viewing v${preview.version}`, tone: "info" }
            : editing
              ? { label: "Editing", tone: "primary" }
              : organizationPad
                ? { label: "Organization", tone: "info" }
                : undefined
        }
        actions={actions}
        menu={
          entry && !editing
            ? {
                items: [
                  ...(mayChange ? [{ id: "rename", label: "Rename", icon: Pencil, onPress: () => setRenaming(true) }] : []),
                  {
                    id: "duplicate",
                    label: organizationPad ? "Copy to my launchpads" : "Duplicate",
                    icon: Copy,
                    onPress: () => void duplicate(),
                    disabled: !saved,
                  },
                  { id: "template", label: "Save as template", icon: BookmarkPlus, onPress: () => void saveAsTemplate("mine"), disabled: !saved },
                  ...(role.isAdmin
                    ? [
                        {
                          id: "org-template",
                          label: "Save as organization template",
                          icon: BookmarkPlus,
                          onPress: () => void saveAsTemplate("organization"),
                          disabled: !saved,
                        },
                      ]
                    : []),
                  ...(role.isAdmin && !organizationPad
                    ? [{ id: "share", label: "Share with organization", icon: Building2, onPress: () => void shareWithOrganization(), disabled: !saved }]
                    : []),
                  ...(mayChange
                    ? [{ id: "archive", label: "Archive", icon: Archive, onPress: () => void archive(), destructive: true, group: "danger" as const }]
                    : []),
                ],
              }
            : undefined
        }
      />
      <PageBusProvider busKey={launchpadKey} doc={shown ?? early?.doc ?? EMPTY_LAUNCHPAD_DOC}>
      <div className="h-full overflow-y-auto px-3 pb-6 pt-[calc(var(--shell-header-h)+0.75rem)]" data-matrx-page-scroll>
        <WhatsNewOffers placement="band" />
        {pads.loading ? (
          early ? (
            <LaunchpadGrid doc={early.doc} />
          ) : (
            <RegionSkeleton shape="cards" count={6} aria-label="Loading launchpad" />
          )
        ) : !entry && pads.error ? (
          <WidgetNotice tone="error">
            {pads.error}
            <ErrorAlchemyMenu error={pads.error} />
          </WidgetNotice>
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
              mayChange ? (
                <Button variant="primary" icon={<Pencil />} onClick={() => void startEdit()}>
                  Edit
                </Button>
              ) : undefined
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
                    onPlace: (placements) => {
                      setDraft(applyPlacements(draft, placements));
                      const moved = placements.find((p) => {
                        const before = draft.widgets.find((w) => w.id === p.id)?.layout.lg;
                        return before && (before.x !== p.lg.x || before.y !== p.lg.y || before.w !== p.lg.w || before.h !== p.lg.h);
                      });
                      if (moved) setLastTouched(moved.id);
                    },
                    onRemove: (id) => {
                      setDraft(removeWidget(draft, id));
                      if (panel?.kind === "configure" && panel.id === id) setPanel(null);
                    },
                    onConfigure: (id) => {
                      setLastTouched(id);
                      setPanel({ kind: "configure", id });
                    },
                  }
                : null
            }
          />
        )}
      </div>
      </PageBusProvider>
      {panel?.kind === "add" && draft ? (
        <AddWidgetPanel
          onClose={() => setPanel(null)}
          onAdd={(spec) => {
            // In view: the first free spot from the widget last touched (else the top), never the bottom.
            const near = lastTouched ? draft.widgets.find((w) => w.id === lastTouched) : undefined;
            const next = addWidget(draft, { type: spec.type, config: { ...spec.defaultConfig } }, undefined, near?.layout.lg.y ?? 0);
            setDraft(next);
            // One rule for every widget: the new widget opens in Set up (size, and its fields if any).
            const added = next.widgets.find((w) => !draft.widgets.some((d) => d.id === w.id));
            if (added) {
              setLastTouched(added.id);
              setPanel({ kind: "configure", id: added.id });
              revealWidget(added.id);
            }
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
          connections={(getLaunchpadWidgetSpec(configuring.type)?.accepts ?? []).map((port) => {
            const to = { widgetId: configuring.id, key: port.key };
            const bound = bindingInto(draft, configuring.id, port.key);
            return {
              key: port.key,
              label: port.label,
              value: bound ? busAddress(bound.from.widgetId, bound.from.key) : "",
              options: compatibleSources(draft, to).map((s) => ({ value: busAddress(s.from.widgetId, s.from.key), label: s.label })),
            };
          })}
          onResize={(size) => setDraft(resizeWidget(draft, configuring.id, size))}
          onConfigure={(patch) => setDraft(configureWidget(draft, configuring.id, patch))}
          onConnect={(key, address) => {
            setDraft(setBinding(draft, { widgetId: configuring.id, key }, address ? splitBusAddress(address) : null));
          }}
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
          const result = await pads.save(
            { key: launchpadKey, title: next.trim(), doc: saved, owner: entry.owner, organizationId: entry.organizationId },
            `Renamed to ${next.trim()}`,
          );
          if (!result.ok) toast.error(result.error);
          setRenaming(false);
        }}
      />
    </SurfaceRuntimeProvider>
  );
}

function initialPaint(initial: InitialLaunchpad | null): PaintedLaunchpad | null {
  if (!initial) return null;
  const parsed = parseLaunchpadDoc(initial.doc);
  return parsed.ok ? { title: initial.title, savedAt: initial.savedAt, doc: parsed.doc } : null;
}

/** Bring a just-added widget into view once the grid has drawn it (centred, so the Set up panel never covers it). */
function revealWidget(id: string) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      document.querySelector(`[data-grid-item="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }),
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
