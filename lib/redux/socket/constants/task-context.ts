// File Location: lib/redux/socket/constants/task-context.ts

export const AVAILABLE_NAMESPACES = {
    'UserSession': 'User Session',
    'AdminSession': 'Admin Session',
    "Direct": "No Namespace",
    'custom': 'Custom Namespace',
} as const;

export const AVAILABLE_SERVICES = {
    'SampleService': 'Sample Service',
    'RecipeService': 'Recipe Service',
    'ScrapeService': 'Scrape Service',
    'TranscriptionService': 'Transcription Service',
    'Translate': 'Translation Service',
    'TextClassification': 'Text Classification Service',
    'VideoProcessing': 'Video Processing Service',
    'AudioProcessing': 'Audio Processing Service',
    'ImageProcessing': 'Image Processing Service',
    'Workflows': 'Workflow Management',
    'Chat': 'Chat Service',
    'SearchConsole': 'Search Console',
    'Keyword': 'Keyword Research Service',
    'SocialMedia': 'Social Media Management',
    'Email': 'Email Campaigns',
    'SMS': 'SMS Campaigns',
    'Shopify': 'Shopify Integration',
    'WordPress': 'WordPress Integration',
    'custom': 'Custom Namespace'
} as const;

export const SERVICE_EVENTS = {
    'RecipeService': [
        'simple_recipe',
        'batch_recipe',
    ],
    'ScrapeService': [
        'scrape_single',
        'scrape_batch',
    ]
} as const;

