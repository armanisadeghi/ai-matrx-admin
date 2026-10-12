"use client";

/**
 * EditorDocumentHeader — the full-bleed page-top template for a document
 * editor (workbook, document, presentation), shaped like Google Sheets / Docs / Slides:
 *
 *   [icon] Title ☆ ⇢ ☁                         [history] [comments] [extras] [Share]
 *          File Edit View Insert Format …
 *   ( Menus | ↶ ↷ 🖶 … toolbar row …                                               )
 *
 * The page takes the whole top (canvas chrome: the shell header steps aside,
 * the sidebar, account rail and chat button stay). The product icon is the way
 * back to the list, as in Google. Every row has a fixed height, so status,
 * menus opening and title edits never move the canvas below.
 *
 * The Microsoft 365 look (the person's Office look setting, `useOfficeLook`) draws the same parts
 * the Office-on-the-web way when the page hands a `ribbon`: the title centred in a 48px bar, then
 * the ribbon (File · Home · Insert · … over grouped buttons) in place of the menu bar + toolbar.
 * Same commands, same File menu, same actions — only the presentation differs.
 */

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Menu } from "lucide-react";

import { Button } from "@ai-matrx/design-system/controls";
import { ShellChromeMode } from "@/features/shell/components/ShellChromeMode";
import { openShellMobileMenu } from "@/features/shell/utils/closeShellMobileMenu";
import { cn } from "@/lib/utils";
import { useOfficeLook } from "@/features/file-actions/skin/useOfficeLook";
import { OFFICE_ACCENT } from "@/features/file-actions/skin/office-look";

export type EditorDocumentHeaderProps = {
  /** The list this document lives in (the product icon goes there). */
  backHref: string;
  backLabel: string;
  /** The product mark (a 24px glyph); drawn on its tile colour. */
  productIcon: ReactNode;
  productTone: "sheets" | "docs" | "slides";
  /** Title field, then its marks (star, move, save status). */
  title: ReactNode;
  titleMarks?: ReactNode;
  /** The menu bar row under the title. */
  menuBar?: ReactNode;
  /** Right cluster: history, comments, extensions, Share (Share last, like Google). */
  actions?: ReactNode;
  /** The toolbar row under the header. */
  toolbar?: ReactNode;
  /**
   * The Microsoft 365 look's ribbon (`EditorRibbon` over the same menus + toolbar). Drawn instead
   * of `menuBar` + `toolbar` when the person's Office look is Microsoft 365.
   */
  ribbon?: ReactNode;
  children: ReactNode;
  className?: string;
};

const OFFICE_KIND = { sheets: "workbook", docs: "document", slides: "presentation" } as const;

const TONE: Record<EditorDocumentHeaderProps["productTone"], string> = {
  sheets: "bg-emerald-600 text-white",
  docs: "bg-blue-600 text-white",
  slides: "bg-amber-500 text-white",
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
  ribbon,
  children,
  className,
}: EditorDocumentHeaderProps) {
  const [look] = useOfficeLook();
  if (look === "microsoft" && ribbon) {
    const accent = OFFICE_ACCENT[OFFICE_KIND[productTone]];
    return (
      <div
        className={cn(
          "flex h-full min-h-0 w-full flex-col bg-card [--office-accent:var(--office-accent-light)] dark:[--office-accent:var(--office-accent-dark)]",
          className,
        )}
        style={{ "--office-accent-light": accent.light, "--office-accent-dark": accent.dark } as CSSProperties}
        data-editor-document-header=""
        data-office-look="microsoft"
      >
        <ShellChromeMode mode="canvas" />
        <header className="canvas-workspace-header grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] items-center gap-2 border-b border-border/60 bg-[color-mix(in_oklab,var(--office-accent)_7%,hsl(var(--card)))] pl-2 pr-3 [font-family:'Segoe_UI',system-ui,sans-serif]">
          <div className="flex min-w-0 items-center gap-1.5">
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
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--office-accent)] text-white [&_svg]:size-5"
            >
              {productIcon}
            </Link>
          </div>
          <div className="flex h-7 min-w-0 items-center justify-center gap-0.5">
            {title}
            {titleMarks ? <span className="flex shrink-0 items-center">{titleMarks}</span> : null}
          </div>
          {actions ? <div className="flex min-w-0 items-center justify-end gap-1">{actions}</div> : <span />}
        </header>
        {ribbon}
        <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    );
  }
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
