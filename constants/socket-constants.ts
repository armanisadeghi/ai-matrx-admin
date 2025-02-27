import { FieldOverrides } from "@/components/socket/form-builder/FormField";

export interface SchemaField {
    REQUIRED: boolean;
    DEFAULT: any;
    VALIDATION: string | null;
    DATA_TYPE: string | null;
    CONVERSION: string | null;
    REFERENCE: any;
    iconName?: string;
}

export interface Schema {
    [key: string]: SchemaField;
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

export interface RemoveFirstAndLastParagraph {
    classified_markdown: string;
}

export interface ExtractParagraphs {
    classified_markdown: string;
}

export interface ExtractSectionBlocks {
    classified_markdown: string;
    section_type: string;
}

export interface ExtractCodeBlocks {
    raw_markdown: string;
    language?: string;
}

export interface ExtractAllCodeBlocks {
    raw_markdown: string;
}

export interface ClassifyMarkdown {
    raw_markdown: string;
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
    broker_values: BrokerValues[];
    overrides?: Overrides;
    stream: boolean;
}

export interface CockpitInstant {
    cockpit_id: string;
    broker_values: BrokerValues[];
    overrides?: Overrides;
}

export const OVERRIDE_DEFINITION: Schema = {
    model_override: {
        REQUIRED: false,
        DEFAULT: "",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Brain",
    },
    processor_overrides: {
        REQUIRED: false,
        DEFAULT: {},
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Settings",
    },
    other_overrides: {
        REQUIRED: false,
        DEFAULT: {},
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Braces",
    },
};

export const BROKER_DEFINITION: Schema = {
    name: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "User",
    },
    id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Key",
    },
    value: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "LetterText",
    },
    ready: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Check",
    },
};

export const REMOVE_FIRST_AND_LAST_PARAGRAPH: Schema = {
    classified_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: "VALIDATE_CLASSIFIED_MARKDOWN",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "TableOfContents",
    },
};

export const EXTRACT_PARAGRAPHS: Schema = {
    classified_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "TableOfContents",
    },
};

export const EXTRACT_SECTION_BLOCKS: Schema = {
    classified_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "TableOfContents",
    },
    section_type: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: "VALIDATE_SECTION_TYPE",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Combine",
    },
};

export const EXTRACT_CODE_BLOCKS: Schema = {
    raw_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "TableOfContents",
    },
    language: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: "VALIDATE_LANGUAGE",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Code",
    },
};

export const EXTRACT_ALL_CODE_BLOCKS: Schema = {
    raw_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: "VALIDATE_MARKDOWN_TEXT",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "TableOfContents",
    },
};

export const CLASSIFY_MARKDOWN: Schema = {
    raw_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "TableOfContents",
    },
};

// manually created
export const SCRAPE_SINGLE: Schema = {
    scrape_url: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Link",
    },
};

// manually created

export const SCRAPE_BATCH: Schema = {
    scrape_urls: {
        REQUIRED: true,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Link",
    },
};

export const GET_COMPILED_RECIPE: Schema = {
    compiled_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Key",
    },
};

export const GET_RECIPE: Schema = {
    recipe_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Key",
    },
};

export const ADD_RECIPE: Schema = {
    recipe_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Key",
    },
    compiled_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Key",
    },
    compiled_recipe: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Braces",
    },
};

export const RUN_COMPILED_RECIPE: Schema = {
    recipe_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Key",
    },
    compiled_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Key",
    },
    compiled_recipe: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Braces",
    },
    stream: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Airplay",
    },
};

export const RUN_RECIPE: Schema = {
    recipe_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Key",
    },
    broker_values: {
        REQUIRED: true,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: "convert_broker_data",
        REFERENCE: BROKER_DEFINITION,
        iconName: "Parentheses",
    },
    overrides: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: OVERRIDE_DEFINITION,
        iconName: "Braces",
    },
    stream: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Airplay",
    },
};

export const COCKPIT_INSTANT: Schema = {
    cockpit_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Key",
    },
    broker_values: {
        REQUIRED: true,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: "convert_broker_data",
        REFERENCE: BROKER_DEFINITION,
        iconName: "Parentheses",
    },
    overrides: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: OVERRIDE_DEFINITION,
        iconName: "Braces",
    },
};

export const AVAILABLE_NAMESPACES = {
    UserSession: "User Session",
    AdminSession: "Admin Session",
    Direct: "No Namespace",
    custom: "Custom Namespace",
} as const;

export const URL_DEFINITION: Schema = {
    url: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Link",
    },
};

export const QUICK_SCRAPE: Schema = {
    urls: {
        REQUIRED: true,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Link",
    },
};

