'use client';

/**
 * MobileEditorDock — glass-morphism fixed bottom dock for the SSR notes editor.
 *
 * Provides quick access to Folder, Tags, Share, and More actions.
 * Sub-sheets open inline above the dock bar with outside-click dismissal.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  FolderOpen,
  Tag,
  Share2,
  MoreHorizontal,
  Copy,
  Download,
  Trash2,
  X,
  Plus,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MobileEditorDockProps {
  noteId: string;
  currentFolder: string;
  currentTags: string[];
  allFolders: string[];
  isDirty: boolean;
  onFolderChange: (folder: string) => void;
  onTagsChange: (tags: string[]) => void;
  onSave: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onShareLink: () => void;
  onDelete: () => void;
}

type ActivePanel = 'folder' | 'tags' | 'more' | null;

// ─── Dock Item Definition ───────────────────────────────────────────────────

interface DockItem {
  key: ActivePanel;
  label: string;
  Icon: LucideIcon;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PILL_INSET_X = 3;
const PILL_INSET_Y = 4;

// ─── Component ──────────────────────────────────────────────────────────────

export default function MobileEditorDock({
  noteId,
  currentFolder,
  currentTags,
  allFolders,
  isDirty,
  onFolderChange,
  onTagsChange,
  onSave,
  onDuplicate,
  onExport,
  onShareLink,
  onDelete,
}: MobileEditorDockProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [pill, setPill] = useState<{ x: number; width: number; height: number } | null>(null);
  const [tagInput, setTagInput] = useState('');

  // Dock items
  const items: DockItem[] = [
    { key: 'folder', label: currentFolder || 'Folder', Icon: FolderOpen },
    {
      key: 'tags',
      label: currentTags.length > 0 ? `${currentTags.length} tag${currentTags.length !== 1 ? 's' : ''}` : 'Tags',
      Icon: Tag,
    },
    { key: null, label: 'Share', Icon: Share2 },
    { key: 'more', label: 'More', Icon: MoreHorizontal },
  ];

  // ─── Pill Measurement ───────────────────────────────────────────────────

  const activeIndex = activePanel
    ? items.findIndex(i => i.key === activePanel)
    : null;

  const measurePill = useCallback(() => {
    const nav = navRef.current;
    if (!nav || activeIndex === null || activeIndex < 0) {
      setPill(null);
      return;
    }
    const el = itemRefs.current[activeIndex];
    if (!el) { setPill(null); return; }

    const navRect = nav.getBoundingClientRect();
    const itemRect = el.getBoundingClientRect();
    const navW = navRect.width;
    const dockH = navRect.height;
    const CORNER_RADIUS = 22;

    const rawX = itemRect.left - navRect.left + PILL_INSET_X;
    const rawW = itemRect.width - PILL_INSET_X * 2;
    const minX = CORNER_RADIUS / 2;
    const maxRight = navW - CORNER_RADIUS / 2;
    const clampedX = Math.max(minX, rawX);
    const clampedRight = Math.min(maxRight, rawX + rawW);
    const clampedW = Math.max(0, clampedRight - clampedX);

    setPill({ x: clampedX, width: clampedW, height: dockH - PILL_INSET_Y * 2 });
  }, [activeIndex]);

  useEffect(() => { measurePill(); }, [measurePill]);

  // ─── Outside Click Dismiss ──────────────────────────────────────────────

  useEffect(() => {
    if (!activePanel) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        navRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setActivePanel(null);
    }

    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [activePanel]);

  // ─── Handlers ─────────────────────────────────────────────────────────

  function handleDockItemPress(item: DockItem) {
    if (item.key === null) {
      onShareLink();
      setActivePanel(null);
      return;
    }
    setActivePanel(prev => (prev === item.key ? null : item.key));
  }

  function handleAddTag() {
    const trimmed = tagInput.trim();
    if (!trimmed || currentTags.includes(trimmed)) return;
    onTagsChange([...currentTags, trimmed]);
    setTagInput('');
  }

  function handleRemoveTag(tag: string) {
    onTagsChange(currentTags.filter(t => t !== tag));
  }

  // ─── Sub-Panels ───────────────────────────────────────────────────────

  function renderFolderPanel() {
    return (
      <div className="space-y-1 max-h-60 overflow-y-auto overscroll-contain">
        {allFolders.map(folder => (
          <button
            key={folder}
            onClick={() => {
              onFolderChange(folder);
              setActivePanel(null);
            }}
            className={cn(
              'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
              folder === currentFolder
                ? 'bg-primary/10 text-primary'
                : 'text-foreground hover:bg-accent/50',
            )}
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">{folder}</span>
            {folder === currentFolder && (
              <Check className="h-4 w-4 ml-auto shrink-0 text-primary" />
            )}
          </button>
        ))}
        {allFolders.length === 0 && (
          <p className="text-sm text-muted-foreground px-4 py-3">No folders yet</p>
        )}
      </div>
    );
  }

  function renderTagsPanel() {
    return (
      <div className="space-y-3">
        {/* Current tags */}
        {currentTags.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {currentTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="p-0.5 rounded-full hover:bg-primary/20 transition-colors min-w-[22px] min-h-[22px] flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add tag input */}
        <div className="flex items-center gap-2 px-1">
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add a tag..."
            className="flex-1 h-10 px-3 rounded-lg bg-muted/50 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
            style={{ fontSize: 16 }}
          />
          <button
            onClick={handleAddTag}
            disabled={!tagInput.trim()}
            className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            aria-label="Add tag"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  function renderMorePanel() {
    return (
      <div className="space-y-1">
        <button
          onClick={() => { onDuplicate(); setActivePanel(null); }}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors min-h-[44px]"
        >
          <Copy className="h-5 w-5 text-muted-foreground" />
          Duplicate Note
        </button>
        <button
          onClick={() => { onExport(); setActivePanel(null); }}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors min-h-[44px]"
        >
          <Download className="h-5 w-5 text-muted-foreground" />
          Export as Markdown
        </button>
        <div className="h-px bg-border/30 my-1" />
        <button
          onClick={() => { setActivePanel(null); onDelete(); }}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors min-h-[44px]"
        >
          <Trash2 className="h-5 w-5" />
          Delete Note
        </button>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe pointer-events-none">
      {/* Inline sub-sheet above dock */}
      {activePanel && (
        <div
          ref={panelRef}
          className={cn(
            'mx-3 mb-1 pointer-events-auto',
            'bg-card/80 backdrop-blur-2xl border border-border/30 rounded-t-xl rounded-b-lg',
            'shadow-lg',
            'animate-in slide-in-from-bottom-2 fade-in duration-200',
          )}
        >
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {activePanel === 'folder' && 'Move to Folder'}
                {activePanel === 'tags' && 'Tags'}
                {activePanel === 'more' && 'Actions'}
              </h3>
              <button
                onClick={() => setActivePanel(null)}
                className="p-1.5 rounded-full hover:bg-accent/50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close panel"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            {activePanel === 'folder' && renderFolderPanel()}
            {activePanel === 'tags' && renderTagsPanel()}
            {activePanel === 'more' && renderMorePanel()}
          </div>
        </div>
      )}

      {/* Dock bar */}
      <div className="px-3 mb-2">
        <div
          ref={navRef}
          className={cn(
            'relative flex items-stretch pointer-events-auto',
            'bg-card/80 backdrop-blur-2xl border-t border-border/30 rounded-[22px]',
            'shadow-lg border border-white/[0.08]',
          )}
        >
          {/* Sliding pill indicator */}
          {pill && (
            <div
              aria-hidden
              className="absolute rounded-full bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30"
              style={{
                top: PILL_INSET_Y,
                left: pill.x,
                width: pill.width,
                height: pill.height,
                transition:
                  'left 380ms cubic-bezier(0.34, 1.56, 0.64, 1), width 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                zIndex: 1,
                pointerEvents: 'none',
              }}
            />
          )}

          {items.map((item, i) => {
            const { Icon } = item;
            const isActive = activePanel === item.key && item.key !== null;

            return (
              <div
                key={item.key ?? 'share'}
                ref={el => { itemRefs.current[i] = el; }}
                className="relative flex-1 flex items-center justify-center min-w-0"
              >
                <button
                  onClick={() => handleDockItemPress(item)}
                  aria-label={item.label}
                  className={cn(
                    'relative z-10 flex flex-col items-center justify-center gap-0.5',
                    'w-full py-3 px-1 transition-colors duration-200',
                    'min-h-[44px]',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-all duration-200 shrink-0',
                      isActive && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]',
                    )}
                  />
                  <span
                    className={cn(
                      'text-[9px] leading-none font-medium truncate max-w-full transition-colors duration-200',
                      isActive ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              </div>
            );
          })}

          {/* Save indicator dot */}
          {isDirty && (
            <div
              aria-label="Unsaved changes"
              className="absolute top-2 right-3 h-2 w-2 rounded-full bg-warning animate-pulse"
            />
          )}
        </div>
      </div>
    </div>
  );
}