export const EVENT_TASKS = {
    'simple_recipe': {
        'get_options': 'Get Options',
        'run_recipe': 'Run Recipe',
        'validate_recipe': 'Validate Recipe',
        'get_recipe_brokers': 'Get Recipe Brokers',
        'edit_recipe': 'Edit Recipe',
        'add_recipe': 'Add Recipe',
        'test_connection': 'Test Connection'
    },
    'scrape_single': {
        'get_options': 'Get Options',
        'scrape_single': 'Scrape Single',
        'scrape_soup': 'Scrape Soup',
        'get_soup': 'Get Soup',
        'add_noise_config': 'Add Noise Config',
        'add_filter_config': 'Add Filter Config',
        'add_main_content_config': 'Add Main Content Config',
        'scrape_page': 'Scrape Page',
        'scrape_site': 'Scrape Site',
        'scrape_batch': 'Scrape Batch',
        'get_cached_data': 'Get Cached Data',
        'custom_parse_cached_data': 'Custom Parse Cached Data',
        'test_connection': 'Test Connection'
    },
    'TranscriptionService': {
        'transcribe_to_presentation': 'Transcribe to Presentation',
        'get_options': 'Get Options',
        'transcribe_audio': 'Transcribe Audio',
        'transcribe_video': 'Transcribe Video',
        'audio_to_notes': 'Audio to Notes',
        'audio_to_presentation': 'Audio to Presentation',
        'audio_to_plan': 'Audio to Plan',
        'custom_transcribe': 'Custom Transcribe',
        'test_connection': 'Test Connection'
    },
    'Translate': {
        'get_options': 'Get Options',
        'start_translation': 'Start Translation',
        'pause_translation': 'Pause Translation',
        'stop_translation': 'Stop Translation',
        'validate_translation': 'Validate Translation',
        'edit_translation': 'Edit Translation',
        'test_connection': 'Test Connection'
    },
    'TextClassification': {
        'get_options': 'Get Options',
        'get_edit_options': 'Get Edit Options',
        'get_find_options': 'Get Find Options',
        'add_document': 'Add Document',
        'add_metric': 'Add Metric',
        'add_identifier': 'Add Identifier',
        'add_search': 'Add Search',
        'add_edit_step': 'Add Edit Step',
        'get_snapshot': 'Get Snapshot',
        'get_state': 'Get State',
        'load_from_state': 'Load From State',
        'process': 'Process',
        'load_state': 'Load State',
        'start_classification': 'Start Classification',
        'pause_classification': 'Pause Classification',
        'stop_classification': 'Stop Classification',
        'validate_classification': 'Validate Classification',
        'edit_classification': 'Edit Classification',
        'test_connection': 'Test Connection'
    },
    'VideoProcessing': {
        'get_options': 'Get Options',
        'start_processing': 'Start Processing',
        'pause_processing': 'Pause Processing',
        'stop_processing': 'Stop Processing',
        'validate_processing': 'Validate Processing',
        'edit_processing': 'Edit Processing',
        'test_connection': 'Test Connection'
    },
    'AudioProcessing': {
        'get_options': 'Get Options',
        'start_processing': 'Start Processing',
        'pause_processing': 'Pause Processing',
        'stop_processing': 'Stop Processing',
        'validate_processing': 'Validate Processing',
        'edit_processing': 'Edit Processing',
        'test_connection': 'Test Connection'
    },
    'ImageProcessing': {
        'get_options': 'Get Options',
        'start_processing': 'Start Processing',
        'pause_processing': 'Pause Processing',
        'stop_processing': 'Stop Processing',
        'validate_processing': 'Validate Processing',
        'edit_processing': 'Edit Processing',
        'test_connection': 'Test Connection'
    },
    'Workflows': {
        'get_options': 'Get Options',
        'start_workflow': 'Start Workflow',
        'pause_workflow': 'Pause Workflow',
        'stop_workflow': 'Stop Workflow',
        'validate_workflow': 'Validate Workflow',
        'edit_workflow': 'Edit Workflow',
        'add_workflow': 'Add Workflow',
        'test_connection': 'Test Connection'
    },
    'Chat': {
        'get_options': 'Get Options',
        'start_chat': 'Start Chat',
        'pause_chat': 'Pause Chat',
        'stop_chat': 'Stop Chat',
        'validate_chat': 'Validate Chat',
        'edit_chat': 'Edit Chat',
        'test_connection': 'Test Connection'
    },
    'SearchConsole': {
        'get_options': 'Get Options',
        'start_console': 'Start Console',
        'pause_console': 'Pause Console',
        'stop_console': 'Stop Console',
        'validate_console': 'Validate Console',
        'edit_console': 'Edit Console',
        'test_connection': 'Test Connection'
    },
    'Keyword': {
        'get_options': 'Get Options',
        'start_keyword_research': 'Start Keyword Research',
        'pause_keyword_research': 'Pause Keyword Research',
        'stop_keyword_research': 'Stop Keyword Research',
        'validate_keyword_research': 'Validate Keyword Research',
        'edit_keyword_research': 'Edit Keyword Research',
        'test_connection': 'Test Connection'
    },
    'SocialMedia': {
        'get_options': 'Get Options',
        'start_post': 'Start Post',
        'pause_post': 'Pause Post',
        'stop_post': 'Stop Post',
        'validate_post': 'Validate Post',
        'edit_post': 'Edit Post',
        'test_connection': 'Test Connection'
    },
    'Email': {
        'get_options': 'Get Options',
        'start_email_campaign': 'Start Email Campaign',
        'pause_email_campaign': 'Pause Email Campaign',
        'stop_email_campaign': 'Stop Email Campaign',
        'validate_email_campaign': 'Validate Email Campaign',
        'edit_email_campaign': 'Edit Email Campaign',
        'test_connection': 'Test Connection'
    },
    'SMS': {
        'get_options': 'Get Options',
        'start_sms_campaign': 'Start SMS Campaign',
        'pause_sms_campaign': 'Pause SMS Campaign',
        'stop_sms_campaign': 'Stop SMS Campaign',
        'validate_sms_campaign': 'Validate SMS Campaign',
        'edit_sms_campaign': 'Edit SMS Campaign',
        'test_connection': 'Test Connection'
    },
    'Shopify': {
        'get_options': 'Get Options',
        'start_sync': 'Start Sync',
        'pause_sync': 'Pause Sync',
        'stop_sync': 'Stop Sync',
        'validate_sync': 'Validate Sync',
        'edit_sync': 'Edit Sync',
        'test_connection': 'Test Connection'
    },
    'WordPress': {
        'get_options': 'Get Options',
        'start_sync': 'Start Sync',
        'pause_sync': 'Pause Sync',
        'stop_sync': 'Stop Sync',
        'validate_sync': 'Validate Sync',
        'edit_sync': 'Edit Sync',
        'test_connection': 'Test Connection'
    }
} as const;

