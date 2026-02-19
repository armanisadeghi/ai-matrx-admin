import { supabase } from '@/utils/supabase/client';
import type {
    ResearchTopic,
    ResearchKeyword,
    ResearchSource,
    ResearchContent,
    ResearchSynthesis,
    ResearchTag,
    SourceTag,
    ResearchDocument,
    ResearchMedia,
    ResearchTemplate,
    SourceFilters,
    TopicUpdate,
    TagCreate,
    TagUpdate,
    SourceUpdate,
    SourceBulkAction,
    SourceTagRequest,
    MediaUpdate,
} from './types';

// ============================================================================
// Topics
// ============================================================================

export async function getTopicsForProject(projectId: string): Promise<ResearchTopic[]> {
    const { data, error } = await supabase
        .from('rs_topic')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function getTopic(topicId: string): Promise<ResearchTopic | null> {
    const { data, error } = await supabase
        .from('rs_topic')
        .select('*')
        .eq('id', topicId)
        .single();
    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data;
}

export async function updateTopic(topicId: string, updates: TopicUpdate): Promise<ResearchTopic> {
    const { data, error } = await supabase
        .from('rs_topic')
        .update(updates)
        .eq('id', topicId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ============================================================================
// Keywords
// ============================================================================

export async function getKeywords(topicId: string): Promise<ResearchKeyword[]> {
    const { data, error } = await supabase
        .from('rs_keyword')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function deleteKeyword(keywordId: string): Promise<void> {
    const { error } = await supabase
        .from('rs_keyword')
        .delete()
        .eq('id', keywordId);
    if (error) throw error;
}

// ============================================================================
// Sources
// ============================================================================

export async function getSource(sourceId: string): Promise<ResearchSource | null> {
    const { data, error } = await supabase
        .from('rs_source')
        .select('*')
        .eq('id', sourceId)
        .single();
    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data;
}

export async function getSources(topicId: string, filters?: Partial<SourceFilters>): Promise<ResearchSource[]> {
    let query = supabase
        .from('rs_source')
        .select('*')
        .eq('topic_id', topicId);

    if (filters?.keyword_id) query = query.eq('keyword_id', filters.keyword_id);
    if (filters?.scrape_status) query = query.eq('scrape_status', filters.scrape_status);
    if (filters?.source_type) query = query.eq('source_type', filters.source_type);
    if (filters?.hostname) query = query.eq('hostname', filters.hostname);
    if (filters?.is_included !== undefined) query = query.eq('is_included', filters.is_included);
    if (filters?.origin) query = query.eq('origin', filters.origin);

    if (filters?.sort_by) {
        query = query
            .order(filters.sort_by, { ascending: filters.sort_dir !== 'desc', nullsFirst: false })
            .order('rank', { ascending: true, nullsFirst: false });
    } else {
        // Default: rank ASC (search result relevance), nulls last; then discovered_at DESC
        query = query
            .order('rank', { ascending: true, nullsFirst: false })
            .order('discovered_at', { ascending: false });
    }
    query = query.range(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? 50) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
}

export async function updateSource(sourceId: string, updates: SourceUpdate): Promise<ResearchSource> {
    const { data, error } = await supabase
        .from('rs_source')
        .update(updates)
        .eq('id', sourceId)
        .select()
        .single();
    if (error) throw error;
    return data;
}


export async function bulkUpdateSources(topicId: string, action: SourceBulkAction): Promise<void> {
    const sourceIds = action.source_ids;
    const updates: Record<string, unknown> = {};

    if (action.action === 'include') updates.is_included = true;
    else if (action.action === 'exclude') updates.is_included = false;
    else if (action.action === 'mark_stale') updates.is_stale = true;
    else if (action.action === 'mark_complete') updates.scrape_status = 'complete';

    if (Object.keys(updates).length > 0) {
        const { error } = await supabase
            .from('rs_source')
            .update(updates)
            .eq('topic_id', topicId)
            .in('id', sourceIds);
        if (error) throw error;
    }
}

// ============================================================================
// Content
// ============================================================================

export async function getSourceContent(sourceId: string): Promise<ResearchContent[]> {
    const { data, error } = await supabase
        .from('rs_content')
        .select('*')
        .eq('source_id', sourceId)
        .order('version', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

// ============================================================================
// Synthesis
// ============================================================================

export async function getSynthesis(topicId: string, params?: { scope?: string; keyword_id?: string }): Promise<ResearchSynthesis[]> {
    let query = supabase
        .from('rs_synthesis')
        .select('*')
        .eq('topic_id', topicId)
        .eq('is_current', true);

    if (params?.scope) query = query.eq('scope', params.scope);
    if (params?.keyword_id) query = query.eq('keyword_id', params.keyword_id);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
}

// ============================================================================
// Tags
// ============================================================================

export async function getTags(topicId: string): Promise<ResearchTag[]> {
    const { data, error } = await supabase
        .from('rs_tag')
        .select('*')
        .eq('topic_id', topicId)
        .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function createTag(topicId: string, tag: TagCreate): Promise<ResearchTag> {
    const { data, error } = await supabase
        .from('rs_tag')
        .insert({ ...tag, topic_id: topicId })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateTag(tagId: string, updates: TagUpdate): Promise<ResearchTag> {
    const { data, error } = await supabase
        .from('rs_tag')
        .update(updates)
        .eq('id', tagId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteTag(tagId: string): Promise<void> {
    const { error } = await supabase
        .from('rs_tag')
        .delete()
        .eq('id', tagId);
    if (error) throw error;
}

export async function assignTagsToSource(sourceId: string, body: SourceTagRequest): Promise<SourceTag[]> {
    const rows = body.tag_ids.map(tagId => ({
        source_id: sourceId,
        tag_id: tagId,
        assigned_by: 'manual' as const,
    }));
    const { data, error } = await supabase
        .from('rs_source_tag')
        .upsert(rows, { onConflict: 'source_id,tag_id' })
        .select();
    if (error) throw error;
    return data ?? [];
}

// ============================================================================
// Documents
// ============================================================================

export async function getDocument(topicId: string): Promise<ResearchDocument | null> {
    const { data, error } = await supabase
        .from('rs_document')
        .select('*')
        .eq('topic_id', topicId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function getDocumentVersions(topicId: string): Promise<ResearchDocument[]> {
    const { data, error } = await supabase
        .from('rs_document')
        .select('*')
        .eq('topic_id', topicId)
        .order('version', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

// ============================================================================
// Media
// ============================================================================

export async function getMedia(topicId: string): Promise<ResearchMedia[]> {
    const { data, error } = await supabase
        .from('rs_media')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function updateMedia(mediaId: string, updates: MediaUpdate): Promise<ResearchMedia> {
    const { data, error } = await supabase
        .from('rs_media')
        .update(updates)
        .eq('id', mediaId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ============================================================================
// Templates
// ============================================================================

export async function getTemplates(): Promise<ResearchTemplate[]> {
    const { data, error } = await supabase
        .from('rs_template')
        .select('*')
        .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function getTemplate(templateId: string): Promise<ResearchTemplate | null> {
    const { data, error } = await supabase
        .from('rs_template')
        .select('*')
        .eq('id', templateId)
        .single();
    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data;
}
