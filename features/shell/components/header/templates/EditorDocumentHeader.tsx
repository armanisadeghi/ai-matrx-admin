"use client";

/**
 * EditorDocumentHeader — the full-bleed page-top template for a document
 * editor (workbook, document), shaped like Google Sheets / Docs:
 *
 *   [icon] Title ☆ ⇢ ☁                         [history] [comments] [extras] [Share]
 *          File Edit View Insert Format …
 *   ( Menus | ↶ ↷ 🖶 … toolbar row …                                               )
 *
 * The page takes the whole top (canvas chrome: the shell header steps aside,
 * the sidebar, account rail and chat button stay). The product icon is the way
 * back to the list, as in Google. Every row has a fixed height, so status,
 * menus opening and title edits never move the canvas below.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { Menu } from "lucide-react";

import { Button } from "@ai-matrx/design-system/controls";
import { ShellChromeMode } from "@/features/shell/components/ShellChromeMode";
import { openShellMobileMenu } from "@/features/shell/utils/closeShellMobileMenu";
import { cn } from "@/lib/utils";

export type EditorDocumentHeaderProps = {
  /** The list this document lives in (the product icon goes there). */
  backHref: string;
  backLabel: string;
  /** The product mark (a 24px glyph); drawn on its tile colour. */
  productIcon: ReactNode;
  productTone: "sheets" | "docs";
  /** Title field, then its marks (star, move, save status). */
  title: ReactNode;
  titleMarks?: ReactNode;
  /** The menu bar row under the title. */
  menuBar?: ReactNode;
  /** Right cluster: history, comments, extensions, Share (Share last, like Google). */
  actions?: ReactNode;
  /** The toolbar row under the header. */
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
};

const TONE: Record<EditorDocumentHeaderProps["productTone"], string> = {
  sheets: "bg-emerald-600 text-white",
  docs: "bg-blue-600 text-white",
};

export function EditorDocumentHeader({
  backHref,
  backLabel,
  productIcon,
  productTone,
  title,
  titleMarks,
  menuBar,
  actions,
  toolbar,
  children,
  className,
}: EditorDocumentHeaderProps) {
  return (
    <div className={cn("flex h-full min-h-0 w-full flex-col bg-card", className)} data-editor-document-header="">
      <ShellChromeMode mode="canvas" />
      <header className="canvas-workspace-header flex h-[3.75rem] shrink-0 items-center gap-1.5 pl-2 pr-3">
        <Button
          variant="quiet"
          icon={<Menu />}
          aria-label="Open navigation"
          onClick={openShellMobileMenu}
          className="shrink-0 lg:hidden"
        />
        <Link
          href={backHref}
          aria-label={backLabel}
          title={backLabel}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-5",
            TONE[productTone],
          )}
        >
          {productIcon}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex h-7 min-w-0 items-center gap-0.5">
            {title}
            {titleMarks ? <span className="flex shrink-0 items-center">{titleMarks}</span> : null}
          </div>
          {menuBar ? <div className="flex h-6 min-w-0 items-center">{menuBar}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </header>
      {toolbar}
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
