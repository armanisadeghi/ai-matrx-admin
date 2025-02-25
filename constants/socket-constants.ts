import { FieldOverrides } from "@/components/socket/form-builder/FormField";

export interface SchemaField {
    REQUIRED: boolean;
    DEFAULT: any;
    VALIDATION: string | null;
    DATA_TYPE: string | null;
    CONVERSION: string | null;
    REFERENCE: any;
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
    },
    processor_overrides: {
        REQUIRED: false,
        DEFAULT: {},
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
    },
    other_overrides: {
        REQUIRED: false,
        DEFAULT: {},
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
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
    },
    id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
    },
    value: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
    },
    ready: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
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
    },
    section_type: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: "VALIDATE_SECTION_TYPE",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
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
    },
    language: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: "VALIDATE_LANGUAGE",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
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
    },
    compiled_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
    },
    compiled_recipe: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
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
    },
    compiled_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
    },
    compiled_recipe: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
    },
    stream: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
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
    },
    broker_values: {
        REQUIRED: true,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: "convert_broker_data",
        REFERENCE: BROKER_DEFINITION,
    },
    overrides: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: OVERRIDE_DEFINITION,
    },
    stream: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
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
    },
    broker_values: {
        REQUIRED: true,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: "convert_broker_data",
        REFERENCE: BROKER_DEFINITION,
    },
    overrides: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: OVERRIDE_DEFINITION,
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
    },
};



// Manually created ================================



export const AVAILABLE_SERVICES = {
    simple_recipe: "Recipe Service",
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
