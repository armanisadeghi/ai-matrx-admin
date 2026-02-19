import type { components } from '@/types/python-generated/api-types';

// ============================================================================
// REQUEST BODY TYPES
// ============================================================================

export type TopicCreate = {
    name: string;
    autonomy_level?: AutonomyLevel;
    template_id?: string | null;
    subject_name?: string | null;
};

export type TopicUpdate = {
    autonomy_level?: AutonomyLevel | null;
    default_search_provider?: SearchProvider | null;
    default_search_params?: Record<string, unknown> | null;
    good_scrape_threshold?: number | null;
    scrapes_per_keyword?: number | null;
    name?: string | null;
};

export type KeywordCreate = components['schemas']['KeywordCreate'];
export type SourceUpdate = components['schemas']['SourceUpdate'];
export type SourceBulkAction = components['schemas']['SourceBulkAction'];
export type SourceTagRequest = components['schemas']['SourceTagRequest'];
export type ContentEditRequest = components['schemas']['ContentEditRequest'];
export type ContentPasteRequest = components['schemas']['ContentPasteRequest'];
export type ExtensionContentSubmit = components['schemas']['ExtensionContentSubmit'];
export type AnalyzeRequest = components['schemas']['AnalyzeRequest'];
export type AnalyzeBulkRequest = components['schemas']['AnalyzeBulkRequest'];
export type SynthesisRequest = components['schemas']['SynthesisRequest'];
export type SuggestRequest = components['schemas']['SuggestRequest'];
export type TagCreate = components['schemas']['TagCreate'];
export type TagUpdate = components['schemas']['TagUpdate'];
export type TemplateCreate = components['schemas']['TemplateCreate'];
export type AddLinksToScope = components['schemas']['AddLinksToScope'];
export type MediaUpdate = components['schemas']['MediaUpdate'];
export type RunPipelineRequest = components['schemas']['RunPipelineRequest'];

// ============================================================================
// ENUM TYPES
// ============================================================================

export type AutonomyLevel = 'auto' | 'semi' | 'manual';
export type SearchProvider = 'brave' | 'google';
export type ScrapeStatus = 'pending' | 'success' | 'thin' | 'failed' | 'manual' | 'skipped' | 'complete';
export type SourceType = 'web' | 'youtube' | 'pdf' | 'file' | 'manual';
export type SourceOrigin = 'search' | 'manual' | 'link_extraction' | 'file_upload';
export type SynthesisScope = 'keyword' | 'project';
export type IterationMode = 'initial' | 'rebuild' | 'update';
export type BulkAction = 'include' | 'exclude' | 'mark_stale' | 'mark_complete' | 'scrape';
export type MediaType = 'image' | 'video' | 'document';
export type TagAssignedBy = 'manual' | 'auto' | 'llm_suggestion';
export type TopicStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

// ============================================================================
// RESPONSE TYPES (matching database tables)
// ============================================================================

