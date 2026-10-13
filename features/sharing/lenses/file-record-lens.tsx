"use client";

/**
 * The workbook / document lens — what an Anyone link to a workbook or document shows:
 * the NAME and the latest saved content, read-only. The content arrives as the link's
 * `children` (`{ kind: "workbook_snapshot" | "document_snapshot", snapshot }`), projected by
 * `platform.share_link_children`; a snapshot over the size cap arrives as `too_large` and is
 * said, never silently cut.
 */

import type { ResolvedShareToken } from "@/utils/permissions/shareLinks";
import { snapshotToGridSheets } from "@/features/workbooks/snapshot-grid";
import { SharedSheetView } from "./SharedSheetView";
import { univerDocToMarkdown } from "@/features/documents/univer-doc-to-markdown";
import { shareChildFileUrls } from "@/features/files/handler/utils/python-base";
import RichContentStandardImpl from "@ai-matrx/rich-content/levels/RichContentStandardImpl";
import type { ShareLensProps } from "./registry";

function textOf(resource: ResolvedShareToken["resource"], key: string): string {
  const v = resource?.[key];
  return typeof v === "string" ? v : "";
}

function Heading({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </header>
  );
}

function Notice({ children }: { children: string }) {
  return (
    <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function childrenOf(result: ResolvedShareToken, kind: string): { snapshot?: unknown; too_large?: boolean } | null {
  const c = result.children as { kind?: string; snapshot?: unknown; too_large?: boolean } | null;
  return c && c.kind === kind ? c : null;
}

export function WorkbookShareLens({ result }: ShareLensProps) {
  const title = textOf(result.resource, "workbook_name") || "Workbook";
  const description = textOf(result.resource, "description");
  const content = childrenOf(result, "workbook_snapshot");
  const sheets = content?.snapshot ? snapshotToGridSheets(content.snapshot) : [];
  return (
    <article className="mx-auto w-full max-w-5xl">
      <Heading title={title} description={description} />
      {content?.too_large ? (
        <Notice>This workbook is too large to show here. Open it in AI Matrx.</Notice>
      ) : sheets.length === 0 ? (
        <Notice>This workbook has no saved content yet.</Notice>
      ) : (
        <SharedSheetView sheets={sheets} />
      )}
    </article>
  );
}

/**
 * A picture of ours reached through the link's own token (no sign-in). Pictures from other
 * websites are NOT drawn on a public page (a tracking pixel in someone's document); the lens
 * counts them and says so.
 */
export function sharedImageUrl(token: string, source: string): string | null {
  const own = source.match(/^matrx-file:([0-9a-f-]+)(?:#\d+x\d+)?$/i);
  return own ? shareChildFileUrls(token, own[1]).inline : null;
}

export function DocumentShareLens({ result, token }: ShareLensProps) {
  const title = textOf(result.resource, "document_name") || "Document";
  const description = textOf(result.resource, "description");
  const content = childrenOf(result, "document_snapshot");
  let leftOut = 0;
  const markdown = content?.snapshot
    ? univerDocToMarkdown(content.snapshot, {
        imageUrl: (source) => {
          const url = sharedImageUrl(token, source);
          if (!url) leftOut += 1;
          return url;
        },
      })
    : "";
  return (
    <article className="mx-auto w-full max-w-3xl">
      <Heading title={title} description={description} />
      {content?.too_large ? (
        <Notice>This document is too large to show here. Open it in AI Matrx.</Notice>
      ) : markdown ? (
        // The owner published these pictures from their own files: they draw without a click.
        <>
          <RichContentStandardImpl source={markdown} variant="reading" imagePolicy="self" />
          {leftOut > 0 ? (
            <Notice>{`${leftOut === 1 ? "1 picture from another website is" : `${leftOut} pictures from other websites are`} not shown on this page.`}</Notice>
          ) : null}
        </>
      ) : (
        <Notice>This document has no saved content yet.</Notice>
      )}
    </article>
  );
}
