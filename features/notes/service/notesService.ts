// features/notes/service/notesService.ts

import { supabase } from '@/utils/supabase/client';
import type { Note, CreateNoteInput, UpdateNoteInput } from '../types';
import { generateLabelFromContent } from '../hooks/useAutoLabel';
import { findEmptyNewNote } from '../utils/noteUtils';

/**
 * Fetch all notes for the current user (excluding deleted)
 */
export async function fetchNotes(): Promise<Note[]> {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching notes:', error);
        throw error;
    }

    return data || [];
}

/**
 * Fetch a single note by ID
 */
export async function fetchNoteById(id: string): Promise<Note | null> {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single();

    if (error) {
        console.error('Error fetching note:', error);
        return null;
    }

    return data;
}

/**
 * Create a new note
 * Automatically generates label from content if label is missing or is "New Note"
 * IMPORTANT: Checks for existing empty notes and reuses them to prevent duplicates
 */
export async function createNote(input: CreateNoteInput = {}): Promise<Note> {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData?.user?.id) {
        throw new Error('User not authenticated');
    }

    const content = input.content || '';
    const targetFolder = input.folder_name || 'Draft';
    
    // CRITICAL: If creating an empty note (no content or whitespace only), check for existing empty notes
    const isCreatingEmptyNote = !content || content.trim() === '';
    
    if (isCreatingEmptyNote) {
        // Fetch all user's notes to check for existing empty ones
        const existingNotes = await fetchNotes();
        const existingEmptyNote = findEmptyNewNote(existingNotes);
        
        if (existingEmptyNote) {
            console.log('Reusing existing empty note instead of creating duplicate:', existingEmptyNote.id);
            
            // If it's in a different folder, move it to the target folder
            if (existingEmptyNote.folder_name !== targetFolder) {
                return updateNote(existingEmptyNote.id, { folder_name: targetFolder });
            }
            
            // Already in the right folder, just return it
            return existingEmptyNote;
        }
    }

    // Auto-generate label from content if needed
    let finalLabel = input.label || 'New Note';
    
    // Check if we should auto-generate the label
    const shouldAutoGenerate = 
        !finalLabel || 
        finalLabel.trim() === '' || 
        finalLabel.toLowerCase() === 'new note';
    
    if (shouldAutoGenerate && content.trim()) {
        const generatedLabel = generateLabelFromContent(content);
        if (generatedLabel) {
            finalLabel = generatedLabel;
        }
    }

    // No existing empty note found, create a new one
    const { data, error } = await supabase
        .from('notes')
        .insert({
            user_id: userData.user.id,
            label: finalLabel,
            content: content,
            folder_name: targetFolder,
            tags: input.tags || [],
            metadata: input.metadata || {},
            position: input.position || 0,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating note:', error);
        throw error;
    }

    console.log('Created new note:', data.id, 'Label:', finalLabel, 'Content length:', content.length);
    return data;
}

/**
 * Update an existing note
 */
export async function updateNote(id: string, updates: UpdateNoteInput, expectedUpdatedAt?: string): Promise<Note> {
    // If an expected timestamp is provided, use optimistic locking:
    // Only update if the note hasn't been modified since we loaded it.
    if (expectedUpdatedAt) {
        const { data, error } = await supabase
            .from('notes')
            .update(updates)
            .eq('id', id)
            .eq('updated_at', expectedUpdatedAt) // Optimistic lock
            .select()
            .single();

        if (error) {
            console.error('Error updating note with optimistic lock:', error);
            throw error;
        }

        if (!data) {
            // The row exists but updated_at didn't match — concurrent modification detected
            throw new Error('CONFLICT: Note was modified by another session. Please refresh to avoid data loss.');
        }

        return data;
    }

    // Standard update (no optimistic locking)
    const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating note:', error);
        throw error;
    }

    return data;
}

/**
 * Soft delete a note
 */
export async function deleteNote(id: string): Promise<void> {
    const { error } = await supabase
        .from('notes')
        .update({ is_deleted: true })
        .eq('id', id);

    if (error) {
        console.error('Error deleting note:', error);
        throw error;
    }
}

/**
 * Permanently delete a note
 */
export async function permanentlyDeleteNote(id: string): Promise<void> {
    const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error permanently deleting note:', error);
        throw error;
    }
}

/**
 * Copy/duplicate a note
 * Smart labeling: If original was "New Note", auto-generate from content
 */
