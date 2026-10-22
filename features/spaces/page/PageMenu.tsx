"use client";

// features/spaces/page/PageMenu.tsx — the ••• page menu (A7): style, small text, full width, lock,
// copy link, duplicate, move to, delete (= move to Trash), undo, page history, import, export, connections.
// Import and Connections open inside the same panel (a Back row returns), as Notion's sub-menus do.

import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button, Switch } from "@ai-matrx/design-system/controls";
import { ArrowLeft, Loader2, ChevronRight, Copy, CornerUpRight, FileDown, FileUp, Plug, History, LayoutTemplate, Link, Lock, MoreHorizontal, MoveHorizontal, PackageX, PenLine, Trash2, Type, Undo2 } from "lucide-react";
import { setSuggesting, useSuggesting } from "../editor/suggest";
import { useState, type ReactNode } from "react";

import { AGENT_ICON } from "@/components/icons/domain-icons";

import type { SpaceDoc } from "../contract";
import { formatCount } from "@ai-matrx/kit/format";
import type { ImportChoice } from "../sidebar/ImportMenu";
import { PageConnections } from "./PageConnections";

type Settings = SpaceDoc["settings"];

function Row({ icon, label, onClick, end, danger, loading }: { icon: ReactNode; label: string; onClick?: () => void; end?: ReactNode; danger?: boolean; loading?: boolean }) {
  return (
    // A div, not a button: a toggle row carries a Switch (itself a button) at its end.
    <div
      role="menuitem"
      tabIndex={0}
      data-clickable=""
      className="spaces-menu-row"
      data-danger={danger ? "true" : undefined}
      aria-disabled={loading ? "true" : undefined}
      aria-busy={loading ? "true" : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <span className="spaces-menu-row-icon">{icon}</span>
      <span className="flex-1 truncate text-left">{label}</span>
      {end}
    </div>
  );
}

const FONTS: Array<{ value: Settings["font"]; label: string; family: string }> = [
  { value: "default", label: "Default", family: "var(--spaces-font-default)" },
  { value: "serif", label: "Serif", family: "var(--spaces-font-serif)" },
  { value: "mono", label: "Mono", family: "var(--spaces-font-mono)" },
];

export function PageMenu({
  settings,
  onSettings,
  onCopyLink,
  onDuplicate,
  onMove,
  onDelete,
  onRemoveCopy,
  removeCopyPending,
  onFinishRemoving,
  onUndo,
  onHistory,
  onExport,
  importChoices,
  onAskAiChange,
  isTemplate,
  onTemplate,
  onOpen,
  updatedLabel,
  counts,
  suggestPageId,
  contentOnly,
}: {
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
  onCopyLink: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onDelete: () => void;
  /** ADVERSARIAL-6 F1: the page is the root of a live template copy — "Remove template copy" (absent: not one, or not known yet). */
  onRemoveCopy?: () => void;
  /** The copy lookup (started when the page opened) has not answered: the row shows, loading, instead of arriving late. */
  removeCopyPending?: boolean;
  /** A removal of this copy stopped part way: "Finish removing" continues the same door (never stranded). */
  onFinishRemoving?: () => void;
  onUndo: () => void;
  onHistory: () => void;
  /** K1 — opens the Export dialog. */
  onExport: () => void;
  /** K2 / A7 — the Import choices, landing as sub-pages of this page (absent: the person cannot add pages here). */
  importChoices?: ImportChoice[];
  /** "Ask AI to change this page" — the Space Builder (absent: not wired, or the page cannot be edited). */
  onAskAiChange?: () => void;
  /** I3 — the page carries the template label (null = not known yet). */
  isTemplate: boolean | null;
  onTemplate: (on: boolean) => void;
  /** The menu opened (round 40: the template label is read then, never on page load). */
  onOpen?: () => void;
  updatedLabel: string;
  /** A14 — the page's words and characters, Notion's "Word count" line. */
  counts: { words: number; characters: number };
  /** N3 — the page whose "Suggest edits" switch this menu shows (absent: the person cannot edit). */
  suggestPageId?: string;
  /** Edit (not Full access): page settings, duplicate, move and trash are not theirs (the database refuses them). */
  contentOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "import" | "connections">("main");
  const suggesting = useSuggesting(suggestPageId ?? null);
  const act = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setView("main");
          onOpen?.();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="quiet" icon={<MoreHorizontal size={18} />} aria-label="Page options" />
      </PopoverTrigger>
      <PopoverContent /* sizing: fixed — a fixed-measure panel on purpose; its rows truncate inside the box */ surface="solid" align="end" className="w-[260px] p-1">
        {view !== "main" ? (
          <>
            <Row icon={<ArrowLeft size={16} />} label={view === "import" ? "Import" : "Connections"} onClick={() => setView("main")} />
            <div className="my-1 border-t border-border" />
            {view === "import"
              ? importChoices?.map((c) => <Row key={c.key} icon={c.icon} label={c.label} onClick={act(c.run)} />)
              : <PageConnections />}
          </>
        ) : (
        <>
        <p className="px-2 pb-1 pt-1.5 type-secondary text-muted-foreground">Style</p>
        <div className="grid grid-cols-3 gap-1 px-1 pb-1">
          {FONTS.map((f) => (
            <Button variant="quiet" key={f.value} data-selected={settings.font === f.value ? "true" : undefined} onClick={() => onSettings({ font: f.value })}>
              <span style={{ fontFamily: f.family }} className="text-2xl">
                Ag
              </span>
              <span className="type-secondary text-muted-foreground">{f.label}</span>
            </Button>
          ))}
        </div>
        <div className="my-1 border-t border-border" />
        <Row icon={<Type size={16} />} label="Small text" onClick={() => onSettings({ smallText: !settings.smallText })} end={<Switch checked={settings.smallText} tabIndex={-1} aria-hidden />} />
        <Row
          icon={<MoveHorizontal size={16} />}
          label="Full width"
          onClick={() => onSettings({ fullWidth: !settings.fullWidth })}
          end={<Switch checked={settings.fullWidth} tabIndex={-1} aria-hidden />}
        />
        {contentOnly ? null : <Row icon={<Lock size={16} />} label="Lock page" onClick={() => onSettings({ locked: !settings.locked })} end={<Switch checked={settings.locked} tabIndex={-1} aria-hidden />} />}
        {suggestPageId ? (
          <Row icon={<PenLine size={16} />} label="Suggest edits" onClick={() => setSuggesting(suggestPageId, !suggesting)} end={<Switch checked={suggesting} tabIndex={-1} aria-hidden />} />
        ) : null}
        <div className="my-1 border-t border-border" />
        {onAskAiChange ? <Row icon={<AGENT_ICON size={16} />} label="Ask AI to change this page" onClick={act(onAskAiChange)} /> : null}
        <Row icon={<Link size={16} />} label="Copy link" onClick={act(onCopyLink)} />
        <Row icon={<Copy size={16} />} label="Duplicate" onClick={act(onDuplicate)} />
        {contentOnly ? null : <Row icon={<CornerUpRight size={16} />} label="Move to" onClick={act(onMove)} />}
        {contentOnly ? null : <Row icon={<Trash2 size={16} />} label="Move to Trash" onClick={act(onDelete)} danger />}
        {contentOnly ? null : removeCopyPending ? (
          <Row icon={<PackageX size={16} />} label="Remove template copy" end={<Loader2 size={14} className="animate-spin" aria-label="Checking" />} loading />
        ) : onFinishRemoving ? (
          <Row icon={<PackageX size={16} />} label="Finish removing" onClick={act(onFinishRemoving)} danger />
        ) : onRemoveCopy ? (
          <Row icon={<PackageX size={16} />} label="Remove template copy" onClick={act(onRemoveCopy)} danger />
        ) : null}
        <div className="my-1 border-t border-border" />
        <Row icon={<Undo2 size={16} />} label="Undo" onClick={act(onUndo)} />
        <Row icon={<History size={16} />} label="Page history" onClick={act(onHistory)} />
        <div className="my-1 border-t border-border" />
        <Row
          icon={<LayoutTemplate size={16} />}
          label="Save as template"
          onClick={isTemplate === null ? undefined : () => onTemplate(!isTemplate)}
          end={<Switch checked={Boolean(isTemplate)} disabled={isTemplate === null} tabIndex={-1} aria-hidden />}
        />
        {importChoices?.length ? <Row icon={<FileDown size={16} />} label="Import" onClick={() => setView("import")} end={<ChevronRight size={14} />} /> : null}
        <Row icon={<FileUp size={16} />} label="Export" onClick={act(onExport)} />
        <Row icon={<Plug size={16} />} label="Connections" onClick={() => setView("connections")} end={<ChevronRight size={14} />} />
        <p className="px-2 pt-2 type-secondary text-muted-foreground" title={`${formatCount(counts.characters)} characters`}>
          Word count: {formatCount(counts.words)} {counts.words === 1 ? "word" : "words"}
        </p>
        <p className="px-2 pb-1.5 pt-0.5 type-secondary text-muted-foreground">{updatedLabel}</p>
        </>
        )}
      </PopoverContent>
    </Popover>
  );
}
