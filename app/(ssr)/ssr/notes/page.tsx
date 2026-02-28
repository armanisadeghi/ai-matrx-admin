// app/(ssr)/ssr/notes/page.tsx — Default Notes View (no note selected)
// 100% server component. Shows an empty state prompting the user to select or create a note.

import { NotebookPen } from "lucide-react";

export default function NotesPage() {
  return (
    <div className="notes-empty">
      <div className="notes-empty-icon">
        <NotebookPen />
      </div>
      <h2 className="notes-empty-title">Select a note</h2>
      <p className="notes-empty-description">
        Choose a note from the sidebar to start editing, or create a new one with the + button.
      </p>
    </div>
  );
}