export const TASK_MAP = {
    'simple_recipe': [
        'get_options',
        'run_recipe',
        'validate_recipe',
        'get_recipe_brokers',
        'edit_recipe',
        'add_recipe',
        'test_connection'
    ],
    'scrape_service': [
        'get_options',
        'scrape_single',
        'scrape_soup',
        'get_soup',
        'add_noise_config',
        'add_filter_config',
        'add_main_content_config',
        'scrape_page',
        'scrape_site',
        'scrape_batch',
        'get_cached_data',
        'custom_parse_cached_data',
        'test_connection'
    ],
    'TranscriptionService': [
        'transcribe_to_presentation',
        'get_options',
        'transcribe_audio',
        'transcribe_video',
        'audio_to_notes',
        'audio_to_presentation',
        'audio_to_plan',
        'custom_transcribe',
        'test_connection'
    ],
    'Translate': [
        'get_options',
        'start_translation',
        'pause_translation',
        'stop_translation',
        'validate_translation',
        'edit_translation',
        'test_connection'
    ],
    'TextClassification': [
        'get_options',
        // Things added by Jatin
        'get_edit_options',
        'get_find_options',
        'add_document',
        'add_metric',
        'add_identifier',
        'add_search',
        'add_edit_step',
        'get_snapshot',
        'get_state',
        'load_from_state',
        'process',
        'load_state',
        // -------------------
        'start_classification',
        'pause_classification',
        'stop_classification',
        'validate_classification',
        'edit_classification',
        'test_connection'
    ],
    'VideoProcessing': [
        'get_options',
        'start_processing',
        'pause_processing',
        'stop_processing',
        'validate_processing',
        'edit_processing',
        'test_connection'
    ],
    'AudioProcessing': [
        'get_options',
        'start_processing',
        'pause_processing',
        'stop_processing',
        'validate_processing',
        'edit_processing',
        'test_connection'
    ],
    'ImageProcessing': [
        'get_options',
        'start_processing',
        'pause_processing',
        'stop_processing',
        'validate_processing',
        'edit_processing',
        'test_connection'
    ],
    'Workflows': [
        'get_options',
        'start_workflow',
        'pause_workflow',
        'stop_workflow',
        'validate_workflow',
        'edit_workflow',
        'add_workflow',
        'test_connection'
    ],
    'Chat': [
        'get_options',
        'start_chat',
        'pause_chat',
        'stop_chat',
        'validate_chat',
        'edit_chat',
        'test_connection'
    ],
    'SearchConsole': [
        'get_options',
        'start_console',
        'pause_console',
        'stop_console',
        'validate_console',
        'edit_console',
        'test_connection'
    ],
    'Keyword': [
        'get_options',
        'start_keyword_research',
        'pause_keyword_research',
        'stop_keyword_research',
        'validate_keyword_research',
        'edit_keyword_research',
        'test_connection'
    ],
    'SocialMedia': [
        'get_options',
        'start_post',
        'pause_post',
        'stop_post',
        'validate_post',
        'edit_post',
        'test_connection'
    ],
    'Email': [
        'get_options',
        'start_email_campaign',
        'pause_email_campaign',
        'stop_email_campaign',
        'validate_email_campaign',
        'edit_email_campaign',
        'test_connection'
    ],
    'SMS': [
        'get_options',
        'start_sms_campaign',
        'pause_sms_campaign',
        'stop_sms_campaign',
        'validate_sms_campaign',
        'edit_sms_campaign',
        'test_connection'
    ],
    'Shopify': [
        'get_options',
        'start_sync',
        'pause_sync',
        'stop_sync',
        'validate_sync',
        'edit_sync',
        'test_connection'
    ],
    'WordPress': [
        'get_options',
        'start_sync',
        'pause_sync',
        'stop_sync',
        'validate_sync',
        'edit_sync',
        'test_connection'
    ]
};

export const TASK_CONTEXT_VALIDATION = {
    "run_recipe": {
        'recipe_id': {
            'data_type': 'str',
            'required': true
        },
        'broker_values': {
            'data_type': 'object',
            'required': true
        },
        'overrides': {
            'data_type': 'object',
            'required': false
        },
        'stream': {
            'data_type': 'boolean',
            'required': true
        }
    }
};