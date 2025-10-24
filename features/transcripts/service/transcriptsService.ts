// features/transcripts/service/transcriptsService.ts

import { supabase } from '@/utils/supabase/client';
import type { Transcript, CreateTranscriptInput, UpdateTranscriptInput, TranscriptSegment } from '../types';

/**
 * Fetch all transcripts for the current user (excluding deleted)
 */
export async function fetchTranscripts(): Promise<Transcript[]> {
    const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching transcripts:', error);
        throw error;
    }

    return data || [];
}

/**
 * Fetch a single transcript by ID
 */
export async function fetchTranscriptById(id: string): Promise<Transcript | null> {
    const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single();

    if (error) {
        console.error('Error fetching transcript:', error);
        return null;
    }

    return data;
}

/**
 * Generate metadata from segments
 */
function generateMetadata(segments: TranscriptSegment[]) {
    if (!segments || segments.length === 0) {
        return {
            duration: 0,
            wordCount: 0,
            segmentCount: 0,
            speakers: [],
        };
    }

    const lastSegment = segments[segments.length - 1];
    const duration = lastSegment?.seconds || 0;

    let wordCount = 0;
    const speakersSet = new Set<string>();

    segments.forEach(segment => {
        const words = segment.text.trim().split(/\s+/).filter(w => w.length > 0);
        wordCount += words.length;
        if (segment.speaker) {
            speakersSet.add(segment.speaker);
        }
    });

    return {
        duration,
        wordCount,
        segmentCount: segments.length,
        speakers: Array.from(speakersSet),
    };
}

/**
 * Create a new transcript
 */
export async function createTranscript(input: CreateTranscriptInput): Promise<Transcript> {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData?.user?.id) {
        throw new Error('User not authenticated');
    }

    // Generate metadata from segments
    const autoMetadata = generateMetadata(input.segments);
    const metadata = {
        ...autoMetadata,
        ...input.metadata,
    };

    const { data, error } = await supabase
        .from('transcripts')
        .insert({
            user_id: userData.user.id,
            title: input.title || 'New Transcript',
            description: input.description || '',
            segments: input.segments,
            metadata,
            audio_file_path: input.audio_file_path || null,
            video_file_path: input.video_file_path || null,
            source_type: input.source_type || 'other',
            tags: input.tags || [],
            folder_name: input.folder_name || 'Transcripts',
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating transcript:', error);
        throw error;
    }

    return data;
}

/**
 * Update an existing transcript
 */
export async function updateTranscript(id: string, updates: UpdateTranscriptInput): Promise<Transcript> {
    // If segments are being updated, regenerate metadata
    let finalUpdates = { ...updates };
    
    if (updates.segments) {
        const autoMetadata = generateMetadata(updates.segments);
        finalUpdates.metadata = {
            ...autoMetadata,
            ...updates.metadata,
        };
    }

    const { data, error } = await supabase
        .from('transcripts')
        .update(finalUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating transcript:', error);
        throw error;
    }

    return data;
}

/**
 * Soft delete a transcript
 */
export async function deleteTranscript(id: string): Promise<void> {
    const { error } = await supabase
        .from('transcripts')
        .update({ is_deleted: true })
        .eq('id', id);

    if (error) {
        console.error('Error deleting transcript:', error);
        throw error;
    }
}

/**
 * Permanently delete a transcript
 */
export async function permanentlyDeleteTranscript(id: string): Promise<void> {
    const { error } = await supabase
        .from('transcripts')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error permanently deleting transcript:', error);
        throw error;
    }
}

/**
 * Copy/duplicate a transcript
 */
export async function copyTranscript(id: string): Promise<Transcript> {
    const { data: original, error: fetchError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !original) {
        throw new Error('Original transcript not found');
    }

    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData?.user?.id) {
        throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
        .from('transcripts')
        .insert({
            user_id: userData.user.id,
            title: `${original.title} (Copy)`,
            description: original.description,
            segments: original.segments,
            metadata: original.metadata,
            audio_file_path: original.audio_file_path,
            video_file_path: original.video_file_path,
            source_type: original.source_type,
            tags: original.tags,
            folder_name: original.folder_name,
        })
        .select()
        .single();

    if (error) {
        console.error('Error copying transcript:', error);
        throw error;
    }

    return data;
}

/**
 * Search transcripts by text (searches title and description)
 */
export async function searchTranscripts(query: string): Promise<Transcript[]> {
    const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('is_deleted', false)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error searching transcripts:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get transcripts by folder
 */
export async function getTranscriptsByFolder(folderName: string): Promise<Transcript[]> {
    const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('is_deleted', false)
        .eq('folder_name', folderName)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching transcripts by folder:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get transcripts by tag
 */
export async function getTranscriptsByTag(tag: string): Promise<Transcript[]> {
    const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('is_deleted', false)
        .contains('tags', [tag])
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching transcripts by tag:', error);
        throw error;
    }

    return data || [];
}

