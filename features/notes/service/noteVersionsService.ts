// features/notes/service/noteVersionsService.ts

import { supabase } from '@/utils/supabase/client';

export interface NoteVersion {
    id: string;
    note_id: string;
    version_number: number;
    content: string;
    label: string;
    folder_name: string | null;
    tags: string[];
    metadata: Record<string, any>;
    created_by: string | null;
    created_at: string;
    change_type: 'manual' | 'ai_edit' | 'ai_accept_all' | 'ai_accept_partial';
    change_metadata: Record<string, any>;
}

export interface VersionComparison {
    version_1_content: string;
    version_2_content: string;
    version_1_label: string;
    version_2_label: string;
    version_1_created_at: string;
    version_2_created_at: string;
}

/**
 * Fetch version history for a note
 */
export async function fetchNoteVersions(noteId: string): Promise<NoteVersion[]> {
    const { data, error } = await supabase
        .from('note_versions')
        .select('*')
        .eq('note_id', noteId)
        .order('version_number', { ascending: false });

    if (error) {
        console.error('Error fetching note versions:', error);
        throw error;
    }

    return data || [];
}

/**
 * Fetch a specific version
 */
export async function fetchNoteVersion(
    noteId: string,
    versionNumber: number
): Promise<NoteVersion | null> {
    const { data, error } = await supabase
        .from('note_versions')
        .select('*')
        .eq('note_id', noteId)
        .eq('version_number', versionNumber)
        .single();

    if (error) {
        console.error('Error fetching note version:', error);
        return null;
    }

    return data;
}

/**
 * Compare two versions using database function
 */
export async function compareNoteVersions(
    noteId: string,
    versionNumber1: number,
    versionNumber2: number
): Promise<VersionComparison | null> {
    const { data, error } = await supabase.rpc('compare_note_versions', {
        p_note_id: noteId,
        p_version_number_1: versionNumber1,
        p_version_number_2: versionNumber2,
    });

    if (error) {
        console.error('Error comparing versions:', error);
        return null;
    }

    return data?.[0] || null;
}

/**
 * Restore a note to a specific version
 */
export async function restoreNoteVersion(
    noteId: string,
    versionNumber: number
): Promise<boolean> {
    const { data, error } = await supabase.rpc('restore_note_version', {
        p_note_id: noteId,
        p_version_number: versionNumber,
    });

    if (error) {
        console.error('Error restoring version:', error);
        throw error;
    }

    return data === true;
}

/**
 * Delete a specific version (manual cleanup)
 */
export async function deleteNoteVersion(versionId: string): Promise<void> {
    const { error } = await supabase
        .from('note_versions')
        .delete()
        .eq('id', versionId);

    if (error) {
        console.error('Error deleting version:', error);
        throw error;
    }
}

/**
 * Delete all versions for a note
 */
export async function deleteAllNoteVersions(noteId: string): Promise<void> {
    const { error } = await supabase
        .from('note_versions')
        .delete()
        .eq('note_id', noteId);

    if (error) {
        console.error('Error deleting all versions:', error);
        throw error;
    }
}

/**
 * Get version count for a note
 */
export async function getVersionCount(noteId: string): Promise<number> {
    const { count, error } = await supabase
        .from('note_versions')
        .select('*', { count: 'exact', head: true })
        .eq('note_id', noteId);

    if (error) {
        console.error('Error getting version count:', error);
        return 0;
    }

    return count || 0;
}