export async function copyNote(id: string): Promise<Note> {
    // First fetch the original note
    const { data: original, error: fetchError} = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !original) {
        console.error('Error fetching note to copy:', fetchError);
        throw fetchError || new Error('Note not found');
    }

    // Smart label handling
    let copyLabel: string;
    if (original.label.toLowerCase() === 'new note') {
        // If original was "New Note", let auto-labeling handle it
        copyLabel = 'New Note';
    } else {
        // Otherwise, append (Copy) to the original label
        copyLabel = `${original.label} (Copy)`;
    }

    // Create a copy with modified label
    const copy: CreateNoteInput = {
        label: copyLabel,
        content: original.content,
        folder_name: original.folder_name,
        tags: original.tags || [],
        metadata: original.metadata || {},
    };

    return await createNote(copy);
}

/**
 * Generate a shareable link for a note
 * Returns a URL that users can visit to accept the share
 */
export function generateShareLink(noteId: string): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/notes/share/${noteId}`;
}

/**
 * Accept a shared note (adds current user to shared_with)
 */
export async function acceptSharedNote(noteId: string, userId: string): Promise<Note> {
    // First get the current shared_with array
    const { data: note, error: fetchError } = await supabase
        .from('notes')
        .select('shared_with')
        .eq('id', noteId)
        .single();

    if (fetchError || !note) {
        console.error('Error fetching note:', fetchError);
        throw fetchError || new Error('Note not found');
    }

    const currentSharedWith = (note.shared_with as any) || {};
    const userIds = currentSharedWith.userIds || [];
    
    // Add user if not already in the list
    if (!userIds.includes(userId)) {
        userIds.push(userId);
    }

    // Update the note
    const { data: updated, error: updateError } = await supabase
        .from('notes')
        .update({ 
            shared_with: { ...currentSharedWith, userIds } 
        })
        .eq('id', noteId)
        .select()
        .single();

    if (updateError) {
        console.error('Error accepting shared note:', updateError);
        throw updateError;
    }

    return updated;
}

/**
 * Fetch notes shared with the current user
 */
export async function fetchSharedNotes(userId: string): Promise<Note[]> {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching shared notes:', error);
        return [];
    }

    // Filter notes where userId is in shared_with.userIds
    return data.filter(note => {
        const sharedWith = (note.shared_with as any) || {};
        const userIds = sharedWith.userIds || [];
        return userIds.includes(userId);
    });
}

/**
 * Get all unique folder names
 */
export async function fetchFolderNames(): Promise<string[]> {
    const { data, error } = await supabase
        .from('notes')
        .select('folder_name')
        .eq('is_deleted', false);

    if (error) {
        console.error('Error fetching folder names:', error);
        return [];
    }

    const uniqueFolders = Array.from(new Set(data.map(n => n.folder_name)));
    return uniqueFolders.sort();
}

/**
 * Get all unique tags
 */
export async function fetchTags(): Promise<string[]> {
    const { data, error } = await supabase
        .from('notes')
        .select('tags')
        .eq('is_deleted', false);

    if (error) {
        console.error('Error fetching tags:', error);
        return [];
    }

    const allTags = data.flatMap(n => n.tags || []);
    const uniqueTags = Array.from(new Set(allTags));
    return uniqueTags.sort();
}

/**
 * Rename a folder by updating all notes in that folder
 */
export async function renameFolder(oldName: string, newName: string): Promise<void> {
    const { error } = await supabase
        .from('notes')
        .update({ folder_name: newName })
        .eq('folder_name', oldName)
        .eq('is_deleted', false);

    if (error) {
        console.error('Error renaming folder:', error);
        throw error;
    }
}

/**
 * Bulk delete all notes in a folder (soft delete)
 */
export async function deleteFolderNotes(folderName: string): Promise<number> {
    // First, count how many notes will be deleted
    const { data: notesToDelete } = await supabase
        .from('notes')
        .select('id')
        .eq('folder_name', folderName)
        .eq('is_deleted', false);

    const count = notesToDelete?.length || 0;

    // Perform bulk soft delete
    const { error } = await supabase
        .from('notes')
        .update({ is_deleted: true })
        .eq('folder_name', folderName)
        .eq('is_deleted', false);

    if (error) {
        console.error('Error deleting folder notes:', error);
        throw error;
    }

    return count;
}

