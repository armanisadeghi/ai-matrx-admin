// features/notes/service/notesService.ts

import { supabase } from '@/utils/supabase/client';
import type { Note, CreateNoteInput, UpdateNoteInput } from '../types';

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
 */
export async function createNote(input: CreateNoteInput = {}): Promise<Note> {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData?.user?.id) {
        throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
        .from('notes')
        .insert({
            user_id: userData.user.id,
            label: input.label || 'New Note',
            content: input.content || '',
            folder_name: input.folder_name || 'General',
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

    return data;
}

/**
 * Update an existing note
 */
export async function updateNote(id: string, updates: UpdateNoteInput): Promise<Note> {
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

