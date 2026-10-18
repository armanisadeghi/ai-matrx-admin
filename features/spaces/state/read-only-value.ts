// features/spaces/state/read-only-value.ts — the Spaces context for a screen that only READS pages:
// the page published to the web (/site, PublicSpace) and a template's public preview (/templates/<slug>,
// TemplatePackPreview). Blocks read `byId`, `open`, `pathTo` and `pageHref` from it; every writing door
// refuses with the screen's own sentence, so nothing on such a screen can write.

import type { SpaceId, SpaceSummary } from "../contract";
import type { SpacesContextValue } from "./SpacesProvider";

export function readOnlySpacesValue({
  pages,
  open,
  pageHref,
  missingPageLabel,
  refusal,
  childrenOf,
  pathTo,
  publicSite,
  linkTarget,
}: {
  /** Every page the screen can show or link to. */
  pages: SpaceSummary[];
  open: (id: SpaceId) => void;
  pageHref: (id: SpaceId) => string;
  missingPageLabel: string;
  /** What a writing door says ("This is not available on a published page."). */
  refusal: string;
  childrenOf?: (parentId: SpaceId | null) => SpaceSummary[];
  pathTo?: (id: SpaceId) => SpaceSummary[];
  publicSite?: boolean;
  linkTarget?: (id: SpaceId) => SpaceSummary | null | undefined;
}): SpacesContextValue {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const noop = () => {};
  const refuse = () => {
    throw new Error(refusal);
  };
  return {
    store: new Proxy({} as SpacesContextValue["store"], { get: () => refuse }),
    publicSite,
    ready: true,
    loadError: null,
    access: null,
    retryLoad: noop,
    patchSummary: noop,
    takeFocusTitle: () => false,
    openToName: () => undefined,
    takeFresh: () => null,
    pageEpoch: () => 0,
    reopenPage: noop,
    sample: { adding: false, progress: null, add: async () => refuse() },
    templates: { ids: [], error: null, refresh: noop, setTemplate: async () => refuse(), use: async () => refuse() },
    packs: { stage: null, use: async () => refuse() },
    summaries: [...byId.values()],
    archived: [],
    loadTrash: noop,
    trashLoaded: true,
    // The screen carries every page it shows; nothing loads lazily here.
    childrenLoaded: () => true,
    loadChildren: async () => {},
    reveal: noop,
    byId,
    childrenOf: childrenOf ?? (() => []),
    pathTo: pathTo ?? ((id) => (byId.has(id) ? [byId.get(id)!] : [])),
    favorites: [],
    toggleFavorite: noop,
    recent: [],
    markVisited: noop,
    createSpace: async () => refuse(),
    archiveSpace: async () => refuse(),
    restoreSpace: async () => refuse(),
    duplicateSpace: async () => refuse(),
    moveSpace: async () => refuse(),
    open: (id) => (byId.has(id) ? open(id) : undefined),
    quickFind: { open: false, mode: "jump" },
    openQuickFind: noop,
    closeQuickFind: noop,
    sidebarCollapsed: true,
    setSidebarCollapsed: noop,
    mobileSidebarOpen: false,
    setMobileSidebarOpen: noop,
    pageHref,
    missingPageLabel,
    linkTarget,
  };
}
