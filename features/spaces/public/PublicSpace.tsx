"use client";

// features/spaces/public/PublicSpace.tsx — a page published to the web, read by anyone (J1, O10, I4).
//
// Notion's public page: the same blocks through the same editor, read-only — no block handles, no "/" menu,
// no New row, no comments. Top bar: the breadcrumb of parents that are on the web too, and Duplicate when
// the owner allows it (it runs inside the app, /spaces/duplicate: signed out signs in first). Page links open only pages that are on the web;
// any other reads "Not published". Rows of a database block are the ones this page published with it
// (`content.space_public_view` → `databases`: that block's own views, as the publisher sees them), read-only.

import { Button } from "@ai-matrx/design-system/controls";
import { Copy, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { MadeWithAiMatrx } from "@/components/matrx/MadeWithAiMatrx";

import type {
  SpaceBlock,
  SpaceDoc,
  SpaceId,
  SpaceMedia,
  SpaceSummary,
} from "../contract";
import { PublishedRowsProvider } from "../data/published-rows";
import { SpaceEditor } from "../editor/SpaceEditor";
import { Cover } from "../page/Cover";
import { PublishedMediaProvider } from "../page/media";
import { SpaceIcon, isImageMedia } from "../page/SpaceIcon";
import { readOnlySpacesValue } from "../state/read-only-value";
import {
  StaticSpacesProvider,
  type SpacesContextValue,
} from "../state/SpacesProvider";
import {
  parsePublicIcon,
  type PublicPageRef,
  type PublicSpaceView,
} from "./public-view";
import { openOutbound } from "@ai-matrx/kit/outbound";

const READ_ONLY = (what: string) => () => {
  throw new Error(`${what} is not available on a published page.`);
};

function summary(p: PublicPageRef): SpaceSummary {
  return {
    id: p.id,
    parentId: null,
    position: "0",
    title: p.title,
    icon: parsePublicIcon(p.icon),
    isArchived: false,
    updatedAt: "",
  };
}

function useStaticValue(
  view: PublicSpaceView,
  go: (id: SpaceId) => void,
): SpacesContextValue {
  const pages = [
    ...view.path,
    ...view.children,
    ...view.links,
    { id: view.id, slug: view.slug, title: view.title, icon: view.icon },
  ];
  return readOnlySpacesValue({
    pages: pages.map(summary),
    open: go,
    pageHref: (id) => `/site/${pages.find((p) => p.id === id)?.slug ?? id}`,
    missingPageLabel: "Not published",
    refusal: "This is not available on a published page.",
    publicSite: true,
    childrenOf: (parentId) =>
      parentId === view.id ? view.children.map(summary) : [],
    pathTo: () => [
      ...view.path.map(summary),
      summary({
        id: view.id,
        slug: view.slug,
        title: view.title,
        icon: view.icon,
      }),
    ],
  });
}

function DuplicateButton({
  view,
  embedded,
}: {
  view: PublicSpaceView;
  embedded: boolean;
}) {
  // Duplicate happens inside the app (/spaces/duplicate): a signed-out visitor signs in and comes back,
  // and the copy is filed in the organization the person works in. Inside somebody else's website the
  // sign-in cannot happen in the frame, so it opens in a new tab.
  const target = `/spaces/duplicate?from=${encodeURIComponent(view.slug ?? view.id)}`;
  return (
    <Button
      variant="outline"
      icon={<Copy size={15} />}
      onClick={() =>
        embedded
          ? openOutbound(target, "_blank", "noopener")
          : window.location.assign(target)
      }
      data-testid="public-duplicate"
    >
      Duplicate
    </Button>
  );
}

const NO_SUBSCRIBE = () => () => undefined;

export function PublicSpace({
  view,
  embedded = false,
}: {
  view: PublicSpaceView;
  /** Drawn inside somebody else's website (`/site/<link>?embed=1`). */
  embedded?: boolean;
}) {
  const router = useRouter();
  // BlockNote 0.55 reads `window` while it creates the editor, so the server renders the page's frame
  // (title, cover, icon) and the browser draws the blocks — a server render of the editor answered 500.
  const inBrowser = useSyncExternalStore(
    NO_SUBSCRIBE,
    () => true,
    () => false,
  );
  const value = useStaticValue(view, (id) => {
    const target = [...view.path, ...view.children, ...view.links].find(
      (p) => p.id === id,
    );
    router.push(`/site/${target?.slug ?? id}`);
  });
  const snapshot = view.snapshot;
  const settings: SpaceDoc["settings"] = {
    font: "default",
    smallText: false,
    fullWidth: false,
    locked: false,
    ...(snapshot.settings ?? {}),
  };
  const icon: SpaceMedia | null = snapshot.icon ?? parsePublicIcon(view.icon);
  const blocks: SpaceBlock[] = Array.isArray(snapshot.blocks)
    ? snapshot.blocks
    : [];
  const fontClass =
    settings.font === "serif"
      ? "spaces-font-serif"
      : settings.font === "mono"
        ? "spaces-font-mono"
        : "";
  const crumbs = [
    ...view.path,
    { id: view.id, slug: view.slug, title: view.title, icon: view.icon },
  ];
  return (
    <StaticSpacesProvider value={value}>
      <PublishedMediaProvider media={view.media}>
      <div
        className="spaces-root relative z-0 h-dvh overflow-hidden"
        data-public-page=""
        data-public-embed={embedded ? "" : undefined}
      >
        <div className="spaces-frame">
          <main className="spaces-main">
            <div
              className="spaces-page"
              data-full-width={settings.fullWidth ? "true" : undefined}
              data-small-text={settings.smallText ? "true" : undefined}
            >
              <header className="spaces-topbar">
                <nav className="spaces-breadcrumb" aria-label="Breadcrumb">
                  {crumbs.map((p, i) => (
                    <span key={p.id} className="flex min-w-0 items-center">
                      {i > 0 ? (
                        <span className="spaces-breadcrumb-sep">/</span>
                      ) : null}
                      <Link
                        href={`/site/${p.slug ?? p.id}`}
                        className="spaces-breadcrumb-item"
                        data-current={
                          i === crumbs.length - 1 ? "true" : undefined
                        }
                      >
                        {p.icon ? (
                          <SpaceIcon
                            media={parsePublicIcon(p.icon)}
                            size={16}
                          />
                        ) : (
                          <FileText size={16} strokeWidth={1.6} />
                        )}
                        <span className="truncate">
                          {p.title || "Untitled"}
                        </span>
                      </Link>
                    </span>
                  ))}
                </nav>
                <span className="flex-1" />
                {view.allowDuplicate ? (
                  <DuplicateButton view={view} embedded={embedded} />
                ) : null}
              </header>
              <div className="spaces-body">
                <div className="spaces-scroll" data-matrx-page-scroll="">
                  {snapshot.cover ? (
                    <Cover
                      cover={snapshot.cover}
                      editable={false}
                      onChange={() => {}}
                    />
                  ) : null}
                  <div className={`spaces-content ${fontClass}`}>
                    <div
                      className="spaces-header"
                      data-has-cover={snapshot.cover ? "true" : undefined}
                      data-has-icon={icon ? "true" : undefined}
                    >
                      {icon ? (
                        <span
                          className="spaces-page-icon"
                          data-image={isImageMedia(icon) ? "true" : undefined}
                        >
                          <SpaceIcon
                            media={icon}
                            size={isImageMedia(icon) ? 136 : 78}
                          />
                        </span>
                      ) : null}
                      <h1 className="spaces-title" data-testid="public-title">
                        {view.title || "Untitled"}
                      </h1>
                    </div>
                    {inBrowser ? (
                      <PublishedRowsProvider databases={view.databases} entities={view.entities}>
                        <SpaceEditor
                          spaceId={view.id}
                          initialBlocks={blocks}
                          editable={false}
                          onChange={() => {}}
                          slash={{
                            createSubpage: READ_ONLY("Adding a page"),
                            pickPage: async () => null,
                            pickSource: async () => null,
                            newDatabase: async () => null,
                          }}
                          menu={{
                            moveBlocksTo: READ_ONLY("Moving blocks"),
                            turnIntoPageIn: READ_ONLY(
                              "Turning blocks into a page",
                            ),
                            askAi: () => {},
                          }}
                        />
                      </PublishedRowsProvider>
                    ) : null}
                    <div className="spaces-page-end" aria-hidden />
                  </div>
                  <MadeWithAiMatrx />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      </PublishedMediaProvider>
    </StaticSpacesProvider>
  );
}
