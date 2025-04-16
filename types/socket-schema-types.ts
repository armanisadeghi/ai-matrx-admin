// File: types/socket-schema-types.ts

export interface ChatConfigs {
    recipe_id: string;
    version?: number;
    user_id?: string;
    prepare_for_next_call?: boolean;
    save_new_conversation?: boolean;
    include_classified_output?: boolean;
    model_override?: string;
    tools_override?: any[][];
    allow_default_values?: boolean;
    allow_removal_of_unmatched?: boolean;
}

export interface ChatConfig {
    recipe_id: string;
    version?: number;
    user_id?: string;
    prepare_for_next_call?: boolean;
    save_new_conversation?: boolean;
    include_classified_output?: boolean;
    model_override?: string;
    tools_override?: any[][];
    allow_default_values?: boolean;
    allow_removal_of_unmatched?: boolean;
}

export interface MessageObject {
    id?: string;
    conversation_id?: string;
    content?: string;
    role?: string;
    type?: string;
    files?: any[][];
    metadata?: Record<string, any>;
}

export interface Overrides {
    model_override?: string;
    processor_overrides?: Record<string, any>;
    other_overrides?: Record<string, any>;
}

export interface BrokerValues {
    name?: string;
    id: string;
    value?: string;
    ready?: boolean;
}

export interface ConvertRecipeToChat {
    chat_id: string;
}

export interface RunRecipe {
    recipe_id: string;
    broker_values?: BrokerValues[];
    overrides?: Overrides;
    stream: boolean;
}

export interface SampleService {
    slider_field?: any;
    select_field: string;
    radio_field: string;
    file_field?: string;
    files_field?: any[][];
    json_field?: Record<string, any>;
    switch_field?: boolean;
    checkbox_field?: boolean;
    textarea_field?: string;
}

export interface MicCheck {
    mic_check_message: string;
}

export interface PrepareBatchRecipe {
    chat_configs: ChatConfigs[];
    broker_values?: BrokerValues[];
    max_count?: number;
}

export interface RunBatchRecipe {
    chat_configs: ChatConfigs[];
    broker_values?: BrokerValues[];
    max_count?: number;
}

export interface RunRecipeToChat {
    chat_config: ChatConfig;
    broker_values?: BrokerValues[];
}

export interface MicCheck {
    mic_check_message: string;
}

export interface RunChatRecipe {
    recipe_id: string;
    version?: number;
    broker_values?: BrokerValues[];
    user_id?: string;
    prepare_for_next_call?: boolean;
    save_new_conversation?: boolean;
    include_classified_output?: boolean;
    model_override?: string;
    tools_override?: any[][];
    allow_default_values?: boolean;
    allow_removal_of_unmatched?: boolean;
}

export interface GetNeededRecipeBrokers {
    recipe_id: string;
    version?: number;
}

export interface PrepConversation {
    conversation_id: string;
}

export interface AiChat {
    conversation_id: string;
    message_object: MessageObject;
}

export interface MicCheck {
    mic_check_message: string;
}

export interface EditWcInjury {
    injury_id: string;
    digit?: number;
    wpi?: number;
    le?: number;
    ue?: number;
    industrial?: number;
    pain?: number;
    side?: string;
}

export interface EditWcClaim {
    claim_id: string;
    date_of_injury?: string;
    date_of_birth?: string;
    age_at_doi?: number;
    occupational_code?: number;
    weekly_earnings?: number;
    applicant_name?: string;
}

export interface CalculateWcRatings {
    report_id: string;
}

export interface CreateWcInjury {
    report_id: string;
    impairment_definition_id: string;
    digit?: number;
    wpi?: number;
    le?: number;
    ue?: number;
    industrial?: number;
    pain?: number;
    side?: string;
}

export interface CreateWcReport {
    claim_id?: string;
}

export interface CreateWcClaim {
    date_of_injury?: string;
    date_of_birth?: string;
    age_at_doi?: number;
    occupational_code: number;
    weekly_earnings?: number;
    applicant_name: string;
}

export interface QuickScrape {
    urls: any[][];
}

export interface MicCheck {
    mic_check_message: string;
}

export interface TrackContentGroupingRun {
    content_grouping_run_id: number;
}

export interface CreateContentGroupingRun {
    full_site_scrape_task_id: number;
    content_grouping_config?: Record<string, any>;
}

export interface ViewParsedPage {
    parsed_content_id: number;
}

export interface GetParsedPages {
    full_site_scrape_task_id: number;
    cursor?: string;
    page_size?: number;
}

export interface ResumeFullSiteScrapeTask {
    full_site_scrape_task_id: number;
}

export interface PauseFullSiteScrapeTask {
    full_site_scrape_task_id: number;
}

export interface CancelFullSiteScrapeTask {
    full_site_scrape_task_id: number;
}

export interface GetFullSiteScrapeProgressDetailed {
    full_site_scrape_task_id: number;
}

