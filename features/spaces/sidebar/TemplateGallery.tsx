"use client";

// features/spaces/sidebar/TemplateGallery.tsx — the Spaces template gallery (Notion's template picker).
//
// Left: search, the categories that hold templates, and "Your templates" (pages carrying the template
// label). Right: the cards of the picked category, or — once a card is picked — the template's real pages
// drawn read-only by the editor over its tables in memory (`templatePreview`, nothing written), with its
// page list to walk them, and "Use template" (SpacesProvider.packs.use: tables into the active
// organization, the pages made there, the root opened). The library is the ONE template catalog
// (custom.space_templates over custom.template; features/spaces/templates/use-pack.ts).

import {
  Badge,
  Button,
  RegionSkeleton,
  SearchField,
} from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { ArrowLeft, FileText, LayoutGrid, LayoutTemplate } from "lucide-react";
import dynamic from "next/dynamic";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { selectActiveOrganizationId } from "@/features/scopes/redux/selectors/active-context";
import { useAppSelector } from "@/lib/redux/hooks";
import { SPACE_TEMPLATE_CATEGORIES, spaceTemplateMakes, spaceTemplateMakesLine } from "@/lib/spaces-blocks/template-pack";
import { searchTemplates, templateResultCount } from "@/lib/spaces-blocks/template-search";

import type { SpaceDoc, SpaceSummary } from "../contract";
import { SpaceEditor } from "../editor/SpaceEditor";
import { Cover } from "../page/Cover";
import { Preview } from "../page/PageHistory";
import { SpaceIcon, isImageMedia } from "../page/SpaceIcon";
import { usePinnedTop } from "../page/usePinnedTop";
import { StaticSpacesProvider, useSpaces } from "../state/SpacesProvider";
import { DATABASE_HOST_CLASS } from "../editor/database-host";
import {
  listSpaceTemplates,
  previewBlockId,
  previewPages,
  readSpaceTemplate,
  type PreviewSizes,
  type SpaceTemplateCard,
  type SpaceTemplateFull,
} from "../templates/use-pack";

// A page-less pack makes a BOARD (the design-system starters): its card opens the Board gallery's own preview
// and install (naming, tables, board), loaded only when such a card is picked.
const BoardTemplateGallery = dynamic(
  () => import("@/features/board/templates/BoardTemplateGallery").then((m) => m.BoardTemplateGallery),
  { ssr: false },
);

const ALL = "all";
const MINE = "mine";
const READ_ONLY = () => {
  throw new Error("This is a preview.");
};

