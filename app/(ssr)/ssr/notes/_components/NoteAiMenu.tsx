"use client";

// NoteAiMenu — Lazy-loaded AI actions submenu for notes.
// Only downloads when user clicks "AI Actions" in the context menu.
// Actual AI calls are stubbed — UI structure ready for integration.

import {
  Sparkles,
  FileText,
  Scissors,
  ArrowUpRight,
  Languages,
  MessageSquare,
  CheckCheck,
  Pen,
} from "lucide-react";

interface NoteAiMenuProps {
  noteId: string;
  onAction: (action: string) => void;
  onClose: () => void;
}

const AI_ACTIONS = [
  { id: "summarize", label: "Summarize", icon: FileText },
  { id: "improve", label: "Improve Writing", icon: Pen },
  { id: "grammar", label: "Fix Grammar & Spelling", icon: CheckCheck },
  { id: "shorten", label: "Make Shorter", icon: Scissors },
  { id: "lengthen", label: "Make Longer", icon: ArrowUpRight },
  { id: "translate", label: "Translate", icon: Languages },
  { id: "ask", label: "Ask AI about this note", icon: MessageSquare },
] as const;

export default function NoteAiMenu({ noteId, onAction, onClose }: NoteAiMenuProps) {
  return (
    <div className="py-0.5">
      <div className="px-2.5 py-1 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" />
        AI Actions
      </div>
      {AI_ACTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-foreground rounded-md cursor-pointer transition-colors hover:bg-accent [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
          onClick={() => {
            onAction(id);
            onClose();
          }}
        >
          <Icon />
          {label}
        </button>
      ))}
    </div>
  );
}
