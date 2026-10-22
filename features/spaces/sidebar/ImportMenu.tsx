"use client";

// features/spaces/sidebar/ImportMenu.tsx — Notion's sidebar "Import" (K2): Markdown, HTML, Word or CSV files
// become new pages (one per file; top-level from the sidebar, sub-pages from a page's ••• Import); the last opens.

import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Archive, Code2, FileDown, FileInput, FileText, FileType, Link2, Table } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { toast } from "@/lib/toast";

import { useMoveIn } from "../ai/MoveIn";
import { IMPORT_ACCEPT, readImport, type ImportKind } from "../io/import";
import { useOptionalNotionImportDoor } from "../io/NotionImport";
import { uploadSpaceImage } from "../page/media";
import { useSpaces } from "../state/SpacesProvider";

const KINDS: Array<{ kind: ImportKind; label: string; icon: ReactNode }> = [
  { kind: "markdown", label: "Text & Markdown", icon: <FileText size={16} /> },
  { kind: "html", label: "HTML", icon: <Code2 size={16} /> },
  { kind: "word", label: "Word", icon: <FileType size={16} /> },
  { kind: "csv", label: "CSV", icon: <Table size={16} /> },
];

export interface ImportChoice {
  key: string;
  label: string;
  icon: ReactNode;
  run: () => void;
}

/**
 * THE Import choices (K2), shared by the sidebar's Import and the page's ••• Import (A7): Markdown, HTML, Word
 * or CSV files become new pages — top-level from the sidebar, sub-pages of `parentId` from a page — plus the
 * Notion doors. Render `inputs` once beside the trigger.
 */
export function useSpacesImport(parentId: string | null) {
  const { store, open: openSpace } = useSpaces();
  const [busy, setBusy] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const kindRef = useRef<ImportKind>("markdown");
  const moveIn = useMoveIn();
  const notion = useOptionalNotionImportDoor();
  const zip = useRef<HTMLInputElement>(null);

  const pick = (kind: ImportKind) => {
    kindRef.current = kind;
    const el = input.current;
    if (!el) return;
    el.accept = IMPORT_ACCEPT[kind];
    el.value = "";
    el.click();
  };

  const run = async (files: File[]) => {
    let last: string | null = null;
    let made = 0;
    for (const [i, file] of files.entries()) {
      setBusy(`${i + 1}/${files.length}`);
      try {
        const page = await readImport(file, kindRef.current, { storeFile: uploadSpaceImage });
        const doc = await store.create({ parentId, title: page.title, blocks: page.blocks });
        last = doc.id;
        made += 1;
        if (page.warnings.length) toast.warning(`${file.name}: ${page.warnings.length} part${page.warnings.length === 1 ? "" : "s"} not imported as is`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `${file.name} could not be imported.`);
      }
    }
    setBusy(null);
    if (made) toast.success(made === 1 ? "Imported 1 page" : `Imported ${made} pages`);
    if (last) openSpace(last);
  };

  const choices: ImportChoice[] = [
    ...KINDS.map((k) => ({ key: k.kind, label: k.label, icon: k.icon, run: () => pick(k.kind) })),
    ...(notion
      ? [
          { key: "zip", label: "Notion export (.zip)", icon: <Archive size={16} />, run: () => zip.current && ((zip.current.value = ""), zip.current.click()) },
          { key: "notion-connected", label: "From your connected Notion", icon: <Link2 size={16} />, run: () => notion.chooseConnection() },
          { key: "notion-connect", label: "Connect Notion", icon: <Link2 size={16} />, run: () => void notion.connect() },
        ]
      : []),
    ...(moveIn.wired ? [{ key: "move-in", label: "From Notion", icon: <FileInput size={16} />, run: () => moveIn.ask() }] : []),
  ];

  const inputs = (
    <>
      <input
        ref={zip}
        type="file"
        accept=".zip,application/zip"
        hidden
        aria-hidden
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file && notion) void notion.fromZip(file);
        }}
      />
      <input
        ref={input}
        type="file"
        multiple
        hidden
        aria-hidden
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files ?? []);
          if (files.length) void run(files);
        }}
      />
    </>
  );
  return { choices, inputs, busy };
}

export function ImportButton() {
  const [open, setOpen] = useState(false);
  const { choices, inputs, busy } = useSpacesImport(null);
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="spaces-nav-row" disabled={busy !== null}>
            <FileDown size={17} />
            Import
            {busy ? <span className="ml-auto type-secondary text-muted-foreground">{busy}</span> : null}
          </button>
        </PopoverTrigger>
        <PopoverContent surface="solid" side="right" align="end" width="sm" padding="xs">
          {choices.map((c) => (
            <button key={c.key} type="button" className="spaces-menu-row" onClick={() => (setOpen(false), c.run())}>
              <span className="spaces-menu-row-icon">{c.icon}</span>
              <span className="flex-1 truncate text-left">{c.label}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>
      {inputs}
    </>
  );
}
