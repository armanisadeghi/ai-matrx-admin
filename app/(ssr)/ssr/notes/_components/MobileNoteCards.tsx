'use client';

import { Plus, FolderOpen, Tag } from 'lucide-react';

interface MobileNoteCardsProps {
  notes: Array<{
    id: string;
    label: string;
    content?: string;
    folder_name: string;
    tags: string[];
    updated_at: string;
  }>;
  activeNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  className?: string;
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.+?)\]\(.*?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .trim();
}

function getPreview(content?: string): string {
  if (!content) return 'No content';
  const stripped = stripMarkdown(content);
  const lines = stripped.split('\n').filter(Boolean);
  return lines.slice(0, 2).join(' ') || 'No content';
}

export default function MobileNoteCards({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  className,
}: MobileNoteCardsProps) {
  return (
    <div className={`min-h-dvh flex flex-col bg-background ${className ?? ''}`}>
      {/* Scrollable card list */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 pt-3">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <p className="text-sm">No notes yet</p>
            <button
              onClick={onCreateNote}
              className="flex items-center gap-1.5 text-sm text-primary font-medium min-h-[44px] px-3"
            >
              <Plus size={16} />
              Create your first note
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notes.map((note) => {
              const isActive = note.id === activeNoteId;
              return (
                <button
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  className={`w-full text-left rounded-xl p-3 transition-colors active:scale-[0.98] min-h-[44px]
                    bg-card/60 backdrop-blur-sm border
                    ${isActive ? 'border-primary/60 bg-primary/5' : 'border-border/30'}
                  `}
                >
                  {/* Top row: title + timestamp */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate flex-1 leading-tight">
                      {note.label || 'Untitled Note'}
                    </h3>
                    <span className="text-[0.625rem] text-muted-foreground tabular-nums shrink-0 pt-0.5">
                      {formatRelativeTime(note.updated_at)}
                    </span>
                  </div>

                  {/* Content preview */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                    {getPreview(note.content)}
                  </p>

                  {/* Bottom row: folder badge + tag count */}
                  <div className="flex items-center gap-2 mt-1.5">
                    {note.folder_name && (
                      <span className="inline-flex items-center gap-1 text-[0.625rem] font-medium px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                        <FolderOpen size={10} className="shrink-0" />
                        {note.folder_name}
                      </span>
                    )}
                    {note.tags && note.tags.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[0.625rem] font-medium px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                        <Tag size={10} className="shrink-0" />
                        {note.tags.length}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Bottom spacer for FAB clearance */}
        <div className="h-20" />
      </div>

      {/* Floating create button */}
      <div className="fixed bottom-5 right-5 pb-safe z-30">
        <button
          onClick={onCreateNote}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
          aria-label="Create note"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
}
