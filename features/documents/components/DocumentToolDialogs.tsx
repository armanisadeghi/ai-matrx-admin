"use client";

/**
 * The Docs tools that open a dialog: Emoji, Special characters, Building blocks, Bookmarks,
 * Borders and lines, Compare documents, Voice typing and Language. One `open` id, one piece of
 * editor state. Every action is a real Univer command through `DocEditOps`.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Select } from "@ai-matrx/design-system/controls";
import { ProInput } from "@/components/official/ProInput";
import { ProTextarea, type ProTextareaElement } from "@/components/official/ProTextarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { useOpenDiffViewerWindow } from "@/features/overlays/openers/diffViewerWindow";
import type { DocEditOps } from "@/features/documents/doc-edit-ops";
import {
  BUILDING_BLOCKS,
  DOCUMENT_LANGUAGES,
  bookmarkHash,
  cleanBookmarkName,
  paragraphBorderParams,
  type Bookmark,
  type BorderChoice,
} from "@/features/documents/doc-tools-core";
import { EMOJI_GROUPS, SPECIAL_GROUPS, searchSymbols } from "@/features/documents/doc-symbols";
import { getLatestDocumentSnapshot, listAccessibleDocuments } from "@/features/documents/document-service";
import { univerDocToMarkdown } from "@/features/documents/univer-doc-to-markdown";

export type DocDialogId = "emoji" | "special" | "building-blocks" | "bookmarks" | "borders" | "compare" | "voice" | "language";

interface Props {
  open: DocDialogId | null;
  onClose: () => void;
  ops: DocEditOps | null;
  documentId: string;
  documentName: string;
  language: string;
  onLanguage: (code: string) => void;
  exec: (id: string, params?: object) => unknown;
}

const NEEDS_CLICK = "Click into the document first, then insert.";
/** The dialog closing hands focus back to the page; let the editor take it before the caret is read. */
const afterClose = (fn: () => void) => setTimeout(fn, 80);

