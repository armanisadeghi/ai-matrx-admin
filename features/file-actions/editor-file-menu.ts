/**
 * Google's File menu for the three editors (Sheets, Docs, Slides) — one builder, Google's order
 * and grouping. Rows we run are wired to the same ops the lists use; rows we cannot run yet are
 * registered Coming Soon rows (`lib/coming-soon/editor-menus.ts`). The editor hands its own rows
 * (New, Open, Import, Version history, Print, Details…) by id; the shared rows come from the
 * File menu's own handlers. Pure: no React.
 *
 * Google Sheets (2026): New ▸ · Open · Import · Make a copy | Share ▸ · Email ▸ · Download ▸ ·
 * Approvals | Rename · Move · Move to trash | Version history ▸ · Make available offline |
 * Details · Security limitations · Settings | Print. Docs and Slides differ only where noted.
 */

import { Copy, Download, FolderInput, History, LayoutTemplate, Mail, Pencil, Share2, Trash2, UserPlus } from "lucide-react";
import {
  CircleCheckBig,
  CloudDownload,
  FilePlus2,
  Globe,
  Languages,
  Settings,
  ShieldAlert,
  Tag,
} from "lucide-react";

import type { EditorMenuAction, EditorMenuEntry } from "@/components/editor-chrome/editor-menu-model";
import { sep, soon, type GoogleProduct } from "@/components/editor-chrome/google-parity";
import type { FileDownload } from "./types";

/** A Download row: a live format, or a Google format we cannot write yet. */
export type EditorDownload = FileDownload | { label: string; soon: string };

export type EditorFileSpec = {
  product: GoogleProduct;
  /**
   * The editor's own File rows, by id: `file.new`, `file.open`, `file.import`, `file.history`,
   * `file.print`, `file.details`, `file.settings`, `file.page-setup`. Missing ids fall back to the
   * Coming Soon row where Google has one.
   */
  rows: EditorMenuEntry[];
  /** Google's Download formats in Google's order. */
  downloads: EditorDownload[];
  /** The template gallery of this kind. */
  templatesHref: string;
};

export type EditorFileHandlers = {
  share?: () => void;
  /** Email this file / Email collaborators (opens the email dialog in that mode). */
  email?: (mode: "file" | "collaborators") => void;
  copy?: () => void;
  rename?: () => void;
  move?: () => void;
  trash?: () => void;
  saveAsTemplate?: () => void;
  download: (d: FileDownload) => void;
  navigate: (href: string) => void;
};

const NOUN: Record<GoogleProduct, string> = { sheets: "Spreadsheet", docs: "Document", slides: "Presentation" };

const action = (id: string, label: string, run: () => unknown, extra: Partial<EditorMenuAction> = {}): EditorMenuAction => ({
  kind: "action",
  id,
  label,
  run,
  ...extra,
});