export interface ResearchTopic {
    id: string;
    project_id: string;
    name: string;
    subject_name: string | null;
    autonomy_level: AutonomyLevel;
    default_search_provider: SearchProvider;
    default_search_params: Record<string, unknown>;
    good_scrape_threshold: number;
    scrapes_per_keyword: number;
    status: TopicStatus;
    template_id: string | null;
    agent_config: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ResearchProgress {
    total_keywords: number;
    stale_keywords: number;
    total_sources: number;
    included_sources: number;
    sources_by_status: Record<ScrapeStatus, number>;
    total_content: number;
    total_analyses: number;
    total_eligible_for_analysis: number;
    keyword_syntheses: number;
    project_syntheses: number;
    total_tags: number;
    total_documents: number;
}

export interface TopicWithProgress {
    topic: ResearchTopic;
    progress: ResearchProgress;
}

export interface ResearchKeyword {
    id: string;
    topic_id: string;
    project_id: string;
    keyword: string;
    search_provider: SearchProvider;
    search_params: Record<string, unknown> | null;
    last_searched_at: string | null;
    is_stale: boolean;
    result_count: number | null;
    raw_api_response: Record<string, unknown> | null;
    created_at: string;
}

export interface ResearchSource {
    id: string;
    topic_id: string;
    project_id: string;
    url: string;
    title: string | null;
    description: string | null;
    hostname: string | null;
    source_type: SourceType;
    origin: SourceOrigin;
    rank: number | null;
    page_age: string | null;
    thumbnail_url: string | null;
    extra_snippets: string[] | null;
    raw_search_result: Record<string, unknown> | null;
    is_included: boolean;
    is_stale: boolean;
    scrape_status: ScrapeStatus;
    discovered_at: string;
    last_seen_at: string;
}

export interface ResearchContent {
    id: string;
    source_id: string;
    topic_id: string;
    project_id: string;
    content: string;
    content_hash: string | null;
    char_count: number;
    content_type: string;
    is_good_scrape: boolean;
    quality_override: string | null;
    capture_method: string;
    failure_reason: string | null;
    published_at: string | null;
    modified_at: string | null;
    is_current: boolean;
    version: number;
    linked_extraction_id: number | null;
    linked_transcript_id: string | null;
    extracted_links: Record<string, unknown>[] | null;
    extracted_images: Record<string, unknown>[] | null;
    scraped_at: string;
}

export interface ResearchAnalysis {
    id: string;
    content_id: string;
    source_id: string;
    topic_id: string;
    project_id: string;
    agent_type: string;
    agent_id: string | null;
    model_id: string | null;
    instructions: string | null;
    result: string;
    result_structured: Record<string, unknown> | null;
    token_usage: TokenUsage | null;
    created_at: string;
}

export interface ResearchSynthesis {
    id: string;
    topic_id: string;
    project_id: string;
    keyword_id: string | null;
    scope: SynthesisScope;
    agent_type: string;
    agent_id: string | null;
    model_id: string | null;
    instructions: string | null;
    result: string;
    result_structured: Record<string, unknown> | null;
    input_source_ids: string[];
    input_analysis_ids: string[];
    token_usage: TokenUsage | null;
    is_current: boolean;
    version: number;
    iteration_mode: IterationMode;
    previous_synthesis_id: string | null;
    created_at: string;
}

export interface ResearchTag {
    id: string;
    topic_id: string;
    project_id: string;
    name: string;
    description: string | null;
    sort_order: number;
    created_at: string;
    source_count?: number;
}

export interface SourceTag {
    id: string;
    source_id: string;
    tag_id: string;
    is_primary_source: boolean;
    confidence: number | null;
    assigned_by: TagAssignedBy;
    created_at: string;
}

export interface TagConsolidation {
    id: string;
    tag_id: string;
    topic_id: string;
    project_id: string;
    agent_type: string;
    agent_id: string | null;
    model_id: string | null;
    result: string;
    result_structured: Record<string, unknown> | null;
    source_content_ids: string[];
    token_usage: TokenUsage | null;
    is_current: boolean;
    version: number;
    created_at: string;
}

export interface ResearchDocument {
    id: string;
    topic_id: string;
    project_id: string;
    title: string;
    content: string;
    content_structured: Record<string, unknown> | null;
    source_consolidation_ids: string[];
    agent_type: string;
    agent_id: string | null;
    model_id: string | null;
    token_usage: TokenUsage | null;
    version: number;
    created_at: string;
}

export interface ResearchTemplate {
    id: string;
    name: string;
    description: string | null;
    is_system: boolean;
    created_by: string | null;
    keyword_templates: string[] | null;
    default_tags: string[] | null;
    default_search_params: Record<string, unknown> | null;
    agent_config: Record<string, unknown> | null;
    autonomy_level: AutonomyLevel;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export interface ResearchMedia {
    id: string;
    source_id: string;
    topic_id: string;
    project_id: string;
    media_type: MediaType;
    url: string;
    alt_text: string | null;
    caption: string | null;
    thumbnail_url: string | null;
    width: number | null;
    height: number | null;
    is_relevant: boolean;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export interface ExtractedLink {
    url: string;
    link_text: string | null;
    found_on_source_id: string;
    found_on_title: string | null;
    found_on_url: string | null;
}

export interface TokenUsage {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    model?: string;
    estimated_cost?: number;
}

export interface CostBreakdown {
    category: string;
    calls: number;
    input_tokens: number;
    output_tokens: number;
    estimated_cost: number;
}

export interface ResearchCosts {
    total_estimated_cost: number;
    total_llm_calls: number;
    breakdown: CostBreakdown[];
}

export interface SuggestResponse {
    title: string;
    description: string;
    keywords: string[];
    initial_insights: string | null;
}

export interface TagSuggestion {
    tag_name: string;
    confidence: number;
    reason: string;
}

// ============================================================================
// STREAMING TYPES
// ============================================================================

export type ResearchStreamStep = 'searching' | 'scraping' | 'analyzing' | 'synthesizing' | 'reporting' | 'complete' | 'error';

export interface ResearchStreamStatus {
    status: ResearchStreamStep;
    user_message: string;
    current_step?: number;
    total_steps?: number;
}

// ============================================================================
// SOURCE FILTER TYPES
// ============================================================================

export interface SourceFilters {
    keyword_id?: string;
    scrape_status?: ScrapeStatus;
    source_type?: SourceType;
    hostname?: string;
    is_included?: boolean;
    origin?: SourceOrigin;
    limit: number;
    offset: number;
}

export const DEFAULT_SOURCE_FILTERS: SourceFilters = {
    limit: 50,
    offset: 0,
};

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================================

/** @deprecated Use ResearchTopic instead */
export type ResearchConfig = ResearchTopic;
/** @deprecated Use TopicWithProgress instead */
export type ResearchState = TopicWithProgress;
