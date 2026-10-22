"use client";

// features/canvas/maps/MapEditor.tsx
//
// One map, open. The canvas itself is InteractiveDiagramBlock in authoring
// mode — this file owns loading, the name, and saving. Nothing here draws.

import { SizedTitleInput } from "@/features/shell/host-chrome/SizedTitleInput";
import { HostedRecordBar, useHostNamesRecord } from "@/features/shell/host-chrome/RecordHostChrome";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CopyPlus,
  GitBranch,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  parseDiagramJSON,
  materializeDiagramDefaults,
  validateDiagram,
  type DiagramData,
} from "@ai-matrx/rich-content/display/blocks/diagram/parseDiagramJSON";
import { Input } from "@ai-matrx/design-system/controls";
import { Button } from "@/components/ui/button";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import {
  MAPS_SURFACE_NAME,
  createMapsScope,
  type MapSurfaceSelection,
} from "@/features/surfaces/manifests/maps.manifest";
import MapCanvas from "./MapCanvas";
import { getMap, saveMap } from "./service";

const AUTOSAVE_DELAY_MS = 1200;

/** The maps this tab has opened, by id: the latest document, kept across wake and remount of whatever hosts the editor. */
const keptMaps = new Map<string, DiagramData>();

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

export function MapEditor({
  mapId,
  embedded = false,
  onTitle,
}: {
  mapId: string;
  /**
   * A board tile: the same editor without the shell header, the back door or the page's top padding.
   * The map's name and save state sit in a strip above the canvas.
   */
  embedded?: boolean;
  /** Embedded: the map's name as it loads and changes, so the tile can carry it. */
  onTitle?: (title: string) => void;
}) {
  const [diagram, setDiagram] = useState<DiagramData | null>(() => keptMaps.get(mapId) ?? null);
  const hostNamesMap = useHostNamesRecord({ token: "canvas_item", id: mapId });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [selection, setSelection] = useState<MapSurfaceSelection>({
    kind: null,
    id: null,
  });

  // The live document, read by the debounced save without re-arming it.
  const latest = useRef<DiagramData | null>(null);
  const latestSelection = useRef<MapSurfaceSelection>({ kind: null, id: null });
  const contextNodeId = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStateRef = useRef<SaveState>("idle");

  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  useEffect(() => {
    let cancelled = false;
    // A map this tab already opened is shown from the copy kept here: waking or remounting a board tile reads
    // nothing, and the read that stamps `last_accessed_at` happens once per open of the map in this tab.
    const kept = keptMaps.get(mapId);
    if (kept) {
      latest.current = kept;
      return undefined;
    }
    void (async () => {
      const { diagram: loaded, error } = await getMap(mapId);
      if (cancelled) return;
      if (error || !loaded) {
        setLoadError(error ?? "That map could not be opened.");
        return;
      }
      keptMaps.set(mapId, loaded);
      setDiagram(loaded);
      latest.current = loaded;
    })();
    return () => {
      cancelled = true;
    };
  }, [mapId]);

  const flush = useCallback(async () => {
    const doc = latest.current;
    if (!doc) return;
    setSaveState("saving");
    const { error } = await saveMap(mapId, doc);
    if (error) {
      // Loud recovery: a save that failed must never look like one that worked.
      setSaveState("error");
      toast.error(`Could not save this map: ${error}`);
      return;
    }
    setSaveState("saved");
  }, [mapId]);

  const handleChange = useCallback(
    (next: DiagramData) => {
      latest.current = next;
      keptMaps.set(mapId, next);
      setDiagram(next);
      setSaveState("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void flush();
      }, AUTOSAVE_DELAY_MS);
    },
    [flush, mapId],
  );

  // Never let a pending edit die with the page.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (
        saveStateRef.current === "pending" ||
        saveStateRef.current === "saving"
      )
        e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const reportedTitle = diagram?.title;
  useEffect(() => {
    if (reportedTitle) onTitle?.(reportedTitle);
  }, [reportedTitle, onTitle]);

  const renameMap = (title: string) => {
    if (!latest.current) return;
    handleChange({ ...latest.current, title });
  };

  const handleSelectionChange = useCallback((next: MapSurfaceSelection) => {
    latestSelection.current = next;
    setSelection(next);
  }, []);

  const getApplicationScope = () => {
    const doc = latest.current;
    if (!doc)
      throw new Error(
        "The visual map has not finished loading its canvas data.",
      );
    const boxes = doc.nodes.filter((item) => !item.isGroup);
    const sections = doc.nodes.filter((item) => item.isGroup);
    const currentSelection = latestSelection.current;
    const selectedItem = currentSelection.id
      ? currentSelection.kind === "arrow"
        ? doc.edges.find((item) => item.id === currentSelection.id)
        : doc.nodes.find((item) => item.id === currentSelection.id)
      : undefined;

    return createMapsScope({
      map_id: mapId,
      map_title: doc.title,
      map_description: doc.description,
      map_summary: {
        id: mapId,
        title: doc.title,
        description: doc.description,
        box_count: boxes.length,
        section_count: sections.length,
        arrow_count: doc.edges.length,
      },
      map_json: doc,
      map_boxes: doc.nodes,
      map_arrows: doc.edges,
      box_count: boxes.length,
      section_count: sections.length,
      arrow_count: doc.edges.length,
      selected_item_kind: currentSelection.kind ?? undefined,
      selected_item_id: currentSelection.id ?? undefined,
      selected_item: selectedItem,
      content: JSON.stringify(doc),
      context: {
        purpose: "Non-executable visual thinking map",
        selection: currentSelection,
      },
    });
  };

  const resolveMapContextOnOpen = useCallback((target: HTMLElement | null) => {
    const nodeElement = target?.closest<HTMLElement>(
      ".react-flow__node[data-id]",
    );
    const id = nodeElement?.dataset.id ?? null;
    contextNodeId.current = id;
    const item = id
      ? latest.current?.nodes.find((node) => node.id === id)
      : null;
    if (!item) {
      const emptySelection: MapSurfaceSelection = { kind: null, id: null };
      latestSelection.current = emptySelection;
      setSelection(emptySelection);
      return null;
    }

    const nextSelection: MapSurfaceSelection = {
      kind: item.isGroup ? "section" : "box",
      id: item.id,
    };
    latestSelection.current = nextSelection;
    setSelection(nextSelection);
    return {
      selected_item_kind: nextSelection.kind,
      selected_item_id: item.id,
      selected_item: item,
    };
  }, []);

  const duplicateContextItem = useCallback(() => {
    const doc = latest.current;
    const source = doc?.nodes.find((node) => node.id === contextNodeId.current);
    if (!doc || !source) return;

    const copy = {
      ...source,
      id: `${source.isGroup ? "g" : "n"}-${crypto.randomUUID().slice(0, 8)}`,
      label: `${source.label} copy`,
      position: {
        x: (source.position?.x ?? 0) + 36,
        y: (source.position?.y ?? 0) + 36,
      },
    };
    handleChange(
      materializeDiagramDefaults({
        ...doc,
        nodes: source.isGroup ? [copy, ...doc.nodes] : [...doc.nodes, copy],
      }),
    );
  }, [handleChange]);

  const addConnectedContextBox = useCallback(() => {
    const doc = latest.current;
    const source = doc?.nodes.find((node) => node.id === contextNodeId.current);
    if (!doc || !source || source.isGroup) return;

    const id = `n-${crypto.randomUUID().slice(0, 8)}`;
    const position = source.parentId
      ? {
          x: (source.position?.x ?? 0) + 36,
          y: (source.position?.y ?? 0) + 110,
        }
      : {
          x: (source.position?.x ?? 0) + 260,
          y: source.position?.y ?? 0,
        };
    handleChange(
      materializeDiagramDefaults({
        ...doc,
        nodes: [
          ...doc.nodes,
          {
            id,
            label: "New connected box",
            nodeType: "default",
            parentId: source.parentId,
            position,
          },
        ],
        edges: [
          ...doc.edges,
          {
            id: `e-${crypto.randomUUID().slice(0, 8)}`,
            source: source.id,
            target: id,
          },
        ],
      }),
    );
  }, [handleChange]);

  const replaceMapFromSurface = async (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error(
        "replace_map expects the complete map object, not text or an array.",
      );

    const next = parseDiagramJSON(JSON.stringify({ diagram: value }));
    if (!validateDiagram(next))
      throw new Error(
        "replace_map received an invalid map: every box needs a unique id and name, and every arrow must reference boxes that exist.",
      );

    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setSaveState("saving");
    const { error } = await saveMap(mapId, next);
    if (error) {
      setSaveState("error");
      throw new Error(`The approved map could not be saved: ${error}`);
    }
    latest.current = next;
    setDiagram(next);
    handleSelectionChange({ kind: null, id: null });
    setSaveState("saved");
  };

  const getSurfaceWriteHandlers = () => ({
    replace_map: replaceMapFromSurface,
  });

  const nameField = embedded && hostNamesMap ? (
    // In a tile's header: as wide as its words, so the rest of the header still drags the tile.
    <SizedTitleInput
      data-surface-value="map_title"
      value={diagram?.title ?? ""}
      onChange={(e) => renameMap(e.target.value)}
      disabled={!diagram}
      aria-label="Map name"
      placeholder="Untitled map"
    />
  ) : (
    <Input
      data-surface-value="map_title"
      value={diagram?.title ?? ""}
      onChange={(e) => renameMap(e.target.value)}
      disabled={!diagram}
      aria-label="Map name"
      className="w-full text-center"
    />
  );
  // Not the page (a board tile): the host names the map, so the name field moves into its header and the
  // row keeps only the save state — and no row at all while there is no state to show.
  const header = embedded ? (
    <HostedRecordBar
      record={{ token: "canvas_item", id: mapId }}
      titleField={
        hostNamesMap ? (
          // The save state rides beside the name in the header: no bar row, so nothing moves under the canvas.
          <div className="flex min-w-0 items-center gap-2" data-map-bar>
            {nameField}
            <SaveIndicator state={saveState} />
          </div>
        ) : (
          <div className="min-w-0 flex-1">{nameField}</div>
        )
      }
      actions={
        hostNamesMap ? undefined : (
          <div className="flex w-28 shrink-0 justify-end" data-map-bar>
            <SaveIndicator state={saveState} />
          </div>
        )
      }
    />
  ) : (
    <RouteHeader
      left={
        <Button asChild variant="quiet" className="shrink-0">
          <Link href="/maps" aria-label="Back to maps">
            <ArrowLeft className="h-4 w-4" />
            <span className="max-sm:sr-only">Maps</span>
          </Link>
        </Button>
      }
      center={<div className="mx-auto w-[min(44vw,28rem)] px-2">{nameField}</div>}
      right={
        <div className="flex w-28 justify-end pr-1">
          <SaveIndicator state={saveState} />
        </div>
      }
    />
  );
  const bodyTop = embedded ? undefined : { paddingTop: "var(--shell-header-h)" };

  if (loadError) {
    return (
      <Frame embedded={embedded}>
        {header}
        {/* getMap reports only a message, so the gate asks the platform
            which state this is (denied, deleted, missing, signed out). */}
        <div className={embedded ? "h-full overflow-hidden" : "h-full overflow-hidden pt-[var(--shell-header-h)]"}>
          <AccessGate
            token="canvas_item"
            id={mapId}
            fallbackHref={embedded ? undefined : "/maps"}
            fallbackLabel={embedded ? undefined : "Back to your maps"}
          />
        </div>
      </Frame>
    );
  }

  if (!diagram) {
    return (
      <Frame embedded={embedded}>
        {header}
        <div className="flex h-full items-center justify-center overflow-hidden" style={bodyTop}>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Frame>
    );
  }

  return (
    <SurfaceRuntimeProvider
      surfaceName={MAPS_SURFACE_NAME}
      getScope={getApplicationScope}
      isEditable
      getWriteHandlers={getSurfaceWriteHandlers}
    >
      <Frame embedded={embedded}>
      {header}
      <NonEditableContextMenu
        sourceFeature="canvas"
        surfaceName={MAPS_SURFACE_NAME}
        menuVersion={1}
        getApplicationScope={getApplicationScope}
        resolveContextOnOpen={resolveMapContextOnOpen}
        extraSections={[
          {
            id: "map-item-actions",
            label: "Map item",
            anchor: "after-clipboard",
            items: [
              {
                kind: "item",
                id: "duplicate-map-item",
                label: "Duplicate box or section",
                icon: CopyPlus,
                onSelect: duplicateContextItem,
                disabled: !selection.id || selection.kind === "arrow",
              },
              {
                kind: "item",
                id: "add-connected-map-box",
                label: "Add connected box",
                icon: GitBranch,
                onSelect: addConnectedContextBox,
                disabled: selection.kind !== "box",
              },
            ],
          },
        ]}
      >
        <div className="min-h-0 flex-1 overflow-hidden" style={bodyTop} data-surface-value="map_json">
          <MapCanvas
            diagram={diagram}
            defaultEditing
            presentation="workspace"
            onDiagramChange={handleChange}
            onSelectionChange={handleSelectionChange}
          />
        </div>
      </NonEditableContextMenu>
      </Frame>
    </SurfaceRuntimeProvider>
  );
}

/** Embedded in a tile the strip and the canvas stack in a column that fills the tile; on the page the header floats. */
function Frame({ embedded, children }: { embedded: boolean; children: ReactNode }) {
  return embedded ? <div className="flex h-full min-h-0 flex-col">{children}</div> : <>{children}</>;
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const map: Record<
    Exclude<SaveState, "idle">,
    { label: string; className: string }
  > = {
    pending: { label: "Unsaved changes", className: "text-muted-foreground" },
    saving: { label: "Saving…", className: "text-muted-foreground" },
    saved: { label: "All changes saved", className: "text-muted-foreground" },
    error: { label: "Not saved", className: "text-destructive" },
  };
  const { label, className } = map[state];
  return (
    <span className={`flex shrink-0 items-center gap-1 text-xs ${className}`}>
      {state === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
      {state === "saved" && <Check className="h-3 w-3" />}
      {state === "error" && <TriangleAlert className="h-3 w-3" />}
      <span className="max-sm:sr-only">{label}</span>
    </span>
  );
}
