"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FileText, Loader2, Star, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { DocumentRow } from "@/features/data-tables/types";
import { documentSourceLabel } from "@/features/documents/utils/documentsHubDisplay";
import { googleLinkIn } from "@/features/google-workspace/linked/link-store";
import { GoogleDocsMark } from "@/features/google-workspace/linked/marks";

export function DocumentListCard({
  doc,
  isNavigating,
  isAnyNavigating,
  onNavigate,
  menu,
  starred,
  shared,
}: {
  doc: DocumentRow;
  isNavigating: boolean;
  isAnyNavigating: boolean;
  onNavigate: (id: string, path: string, e?: React.MouseEvent) => void;
  /** The shared per-item actions (Share, Rename, Copy, Star, Trash). */
  menu: ReactNode;
  starred?: boolean;
  /** Owned by someone else. */
  shared?: boolean;
}) {
  const href = `/documents/${doc.id}`;
  const isDisabled = isNavigating || isAnyNavigating;
  const googleLink = googleLinkIn(doc.metadata);

  const handleOpen = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    if (!isDisabled) onNavigate(doc.id, href, e);
  };

  return (
    <Card className="group relative min-w-0 overflow-hidden">
      <CardContent className="p-4 space-y-2">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <Link
            href={href}
            className="flex min-w-0 flex-1 items-start gap-2 text-left"
            onClick={handleOpen}
            tabIndex={isDisabled ? -1 : 0}
            aria-disabled={isDisabled}
          >
            <FileText className="size-5 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{doc.document_name}</div>
              {doc.description ? (
                <div className="text-xs text-muted-foreground line-clamp-2 break-words">
                  {doc.description}
                </div>
              ) : null}
            </div>
          </Link>
          {menu}
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            {starred ? (
              <Star className="size-3 shrink-0 fill-current text-amber-500" aria-label="Starred" />
            ) : null}
            {shared ? (
              <Users className="size-3 shrink-0" aria-label="Shared with me" />
            ) : null}
            {googleLink?.webViewLink ? (
              <a
                href={googleLink.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center"
                title="Open in Google Docs"
                aria-label="Open in Google Docs"
              >
                <GoogleDocsMark className="size-3.5" />
              </a>
            ) : null}
            <span className="truncate">
              Updated {new Date(doc.updated_at).toLocaleString()}
            </span>
          </span>
          <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
            {documentSourceLabel(doc.source)}
          </span>
        </div>
        {isNavigating ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
