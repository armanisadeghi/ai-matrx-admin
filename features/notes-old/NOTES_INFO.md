# Notes App

## Current Directory Structure:

features/notes/
├── index.ts
├── NOTES_INFO.md
├── types.ts
├── core/
│   ├── NoteEditor.tsx
│   ├── NoteList.tsx
│   ├── NotesControls.tsx
│   ├── NoteViewer.tsx
│   ├── PlainTextArea.tsx
│   ├── TagsManager.tsx
├── folders/
│   ├── folder-categories.tsx
│   ├── FolderTree.tsx
├── hooks/
│   ├── useNotesManager.ts
├── layout/
│   ├── EditorHeader.tsx
│   ├── EditorLayout.tsx
│   ├── FoldersSidebar.tsx
│   ├── MobileLayout.tsx
│   ├── NotesSidebar.tsx
│   ├── UnifiedSidebar.tsx
├── service/
│   ├── notes-recovery.ts
│   ├── notes-service.ts
├── shared/
│   ├── NotesItem.tsx
│   ├── buttons/
│   │   ├── ActionButton.tsx
│   │   ├── IconButton.tsx
│   │   ├── NoteContextMenu.tsx
│   │   ├── TagButton.tsx
│   ├── modals/
│   │   ├── ConfirmModal.tsx
│   │   ├── SettingsModal.tsx
│   ├── selects/
│   │   ├── TagFilter.tsx
│   │   ├── TagFilterSelector.tsx
│   │   ├── TagSelector.tsx
├── state/
│   ├── notesSlice.ts
│   ├── notesThunks.ts
│   ├── tagsSlice.ts

## Database Structure (Supabase)

```sql
create table public.notes (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  folder_id uuid null,
  title text not null default 'Untitled'::text,
  content text not null default ''::text,
  tags text[] null default '{}'::text[],
  shared_with uuid[] null default '{}'::uuid[],
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint notes_pkey primary key (id),
  constraint notes_folder_id_fkey foreign KEY (folder_id) references folders (id) on delete set null,
  constraint notes_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_notes_user_id on public.notes using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_notes_folder_id on public.notes using btree (folder_id) TABLESPACE pg_default;

create index IF not exists idx_notes_shared_with on public.notes using gin (shared_with) TABLESPACE pg_default;

create index IF not exists idx_notes_tags on public.notes using gin (tags) TABLESPACE pg_default;

create index IF not exists idx_notes_updated_at on public.notes using btree (updated_at desc) TABLESPACE pg_default;

create trigger update_notes_updated_at BEFORE
update on notes for EACH row
execute FUNCTION update_updated_at_column ();



create table public.folders (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  name text not null,
  type text not null default 'general'::text,
  parent_id uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint folders_pkey primary key (id),
  constraint folders_parent_id_fkey foreign KEY (parent_id) references folders (id) on delete CASCADE,
  constraint folders_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_folders_user_id on public.folders using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_folders_parent_id on public.folders using btree (parent_id) TABLESPACE pg_default;

create trigger update_folders_updated_at BEFORE
update on folders for EACH row
execute FUNCTION update_updated_at_column ();
```


This document is outdates and much of the information is wrong, but there might be some value to it.



## ✅ Completed
- Auto-create scratch note on empty state
- Dirty state tracking for notes
- Debounced auto-save (1.5s)
- Easy folder creation via popover
- Professional UI with tooltips (fixed line breaks)
- Proper focus management on note selection
- Smart save (only saves notes with content)
- **CRITICAL: Local storage recovery system implemented**
- **CRITICAL: beforeunload protection against data loss**
- **CRITICAL: Auto-save on window blur**
- **CRITICAL: Backup to local storage on every change**
- **Enhanced database error handling with detailed logging**
- **userId validation before database calls**

## 🔧 High Priority

### 1. Fix Note Focus Issues
- [ ] Ensure PlainTextArea auto-focuses when note selected
- [ ] Prevent focus loss when switching notes
- [ ] Test rapid note switching behavior

### 2. Prevent Data Loss on Navigation
- [ ] Add beforeunload event listener if dirty notes exist
- [ ] Show confirmation dialog before closing/navigating away
- [ ] Auto-flush saves on window blur

### 3. Delete Empty Scratch Notes
- [ ] Clean up empty scratch notes on note switch
- [ ] Don't save completely empty notes to database
- [ ] Keep one scratch note available at all times

### 4. Context Menus for All Items (NEXT)
- [ ] Add "..." menu to each folder with: Rename, Delete, Duplicate, Move
- [ ] Add "..." menu to each note with: Rename, Delete, Duplicate, Move, Share
- [ ] Keyboard support (right-click or three-dot button)
- [ ] Confirm dialogs for destructive actions

## 📦 Medium Priority

### 4. UI Polish
- [ ] Add visual indicator for dirty/unsaved notes
- [ ] Show "Saving..." or "Saved" status indicator
- [ ] Add loading states for folder/note creation
- [ ] Improve empty state messaging

### 5. Keyboard Shortcuts
- [ ] Ctrl+N - New note
- [ ] Ctrl+Shift+N - New folder
- [ ] Ctrl+S - Force save
- [ ] Escape - Close popover/dialogs

### 6. Performance
- [ ] Virtualize note list for large collections
- [ ] Optimize re-renders in FolderTree
- [ ] Add memoization to filtered/sorted notes

## 🚀 Future Features (Don't Start Yet)

### 7. Modal/Sheet Integration
- [ ] Create NoteQuickAdd modal component
- [ ] Create NotesSheet for sidebar integration
- [ ] Create NotePicker for selecting existing notes
- [ ] Create NotesWidget for dashboard

### 8. Cross-App Note Utilities
- [ ] useQuickNote() hook for other components
- [ ] Note templates support
- [ ] Quick note from any page (global shortcut)
- [ ] Pin notes to specific app sections

### 9. Enhanced Features
- [ ] Rich text editor integration
- [ ] File attachments via metadata
- [ ] Note sharing UI (user picker)
- [ ] Comments/collaboration
- [ ] Version history
- [ ] Note templates

### 10. Search & Organization
- [ ] Full-text search across all notes
- [ ] Advanced tag management UI
- [ ] Smart folders (saved searches)
- [ ] Bulk operations (move, delete, tag)

## 🐛 Known Issues
1. Note loses focus after creation (HIGH)
2. No visual feedback on save status (MEDIUM)
3. Empty notes saved to database (MEDIUM)
4. No confirmation on navigate with dirty notes (HIGH)

## 📝 Testing Checklist
- [ ] Create note → type → switch → verify saved
- [ ] Create folder → move note → verify
- [ ] Delete note → verify state cleanup
- [ ] Refresh page → verify persistence
- [ ] Empty note behavior → verify not saved
- [ ] Dirty state → switch notes → verify auto-save
- [ ] Multiple rapid note switches → verify no data loss

