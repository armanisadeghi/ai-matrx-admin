"use client";

import { useState, useCallback } from "react";
import { FileText } from "lucide-react";
import { NotesWindow } from "../../floating-window-panel/windows/NotesWindow";

const NOTES_WINDOW_ID = "sidebar-notes-window";

export default function SidebarNotesToggle() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className={`shell-nav-item shell-tactile ${open ? "shell-nav-item-active" : ""}`}
        aria-label="Toggle notes window"
        title="Notes"
      >
        <span className="shell-nav-icon">
          <FileText size={18} strokeWidth={1.75} />
        </span>
        <span className="shell-nav-label">Notes</span>
      </button>

      {open && (
        <NotesWindow
          id={NOTES_WINDOW_ID}
          width={520}
          height={400}
          initialRect={{ x: 80, y: 80 }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