export function buildEditorFileMenu(spec: EditorFileSpec, h: EditorFileHandlers): EditorMenuEntry[] {
  const byId = new Map<string, EditorMenuAction>();
  for (const r of spec.rows) if (r.kind === "action") byId.set(r.id, r);
  const row = (id: string) => byId.get(id);
  const out: EditorMenuEntry[] = [];
  const push = (...e: Array<EditorMenuEntry | undefined | false>) => {
    for (const x of e) if (x) out.push(x);
  };

  // ── New · Open · Import · Make a copy ──
  const blank = row("file.new");
  push({
    kind: "submenu",
    id: "file.new-menu",
    label: "New",
    icon: FilePlus2,
    keywords: ["create", "blank", "template"],
    items: [
      blank && { ...blank, label: NOUN[spec.product] },
      action("file.new.template", "From template gallery", () => h.navigate(spec.templatesHref), { icon: LayoutTemplate }),
      ...(h.saveAsTemplate ? [sep, action("file.save-as-template", "Save as template", h.saveAsTemplate, { icon: LayoutTemplate })] : []),
    ].filter(Boolean) as EditorMenuEntry[],
  });
  push(row("file.open"));
  if (spec.product === "slides") push(soon("file.import-slides", "Import slides", "presentations.import-slides"));
  else push(row("file.import"));
  push(h.copy && action("file.copy", "Make a copy", h.copy, { icon: Copy }));
  push(sep);

  // ── Share ▸ · Email ▸ · Download ▸ · Approvals ──
  push({
    kind: "submenu",
    id: "file.share-menu",
    label: "Share",
    icon: UserPlus,
    items: [
      ...(h.share ? [action("file.share", "Share with others", h.share, { icon: Share2 })] : []),
      soon("file.publish", "Publish to web", "editor.file.publish-to-web", { icon: Globe }),
    ],
  });
  push({
    kind: "submenu",
    id: "file.email-menu",
    label: "Email",
    icon: Mail,
    items: [
      ...(h.email
        ? [
            action("file.email.file", "Email this file", () => h.email?.("file")),
            action("file.email.collaborators", "Email collaborators", () => h.email?.("collaborators")),
          ]
        : []),
    ],
  });
  push({
    kind: "submenu",
    id: "file.download-menu",
    label: "Download",
    icon: Download,
    items: spec.downloads.map((d, i) =>
      "soon" in d
        ? soon(`file.download.${i}`, d.label, d.soon)
        : action(`file.download.${i}`, d.label, () => h.download(d)),
    ),
  });
  push(soon("file.approvals", "Approvals", "editor.file.approvals", { icon: CircleCheckBig }));
  push(sep);

  // ── Rename · Move · Move to trash ──
  push(h.rename && action("file.rename", "Rename", h.rename, { icon: Pencil }));
  push(h.move && action("file.move", "Move", h.move, { icon: FolderInput, keywords: ["project", "folder"] }));
  push(h.trash && action("file.trash", "Move to trash", h.trash, { icon: Trash2, keywords: ["delete"] }));
  push(sep);

  // ── Version history ▸ · Make available offline ──
  const history = row("file.history");
  push({
    kind: "submenu",
    id: "file.history-menu",
    label: "Version history",
    icon: History,
    items: [
      soon("file.history.name", "Name current version", "editor.file.name-version", { icon: Tag }),
      ...(history ? [{ ...history, label: "See version history" }] : []),
    ],
  });
  push(soon("file.offline", "Make available offline", "editor.file.offline", { icon: CloudDownload }));
  push(sep);

  // ── Details · Security limitations · Settings (Sheets) / Language ▸ · Page setup (Docs, Slides) ──
  push(row("file.details"));
  push(soon("file.security", "Security limitations", "editor.file.security-limitations", { icon: ShieldAlert }));
  if (spec.product === "sheets") {
    push(row("file.settings") ?? soon("file.settings", "Settings", "workbooks.settings", { icon: Settings, keywords: ["locale", "time zone", "calculation"] }));
    push(row("file.page-setup") ?? soon("file.page-setup", "Page setup", "workbooks.page-setup", { keywords: ["orientation", "paper size", "margins", "scale", "print"] }));
  } else {
    push(soon("file.language", "Language", "editor.file.language", { icon: Languages }));
    push(
      row("file.page-setup") ??
        soon("file.page-setup", "Page setup", spec.product === "slides" ? "presentations.page-setup" : "editor.file.page-setup", {
          keywords: spec.product === "slides" ? ["slide size", "widescreen", "4:3", "16:9"] : ["paper size", "margins", "orientation"],
        }),
    );
  }
  push(sep);

  // ── Print ──
  push(row("file.print"));
  // Rows the editor adds that Google's File menu does not name stay at the end (none today).
  const placed = new Set(["file.new", "file.open", "file.import", "file.history", "file.print", "file.details", "file.settings", "file.page-setup"]);
  const rest = spec.rows.filter((r) => r.kind !== "separator" && !placed.has(r.id));
  if (rest.length) push(sep, ...rest);
  // Never end on (or double) a separator.
  return out.filter((e, i, a) => !(e.kind === "separator" && (i === a.length - 1 || a[i + 1]?.kind === "separator")));
}