function Shell({ title, onClose, children, width = "max-w-md", marker }: { title: string; onClose: () => void; children: ReactNode; width?: string; marker: string }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={width} {...{ [marker]: "" }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

function SymbolPicker({ kind, ops, onClose }: { kind: "emoji" | "special"; ops: DocEditOps | null; onClose: () => void }) {
  const groups = kind === "emoji" ? EMOJI_GROUPS : SPECIAL_GROUPS;
  const [q, setQ] = useState("");
  const found = q.trim() ? searchSymbols(groups, q) : null;
  const pick = (char: string) => {
    onClose();
    afterClose(() => void ops?.insertText(char).then((ok) => !ok && toast.error(NEEDS_CLICK)));
  };
  return (
    <Shell title={kind === "emoji" ? "Insert emoji" : "Insert special character"} onClose={onClose} width="max-w-lg" marker={`data-doc-${kind}`}>
      <ProInput aria-label="Search" placeholder={kind === "emoji" ? "Search emoji, e.g. rocket" : "Search by name, e.g. arrow or euro"} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="max-h-[50vh] overflow-y-auto">
        {(found ? [{ id: "found", label: found.length ? "Results" : "No results", items: found }] : groups).map((g) => (
          <div key={g.id} className="mb-3">
            <div className="mb-1 text-xs text-muted-foreground">{g.label}</div>
            <div className="flex flex-wrap gap-1">
              {g.items.map((c) => (
                <button key={c.char + c.name} type="button" data-clickable title={c.name} aria-label={c.name} className="flex size-9 items-center justify-center rounded border border-border text-lg hover:bg-accent" onClick={() => pick(c.char)}>
                  {c.char}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function BuildingBlocks({ ops, onClose }: { ops: DocEditOps | null; onClose: () => void }) {
  return (
    <Shell title="Building blocks" onClose={onClose} marker="data-doc-building-blocks">
      <ul className="grid gap-1">
        {BUILDING_BLOCKS.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              data-clickable
              data-block={b.id}
              className="w-full rounded border border-border px-3 py-2 text-left hover:bg-accent"
              onClick={() => {
                onClose();
                afterClose(() => void ops?.insertMarkdown(b.markdown).then((ok) => !ok && toast.error(NEEDS_CLICK)));
              }}
            >
              <div className="text-sm font-medium">{b.label}</div>
              <div className="text-xs text-muted-foreground">{b.description}</div>
            </button>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function Bookmarks({ ops, documentId, onClose }: { ops: DocEditOps | null; documentId: string; onClose: () => void }) {
  const [list, setList] = useState<Bookmark[]>(() => ops?.bookmarks() ?? []);
  const [name, setName] = useState("");
  const refresh = () => setList(ops?.bookmarks() ?? []);
  const add = () => {
    const clean = cleanBookmarkName(name, list);
    if (!clean.ok) return void toast.error(clean.why);
    onClose();
    afterClose(() => void ops?.addBookmark(clean.name).then((ok) => (ok ? toast.success(`Bookmarked "${clean.name}"`) : toast.error("Click into the document where the bookmark goes, then try again."))));
  };
  return (
    <Shell title="Bookmarks" onClose={onClose} marker="data-doc-bookmarks">
      <div className="flex gap-2">
        <ProInput aria-label="Bookmark name" placeholder="Name this spot" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} autoFocus />
        <Button onClick={add}>Add</Button>
      </div>
      <ul className="max-h-[40vh] divide-y divide-border overflow-y-auto text-sm">
        {list.length === 0 ? <li className="py-2 text-muted-foreground">No bookmarks yet</li> : null}
        {list.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-2 py-2" data-bookmark={b.name}>
            <span className="min-w-0 truncate">{b.name || "Untitled"}</span>
            <span className="flex shrink-0 gap-1">
              <Button onClick={() => (ops?.goTo(b.offset + 1), onClose())}>Go to</Button>
              <Button onClick={() => void navigator.clipboard?.writeText(`${location.origin}/documents/${documentId}${bookmarkHash(b.name)}`).then(() => toast.success("Link copied"))}>Copy link</Button>
              <Button onClick={() => void ops?.deleteBookmark(b).then(refresh)}>Remove</Button>
            </span>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function Borders({ exec, onClose }: { exec: Props["exec"]; onClose: () => void }) {
  const [c, setC] = useState<BorderChoice>({ side: "bottom", color: "#000000", width: 1, dash: "solid", padding: 4 });
  const apply = (choice: BorderChoice) => {
    onClose();
    afterClose(() => void Promise.resolve(exec("doc-paragraph-setting.command", { paragraph: paragraphBorderParams(choice) })));
  };
  return (
    <Shell title="Borders and lines" onClose={onClose} marker="data-doc-borders">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Where</span>
        <Select<BorderChoice["side"]> aria-label="Where" value={c.side} onValueChange={(side) => setC({ ...c, side })} options={[{ value: "top", label: "Above the paragraph" }, { value: "bottom", label: "Below the paragraph" }, { value: "both", label: "Above and below" }]} />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Style</span>
        <Select<BorderChoice["dash"]> aria-label="Style" value={c.dash} onValueChange={(dash) => setC({ ...c, dash })} options={[{ value: "solid", label: "Solid" }, { value: "dashed", label: "Dashed" }, { value: "dotted", label: "Dotted" }]} />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Thickness</span>
        <Select<string> aria-label="Thickness" value={String(c.width)} onValueChange={(v) => setC({ ...c, width: Number(v) })} options={[1, 2, 3, 4, 6].map((w) => ({ value: String(w), label: `${w} px` }))} />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Colour</span>
        <input type="color" aria-label="Colour" value={c.color} onChange={(e) => setC({ ...c, color: e.target.value })} className="h-7 w-12 cursor-pointer rounded border border-border bg-transparent" />
      </label>
      <div className="flex justify-between gap-2 pt-1">
        <Button onClick={() => apply({ ...c, side: "none" })}>Remove borders</Button>
        <Button onClick={() => apply(c)}>Apply</Button>
      </div>
    </Shell>
  );
}

function Compare({ ops, documentId, documentName, onClose }: { ops: DocEditOps | null; documentId: string; documentName: string; onClose: () => void }) {
  const openDiff = useOpenDiffViewerWindow();
  const [docs, setDocs] = useState<Array<{ id: string; name: string }> | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void listAccessibleDocuments().then((r) => {
      if (!live) return;
      if (!r.success) return void toast.error(r.error);
      setDocs(r.data.filter((d) => d.id !== documentId).map((d) => ({ id: d.id, name: d.document_name || "Untitled document" })));
    });
    return () => {
      live = false;
    };
  }, [documentId]);
  const shown = (docs ?? []).filter((d) => d.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 60);
  const compareWith = async (other: { id: string; name: string }) => {
    setBusy(other.id);
    try {
      const snap = await getLatestDocumentSnapshot(other.id);
      if (!snap.success) throw new Error(snap.error);
      const theirs = snap.data ? univerDocToMarkdown(snap.data.snapshot as never) : "";
      const mine = univerDocToMarkdown(ops?.snapshot() as never);
      openDiff({ original: theirs, modified: mine, originalLabel: other.name, modifiedLabel: `${documentName} (this document)`, title: `Compare: ${other.name}`, language: "markdown" });
      onClose();
    } catch (err) {
      toast.error(`Could not compare: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(null);
    }
  };
  return (
    <Shell title="Compare with another document" onClose={onClose} width="max-w-lg" marker="data-doc-compare">
      <ProInput aria-label="Find a document" placeholder="Find a document" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <ul className="max-h-[45vh] divide-y divide-border overflow-y-auto text-sm">
        {docs === null ? <li className="py-2 text-muted-foreground">Loading documents</li> : null}
        {docs && shown.length === 0 ? <li className="py-2 text-muted-foreground">No other documents match</li> : null}
        {shown.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-2 py-2" data-compare-doc={d.id}>
            <span className="min-w-0 truncate">{d.name}</span>
            <Button disabled={busy !== null} onClick={() => void compareWith(d)}>{busy === d.id ? "Comparing" : "Compare"}</Button>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function VoiceTyping({ ops, onClose }: { ops: DocEditOps | null; onClose: () => void }) {
  const box = useRef<ProTextareaElement | null>(null);
  const [text, setText] = useState("");
  useEffect(() => {
    const t = setTimeout(() => void box.current?.startDictation?.(), 250);
    return () => clearTimeout(t);
  }, []);
  const insert = () => {
    const value = text.trim();
    if (!value) return;
    box.current?.stopDictation?.();
    onClose();
    afterClose(() => void ops?.insertText(value).then((ok) => !ok && toast.error(NEEDS_CLICK)));
  };
  return (
    <Shell title="Voice typing" onClose={onClose} marker="data-doc-voice">
      <ProTextarea ref={box} aria-label="What you said" placeholder="Click the microphone and speak. Your words land here." value={text} onChange={(e) => setText(e.target.value)} rows={5} />
      <div className="flex justify-end">
        <Button disabled={!text.trim()} onClick={insert}>Insert into document</Button>
      </div>
    </Shell>
  );
}

function Language({ language, onLanguage, onClose }: { language: string; onLanguage: (c: string) => void; onClose: () => void }) {
  return (
    <Shell title="Document language" onClose={onClose} marker="data-doc-language">
      <Select<string> aria-label="Language" value={language} onValueChange={(code) => (onLanguage(code), onClose())} options={DOCUMENT_LANGUAGES.map((l) => ({ value: l.code, label: l.label }))} />
    </Shell>
  );
}

export function DocumentToolDialogs(p: Props) {
  const { open, onClose } = p;
  if (!open) return null;
  switch (open) {
    case "emoji":
    case "special":
      return <SymbolPicker kind={open} ops={p.ops} onClose={onClose} />;
    case "building-blocks":
      return <BuildingBlocks ops={p.ops} onClose={onClose} />;
    case "bookmarks":
      return <Bookmarks ops={p.ops} documentId={p.documentId} onClose={onClose} />;
    case "borders":
      return <Borders exec={p.exec} onClose={onClose} />;
    case "compare":
      return <Compare ops={p.ops} documentId={p.documentId} documentName={p.documentName} onClose={onClose} />;
    case "voice":
      return <VoiceTyping ops={p.ops} onClose={onClose} />;
    case "language":
      return <Language language={p.language} onLanguage={p.onLanguage} onClose={onClose} />;
  }
}