export function TemplateGallery({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const spaces = useSpaces();
  const { templates, store, packs } = spaces;
  // org-filter: write-target "Use template" files into the active organization; the cards mark what it already has
  const activeOrg = useAppSelector(selectActiveOrganizationId);
  const [cards, setCards] = useState<SpaceTemplateCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(ALL);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [mine, setMine] = useState<Record<string, SpaceDoc | null>>({});
  const [boardKey, setBoardKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    templates.refresh();
    let live = true;
    setError(null);
    listSpaceTemplates(activeOrg).then(
      (c) => live && setCards(c),
      (e: unknown) =>
        live &&
        setError(
          e instanceof Error ? e.message : "We couldn't list the templates.",
        ),
    );
    return () => {
      live = false;
    };
    // Read each time the gallery opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeOrg]);

  // The person's own labeled pages, each read once (title, icon, blocks).
  const ids = templates.ids ?? [];
  useEffect(() => {
    let live = true;
    for (const id of ids) {
      if (id in mine) continue;
      void store.get(id).then(
        (d) => live && setMine((prev) => ({ ...prev, [id]: d })),
        () => live && setMine((prev) => ({ ...prev, [id]: null })),
      );
    }
    return () => {
      live = false;
    };
    // Keyed on the id list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);
  const ownPages = ids.filter((id) => mine[id] && !mine[id]!.isArchived);

  // THE ONE TEMPLATE SEARCH (lib/spaces-blocks/template-search.ts): words, synonyms, what is inside, ranked.
  const needle = q.trim();
  // The rail counts follow the same search as the cards, so "All templates 12 of 183" always matches what is shown.
  const counts = new Map<string, number>();
  const matching = searchTemplates(cards ?? [], needle, (c) => c.space);
  for (const c of matching)
    counts.set(c.space.category, (counts.get(c.space.category) ?? 0) + 1);
  const shown = searchTemplates(
    (cards ?? []).filter(
      (c) => category === ALL || c.space.category === category,
    ),
    needle,
    (c) => c.space,
  );
  const ownShown = searchTemplates(ownPages, needle, (id) => ({
    title: mine[id]?.title ?? "",
  }));

  const allCount = needle
    ? templateResultCount(needle, matching.length, (cards ?? []).length)
    : (cards?.length ?? undefined);
  const shownCount = (category === MINE ? 0 : shown.length) +
    (category === MINE || (category === ALL && needle) ? ownShown.length : 0);

  const pick = (key: string | null) => {
    const card = key ? cards?.find((c) => c.id === key) : undefined;
    if (card && spaceTemplateMakes(card.space) === "board") {
      // A board template: the Board gallery previews and installs it; this picker steps aside.
      onOpenChange(false);
      setBoardKey(`pack:${card.id}`);
      return;
    }
    setPicked(key);
  };
  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) setPicked(null);
  };

  return (
    <>
    {boardKey ? (
      <BoardTemplateGallery
        key={boardKey}
        open
        onOpenChange={(next) => (next ? undefined : setBoardKey(null))}
        initialKey={boardKey}
      />
    ) : null}
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-[min(1180px,96vw)] h-[86dvh] gap-0 p-0 overflow-hidden spaces-tg">
        <DialogTitle className="sr-only">Templates</DialogTitle>
        <div className="spaces-tg-body">
          <aside className="spaces-tg-rail">
            <div className="spaces-tg-search">
              <SearchField
                placeholder="Search templates"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full"
              />
            </div>
            <nav className="spaces-tg-cats" aria-label="Template categories">
              <RailRow
                icon={<LayoutGrid size={16} />}
                label="All templates"
                count={allCount}
                active={category === ALL && !picked}
                onClick={() => (setCategory(ALL), pick(null))}
              />
              {SPACE_TEMPLATE_CATEGORIES.filter((c) => counts.get(c.key)).map(
                (c) => (
                  <RailRow
                    key={c.key}
                    label={c.label}
                    count={counts.get(c.key)}
                    active={category === c.key && !picked}
                    onClick={() => (setCategory(c.key), pick(null))}
                  />
                ),
              )}
              {ownPages.length ? (
                <RailRow
                  icon={<LayoutTemplate size={16} />}
                  label="Your templates"
                  count={ownPages.length}
                  active={category === MINE && !picked}
                  onClick={() => (setCategory(MINE), pick(null))}
                />
              ) : null}
            </nav>
          </aside>
          <section className="spaces-tg-main">
            {picked?.startsWith("mine:") ? (
              <OwnPreview
                doc={mine[picked.slice(5)] ?? null}
                onBack={() => pick(null)}
                onUse={async (d) => (
                  await templates.use(d.id, d.title),
                  close(false)
                )}
                titleOf={(id) => spaces.byId.get(id)?.title ?? null}
              />
            ) : picked ? (
              <PackPreview
                card={(cards ?? []).find((c) => c.id === picked)!}
                onBack={() => pick(null)}
                stage={packs.stage}
                onUse={async (sizes) => (
                  close(false),
                  await packs.use(picked, sizes)
                )}
              />
            ) : (
              <div className="spaces-tg-scroll">
                <h2 className="type-title spaces-tg-heading">
                  {category === ALL
                    ? "All templates"
                    : category === MINE
                      ? "Your templates"
                      : (SPACE_TEMPLATE_CATEGORIES.find(
                          (c) => c.key === category,
                        )?.label ?? "Templates")}
                </h2>
                {needle && cards ? (
                  <p
                    className="type-secondary text-muted-foreground"
                    data-template-result-count={shownCount}
                    role="status"
                  >
                    {shownCount === 1 ? "1 result" : `${shownCount} results`}
                  </p>
                ) : null}
                {error ? (
                  <ErrorNotice
                    title="Templates could not be listed"
                    message={error}
                    size="compact"
                  />
                ) : null}
                {cards === null && !error ? (
                  <RegionSkeleton
                    shape="cards"
                    count={6}
                    aria-label="Loading templates"
                  />
                ) : null}
                <div className="spaces-tg-grid">
                  {category !== MINE
                    ? shown.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="spaces-tg-card"
                          onClick={() => pick(c.id)}
                        >
                          <span className="spaces-tg-card-icon">
                            <SpaceIcon media={c.space.icon} size={28} />
                          </span>
                          <span className="spaces-tg-card-title">
                            {c.space.title}
                          </span>
                          <span className="spaces-tg-card-line type-secondary text-muted-foreground">
                            {c.space.description}
                          </span>
                          <span className="spaces-tg-card-foot type-secondary text-muted-foreground">
                            {spaceTemplateMakesLine(c.space)}
                            {c.installed ? (
                              <Badge tone="success">In this organization</Badge>
                            ) : null}
                          </span>
                        </button>
                      ))
                    : null}
                  {category === MINE || (category === ALL && needle)
                    ? ownShown.map((id) => (
                        <button
                          key={id}
                          type="button"
                          className="spaces-tg-card"
                          onClick={() => pick(`mine:${id}`)}
                        >
                          <span className="spaces-tg-card-icon">
                            {mine[id]?.icon ? (
                              <SpaceIcon media={mine[id]!.icon} size={28} />
                            ) : (
                              <LayoutTemplate size={26} />
                            )}
                          </span>
                          <span className="spaces-tg-card-title">
                            {mine[id]?.title || "Untitled"}
                          </span>
                          <span className="spaces-tg-card-foot type-secondary text-muted-foreground">
                            Your template
                          </span>
                        </button>
                      ))
                    : null}
                </div>
                {cards &&
                !shown.length &&
                !(category === MINE && ownShown.length) ? (
                  <p className="type-secondary text-muted-foreground">
                    No templates match.
                  </p>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

function RailRow({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  count?: number | string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="spaces-tg-rail-row"
      data-active={active ? "true" : undefined}
      onClick={onClick}
    >
      {icon ? <span className="spaces-menu-row-icon">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {count ? (
        <span className="type-secondary text-muted-foreground">{count}</span>
      ) : null}
    </button>
  );
}

/**
 * The sizes the preview drew the shown page's database blocks at (painted, not loading, not held), by their
 * place on the page (previewBlockId): the page "Use template" makes holds them from its first frame.
 */
function measurePreview(
  pane: HTMLElement | null,
  pageKey: string,
): PreviewSizes | null {
  if (!pane) return null;
  const prefix = previewBlockId(pageKey, 0).slice(0, -1);
  const blocks: PreviewSizes["blocks"] = {};
  for (const el of pane.querySelectorAll<HTMLElement>(
    `.${DATABASE_HOST_CLASS}[data-block-id^="${CSS.escape(prefix)}"]`,
  )) {
    const k = Number(el.dataset.blockId?.slice(prefix.length));
    if (!k || el.style.height || el.querySelector(".spaces-db-loading")) continue;
    const r = el.getBoundingClientRect();
    if (r.height > 0)
      blocks[k] = { w: Math.round(r.width), h: Math.round(r.height) };
  }
  return Object.keys(blocks).length
    ? { page: pageKey, vw: window.innerWidth, blocks }
    : null;
}

/** A pack's real pages, read-only, over its tables in memory; page links walk the preview. */
function PackPreview({
  card,
  onBack,
  onUse,
  stage,
}: {
  card: SpaceTemplateCard;
  onBack: () => void;
  onUse: (sizes: PreviewSizes | null) => void;
  stage: string | null;
}) {
  const spaces = useSpaces();
  const [full, setFull] = useState<SpaceTemplateFull | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [pageKey, setPageKey] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    readSpaceTemplate(card.id).then(
      (t) => live && setFull(t),
      (e: unknown) =>
        live &&
        setFailed(
          e instanceof Error ? e.message : "We couldn't open this template.",
        ),
    );
    return () => {
      live = false;
    };
  }, [card.id]);
  const pages = full ? previewPages(full) : [];
  const current = pages.find((p) => p.key === pageKey) ?? pages[0];
  const scrollRef = useRef<HTMLDivElement>(null);
  usePinnedTop(scrollRef, `${card.id}:${current?.key ?? ""}`);
  const summaries = new Map<string, SpaceSummary>(
    pages.map((p) => [
      `preview-${p.key}`,
      {
        id: `preview-${p.key}`,
        parentId: null,
        position: "0",
        title: p.title,
        icon: p.doc.icon ?? null,
        isArchived: false,
        updatedAt: "",
      },
    ]),
  );
  const value = {
    ...spaces,
    linkTarget: (id: string) => summaries.get(id) ?? null,
    requestLink: () => undefined,
    open: (id: string) =>
      id.startsWith("preview-")
        ? setPageKey(id.slice("preview-".length))
        : undefined,
    pageHref: () => "#",
  };
  return (
    <div className="spaces-tg-preview">
      <div className="spaces-tg-bar">
        <Button
          variant="quiet"
          icon={<ArrowLeft size={15} />}
          onClick={onBack}
          aria-label="Back to templates"
        />
        <span className="spaces-tg-bar-icon">
          <SpaceIcon media={card.space.icon} size={18} />
        </span>
        <span className="min-w-0 flex-1 truncate type-title">
          {card.space.title}
        </span>
        <Button
          variant="primary"
          disabled={!full || !!stage}
          onClick={() =>
            onUse(current ? measurePreview(scrollRef.current, current.key) : null)
          }
        >
          {stage ? "Adding…" : "Use template"}
        </Button>
      </div>
      <div className="spaces-tg-preview-body">
        <aside className="spaces-tg-pages">
          <p className="type-secondary text-muted-foreground spaces-tg-pages-head">
            {card.space.forWho}
          </p>
          {pages.map((p) => (
            <button
              key={p.key}
              type="button"
              className="spaces-tg-rail-row"
              data-active={current?.key === p.key ? "true" : undefined}
              onClick={() => setPageKey(p.key)}
            >
              <span className="spaces-menu-row-icon">
                {p.doc.icon ? (
                  <SpaceIcon media={p.doc.icon} size={16} />
                ) : (
                  <FileText size={16} />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-left">
                {p.title}
              </span>
            </button>
          ))}
        </aside>
        <div
          className="spaces-tg-page"
          data-matrx-page-scroll=""
          ref={scrollRef}
        >
          {failed ? (
            <ErrorNotice
              title="This template could not be opened"
              message={failed}
              size="compact"
            />
          ) : null}
          {!full && !failed ? (
            <RegionSkeleton
              shape="rows"
              count={8}
              aria-label="Loading the template"
            />
          ) : null}
          {current ? (
            <StaticSpacesProvider value={value}>
              <div
                className="spaces-page"
                data-full-width={
                  current.doc.settings.fullWidth ? "true" : undefined
                }
                data-small-text={
                  current.doc.settings.smallText ? "true" : undefined
                }
              >
                {current.doc.cover ? (
                  <Cover
                    cover={current.doc.cover}
                    editable={false}
                    onChange={() => {}}
                  />
                ) : null}
                <div className="spaces-content">
                  <div
                    className="spaces-header"
                    data-has-cover={current.doc.cover ? "true" : undefined}
                    data-has-icon={current.doc.icon ? "true" : undefined}
                  >
                    {current.doc.icon ? (
                      <span
                        className="spaces-page-icon"
                        data-image={
                          isImageMedia(current.doc.icon) ? "true" : undefined
                        }
                      >
                        <SpaceIcon
                          media={current.doc.icon}
                          size={isImageMedia(current.doc.icon) ? 136 : 78}
                        />
                      </span>
                    ) : null}
                    <h1 className="spaces-title">{current.title}</h1>
                  </div>
                  <SpaceEditor
                    key={`${card.id}:${current.key}`}
                    spaceId={`preview-${current.key}`}
                    initialBlocks={current.doc.blocks}
                    editable={false}
                    onChange={() => {}}
                    slash={{
                      createSubpage: READ_ONLY,
                      pickPage: async () => null,
                      pickSource: async () => null,
                      newDatabase: async () => null,
                    }}
                    menu={{
                      moveBlocksTo: READ_ONLY,
                      turnIntoPageIn: READ_ONLY,
                      askAi: () => {},
                    }}
                  />
                </div>
              </div>
            </StaticSpacesProvider>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** One of the person's own labeled pages: its text outline, and Use template = copy it. */
function OwnPreview({
  doc,
  onBack,
  onUse,
  titleOf,
}: {
  doc: SpaceDoc | null;
  onBack: () => void;
  onUse: (d: SpaceDoc) => Promise<void>;
  titleOf: (id: string) => string | null;
}) {
  const [using, setUsing] = useState(false);
  return (
    <div className="spaces-tg-preview">
      <div className="spaces-tg-bar">
        <Button
          variant="quiet"
          icon={<ArrowLeft size={15} />}
          onClick={onBack}
          aria-label="Back to templates"
        />
        <span className="min-w-0 flex-1 truncate type-title">
          {doc?.title || "Untitled"}
        </span>
        <Button
          variant="primary"
          disabled={!doc || using}
          onClick={async () => {
            if (!doc) return;
            setUsing(true);
            try {
              await onUse(doc);
            } finally {
              setUsing(false);
            }
          }}
        >
          {using ? "Adding…" : "Use template"}
        </Button>
      </div>
      <div className="spaces-tg-page">
        {doc ? (
          <Preview blocks={doc.blocks} titleOf={titleOf} />
        ) : (
          <RegionSkeleton
            shape="rows"
            count={8}
            aria-label="Loading the template"
          />
        )}
      </div>
    </div>
  );
}