export interface GetFullSiteScrapeProgress {
    full_site_scrape_task_id: number;
}

export interface CreateFullSiteScrapeTask {
    urls: any[][];
}

export interface GetScrapeTaskDetails {
    scrape_task_id: number;
}

export interface GetScrapeHistoryByTaskId {
    scrape_task_id: number;
}

export interface GetScrapeHistoryByUrl {
    url: string;
}

export interface ParseResponsesById {
    scrape_task_ids: any[][];
    use_configs?: boolean;
    noise_config_id?: number;
    filter_config_id?: number;
}

export interface ParseResponseById {
    scrape_task_id: string;
    use_configs?: boolean;
    noise_config_id?: string;
    filter_config_id?: number;
}

export interface ScrapePage {
    url: string;
    use_mode?: string;
    interaction_settings_id?: number;
}

export interface CreateScrapeTasks {
    urls: any[][];
    use_configs?: boolean;
    use_mode?: string;
    interaction_settings_id?: number;
}

export interface QuickScrape {
    urls: any[][];
    get_anchors?: boolean;
}

export interface SaveInteractionSettings {
    interaction_settings_id: number;
    new_interaction_settings: Record<string, any>;
}

export interface SaveFilterConfig {
    filter_config_id: number;
    new_filter_config: Record<string, any>;
}

export interface SaveNoiseConfig {
    noise_config_id: number;
    new_noise_config: Record<string, any>;
}

export interface CreateFilterConfig {
    filter_config_name: string;
}

export interface CreateNoiseConfig {
    noise_config_name: string;
}

export interface GetInteractionSettingsById {
    interaction_settings_id: number;
}

export interface GetFilterConfigs {
}

export interface GetFilterConfigById {
    filter_config_id: number;
}

export interface GetNoiseConfigs {
}

export interface GetNoiseConfigById {
    noise_config_id: number;
}

export interface CreateInteractionSettings {
    interaction_settings_name: string;
}

export interface CreateDomain {
    domain: string;
}

export interface UpdateDomainConfig {
    domain_id: number;
    path_pattern: string;
    noise_config_id?: number;
    filter_config_id?: number;
    plugin_ids?: any[][];
    interaction_settings_id?: number;
    use_mode?: string;
}

export interface CreateDomainConfig {
    domain_id: number;
    path_pattern: string;
    noise_config_id?: number;
    filter_config_id?: number;
    plugin_ids?: any[][];
    interaction_settings_id?: number;
    use_mode?: string;
}

export interface GetDomainConfigById {
    domain_id: number;
}

export interface GetDomains {
}

export interface MicCheck {
    mic_check_message: string;
}

export interface GetAllPythonClassDocstrings {
    raw_markdown: string;
}

export interface GetAllPythonFunctionDocstrings {
    raw_markdown: string;
}

export interface GetAllPythonComments {
    raw_markdown: string;
}

export interface GetPythonDicts {
    raw_markdown: string;
    dict_variable_name?: string;
}

export interface RemoveFirstAndLastParagraph {
    raw_markdown: string;
}

export interface GetSegments {
    raw_markdown: string;
    segment_type: string;
}

export interface GetSectionGroups {
    raw_markdown: string;
    section_group_type: string;
}

export interface GetSectionBlocks {
    raw_markdown: string;
    section_type: string;
}

export interface GetAllCodeBlocks {
    raw_markdown: string;
    remove_comments?: boolean;
}

export interface GetCodeBlocksByLanguage {
    raw_markdown: string;
    language: string;
    remove_comments?: boolean;
}

export interface ClassifyMarkdown {
    raw_markdown: string;
}

export interface MicCheck {
    mic_check_message: string;
}

export interface RunChatRecipe {
    recipe_id: string;
    version?: number;
    broker_values?: BrokerValues[];
    user_id?: string;
    prepare_for_next_call?: boolean;
    save_new_conversation?: boolean;
    include_classified_output?: boolean;
    model_override?: string;
    tools_override?: any[][];
    allow_default_values?: boolean;
    allow_removal_of_unmatched?: boolean;
}

export interface GetNeededRecipeBrokers {
    recipe_id: string;
    version?: number;
}

export interface GetCompiledRecipe {
    compiled_id: string;
}

export interface GetRecipe {
    recipe_id: string;
}

export interface AddRecipe {
    recipe_id: string;
    compiled_id: string;
    compiled_recipe: string;
}

export interface RunCompiledRecipe {
    recipe_id: string;
    compiled_id: string;
    compiled_recipe: string;
    stream: boolean;
}

export interface RunRecipe {
    recipe_id: string;
    broker_values?: BrokerValues[];
    overrides?: Overrides;
    stream: boolean;
}

export interface CockpitInstant {
    cockpit_id: string;
    broker_values: BrokerValues[];
    overrides?: Overrides;
}