// Manually created ================================

export const BROKER_DEFINITION_NEW: Schema = {
    id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Key",
    },
    value: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "LetterText",
    },
    ready: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Check",
    },
};


export const ADD_BROKER: Schema = {
    id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Key",
    },
    value: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "LetterText",
    },
    ready: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Check",
    },
};

export const UPDATE_BROKER_VALUE: Schema = {
    id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Key",
    },
    value: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "LetterText",
    },
};

export const SET_BROKER_READY: Schema = {
    id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Key",
    },
};

export const ADD_MODEL_OVERRIDE: Schema = {
    model_override: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Brain",
    },
};

export const ADD_PROCESSOR_OVERRIDE: Schema = {
    processor_override: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Settings",
    },
};

export const ADD_OTHER_OVERRIDE: Schema = {
    other_override: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
        iconName: "Braces",
    },
};

export const AVAILABLE_SERVICES = {
    simple_recipe: "Recipe Service",
    advanced_recipe: "Advanced Recipe Service",
    cockpit_service: "Cockpit Service",
    markdown_service: "Markdown Service",
    scrape_service: "Scrape Service",
} as const;

export const SERVICE_TASKS = {
    simple_recipe: {
        run_recipe: RUN_RECIPE,
        run_compiled_recipe: RUN_COMPILED_RECIPE,
        add_recipe: ADD_RECIPE,
        get_recipe: GET_RECIPE,
        get_compiled_recipe: GET_COMPILED_RECIPE,
    },
    advanced_recipe: {
        run_recipe: RUN_RECIPE,
        add_broker: ADD_BROKER,
        update_broker_value: UPDATE_BROKER_VALUE,
        set_broker_ready: SET_BROKER_READY,
        add_model_override: ADD_MODEL_OVERRIDE,
        add_processor_override: ADD_PROCESSOR_OVERRIDE,
        add_other_override: ADD_OTHER_OVERRIDE,
    },
    cockpit_service: {
        cockpit_instant: COCKPIT_INSTANT,
    },
    markdown_service: {
        classify_markdown: CLASSIFY_MARKDOWN,
        extract_all_code_blocks: EXTRACT_ALL_CODE_BLOCKS,
        extract_code_blocks: EXTRACT_CODE_BLOCKS,
        extract_section_blocks: EXTRACT_SECTION_BLOCKS,
        extract_paragraphs: EXTRACT_PARAGRAPHS,
        remove_first_and_last_paragraph: REMOVE_FIRST_AND_LAST_PARAGRAPH,
    },
    scrape_service: {
        quick_scrape: QUICK_SCRAPE,
    },
} as const;

export const SOCKET_TASKS: { [key: string]: Schema } = Object.entries(SERVICE_TASKS).reduce(
    (acc, [_, serviceTasks]) => ({
        ...acc,
        ...serviceTasks,
    }),
    {}
);

export const FIELD_OVERRIDES: FieldOverrides = {
    raw_markdown: {
        type: "textarea",
        props: {
            rows: 10,
        },
    },
};

export const SOCKET_TASKS_OLD = {
    cockpit_instant: COCKPIT_INSTANT,
    run_recipe: RUN_RECIPE,
    run_compiled_recipe: RUN_COMPILED_RECIPE,
    add_recipe: ADD_RECIPE,
    get_recipe: GET_RECIPE,
    get_compiled_recipe: GET_COMPILED_RECIPE,
    classify_markdown: CLASSIFY_MARKDOWN,
    extract_all_code_blocks: EXTRACT_ALL_CODE_BLOCKS,
    extract_code_blocks: EXTRACT_CODE_BLOCKS,
    extract_section_blocks: EXTRACT_SECTION_BLOCKS,
    extract_paragraphs: EXTRACT_PARAGRAPHS,
    remove_first_and_last_paragraph: REMOVE_FIRST_AND_LAST_PARAGRAPH,
};

export const SERVICES_DETAILS = {
    simple_recipe: {
        name: "Recipe Service",
        description: "A service for running recipes",
        icon: "🧠",
    },
    advanced_recipe: {
        name: "Advanced Recipe Service",
        description: "A service for running advanced recipes",
        icon: "🧠",
    },
    cockpit_service: {
        name: "Cockpit Service",
        description: "A service for running cockpits",
        icon: "Airplane",
    },
    markdown_service: {
        name: "Markdown Service",
        description: "A service for running markdown",
        icon: "📄",
    },
    scrape_service: {
        name: "Scrape Service",
        description: "A service for scraping",
        icon: "🕸️",
    },
} as const;
