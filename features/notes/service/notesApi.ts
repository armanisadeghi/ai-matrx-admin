// features/notes/service/notesApi.ts
/**
 * Public API for notes - Use these functions to interact with notes
 * from anywhere in the application without needing the UI
 */

import {
    createNote as createNoteService,
    updateNote as updateNoteService,
    deleteNote as deleteNoteService,
    fetchNotes,
    fetchNoteById,
} from './notesService';
import type { CreateNoteInput, UpdateNoteInput, Note } from '../types';

/**
 * Create a new note (client-side call)
 * @example
 * ```typescript
 * const note = await NotesAPI.create({
 *   label: "My Note",
 *   content: "Some content",
 *   folder_name: "Personal",
 *   tags: ["important"]
 * });
 * ```
 */
export async function create(input: CreateNoteInput): Promise<Note> {
    return createNoteService(input);
}

/**
 * Update an existing note
 * @example
 * ```typescript
 * await NotesAPI.update(noteId, {
 *   content: "Updated content"
 * });
 * ```
 */
export async function update(noteId: string, updates: UpdateNoteInput): Promise<Note> {
    return updateNoteService(noteId, updates);
}

/**
 * Delete a note (soft delete)
 * @example
 * ```typescript
 * await NotesAPI.delete(noteId);
 * ```
 */
export async function remove(noteId: string): Promise<void> {
    return deleteNoteService(noteId);
}

/**
 * Get all notes for the current user
 * @example
 * ```typescript
 * const notes = await NotesAPI.getAll();
 * ```
 */
export async function getAll(): Promise<Note[]> {
    return fetchNotes();
}

/**
 * Get a single note by ID
 * @example
 * ```typescript
 * const note = await NotesAPI.getById(noteId);
 * ```
 */
export async function getById(noteId: string): Promise<Note | null> {
    return fetchNoteById(noteId);
}

/**
 * Quick create - Create a note with just content
 * @example
 * ```typescript
 * const note = await NotesAPI.quickCreate("My quick note content");
 * ```
 */
export async function quickCreate(content: string, label?: string): Promise<Note> {
    return createNoteService({
        label: label || 'Quick Note',
        content,
        folder_name: 'Draft',
    });
}

// Default export as namespace
export const NotesAPI = {
    create,
    update,
    remove,
    getAll,
    getById,
    quickCreate,
};

