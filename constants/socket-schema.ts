// File Location: constants/socket-schema.ts
import { flexibleJsonParse } from "@/utils/json-utils";

export interface SchemaField {
    REQUIRED: boolean;
    DEFAULT: any;
    VALIDATION: string | null;
    DATA_TYPE: string | null;
    CONVERSION: string | null;
    REFERENCE: any;
    ICON_NAME?: string;
    COMPONENT?: string;
    COMPONENT_PROPS?: Record<string, any>;
    DESCRIPTION?: string;
    TEST_VALUE?: any;
}

export interface Schema {
    [key: string]: SchemaField;
}

export const CREATE_WC_CLAIM: Schema = {
    age_at_doi: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 0, max: 120 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: null,
        DESCRIPTION: "Age at the date of injury",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    applicant_name: {
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Full name of the applicant",
        ICON_NAME: "User",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    date_of_birth: {
        COMPONENT: "TextInput",
        COMPONENT_PROPS: { placeholder: "YYYY-MM-DD" },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Date of birth in YYYY-MM-DD format",
        ICON_NAME: "Calendar",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: "validate_date",
    },
    date_of_injury: {
        COMPONENT: "TextInput",
        COMPONENT_PROPS: { placeholder: "YYYY-MM-DD" },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Date of injury in YYYY-MM-DD format",
        ICON_NAME: "Calendar",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: "validate_date",
    },
    occupational_code: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: null,
        DESCRIPTION: "Occupational code",
        ICON_NAME: "Briefcase",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    weekly_earnings: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { step: 0.01, min: 0 },
        CONVERSION: null,
        DATA_TYPE: "float",
        DEFAULT: 290.0,
        DESCRIPTION: "Weekly earnings in dollars",
        ICON_NAME: "DollarSign",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const STOP_TAIL_LOGS: Schema = {};

export const SEARCH_AND_SCRAPE_LIMITED: Schema = {
    anchor_size: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 10, max: 500 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 100,
        DESCRIPTION: "Size of hyperlinks in scraped text",
        ICON_NAME: "Ruler",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: 100,
        VALIDATION: null,
    },
    country_code: {
        COMPONENT: "Select",
        COMPONENT_PROPS: {
            options: [
                { label: "Argentina", value: "AR" },
                { label: "Australia", value: "AU" },
                { label: "Austria", value: "AT" },
                { label: "Belgium", value: "BE" },
                { label: "Brazil", value: "BR" },
                { label: "Canada", value: "CA" },
                { label: "Chile", value: "CL" },
                { label: "Denmark", value: "DK" },
                { label: "Finland", value: "FI" },
                { label: "France", value: "FR" },
                { label: "Germany", value: "DE" },
                { label: "Hong Kong", value: "HK" },
                { label: "India", value: "IN" },
                { label: "Indonesia", value: "ID" },
                { label: "Italy", value: "IT" },
                { label: "Japan", value: "JP" },
                { label: "Korea", value: "KR" },
                { label: "Malaysia", value: "MY" },
                { label: "Mexico", value: "MX" },
                { label: "Netherlands", value: "NL" },
                { label: "New Zealand", value: "NZ" },
                { label: "Norway", value: "NO" },
                { label: "Peoples Republic of China", value: "CN" },
                { label: "Poland", value: "PL" },
                { label: "Portugal", value: "PT" },
                { label: "Republic of the Philippines", value: "PH" },
                { label: "Russia", value: "RU" },
                { label: "Saudi Arabia", value: "SA" },
                { label: "South Africa", value: "ZA" },
                { label: "Spain", value: "ES" },
                { label: "Sweden", value: "SE" },
                { label: "Switzerland", value: "CH" },
                { label: "Taiwan", value: "TW" },
                { label: "Turkey", value: "TR" },
                { label: "United Kingdom", value: "GB" },
                { label: "United States", value: "US" },
                { label: "All Regions", value: "ALL" },
            ],
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "all",
        DESCRIPTION: "Enter the country code to get search results for.",
        ICON_NAME: "Flag",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: "US",
        VALIDATION: null,
    },
    get_content_filter_removal_details: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get list of objects that were ignored during parsing page based on settings.",
        ICON_NAME: "RemoveFormatting",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_links: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get all the links from the scraped page. Links are categorized as internal, external, document, archive etc.",
        ICON_NAME: "Link",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_main_image: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION:
            "Get main image for the scraped page. Main image is usually the biggest or most relevant image on the page. Extracted from OG metadata or other meta tags.",
        ICON_NAME: "Image",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    get_organized_data: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get organized json content for the scrape page.",
        ICON_NAME: "Braces",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_overview: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION:
            "Get overview content for the scraped page. Overview contains basic information for the page like title, other metadata etc.",
        ICON_NAME: "Target",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_structured_data: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get structured data json content for the scrape page.",
        ICON_NAME: "Braces",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_text_data: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Get parsed text data for the scraped page. Generated from 'organized data'.",
        ICON_NAME: "LetterText",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_anchors: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include hyperlinks in scraped text",
        ICON_NAME: "ExternalLink",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_highlighting_markers: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include /exclude highlighting markers like 'underline', 'list markers' etc... from text.",
        ICON_NAME: "Underline",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    include_media: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include media content in text output.",
        ICON_NAME: "TvMinimalPlay",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_media_description: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include media description (media caption etc.) in text. Triggers when include_media is turned on.",
        ICON_NAME: "WholeWord",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_media_links: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include media links (image , video, audio) in text. Triggered when include_media is turned on.",
        ICON_NAME: "Link",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    keyword: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter query to search and get results for.",
        ICON_NAME: "WholeWord",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "apple stock price",
        VALIDATION: null,
    },
    max_page_read: {
        COMPONENT: "slider",
        COMPONENT_PROPS: { min: 1, max: 20, step: 1, range: "False" },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 10,
        DESCRIPTION: "Enter the number of results per keyword to get.",
        ICON_NAME: "SlidersHorizontal",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: 5,
        VALIDATION: null,
    },
    search_type: {
        COMPONENT: "RadioGroup",
        COMPONENT_PROPS: {
            options: [
                { label: "All", value: "all" },
                { label: "Web", value: "web" },
                { label: "News", value: "news" },
            ],
            orientation: "vertical",
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "all",
        DESCRIPTION: "Kind of search type to scrape, 'web', 'news', or 'all'.",
        ICON_NAME: "Rss",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const GET_ALL_PYTHON_CLASS_DOCSTRINGS: Schema = {
    raw_markdown: {
        COMPONENT: "textarea",
        COMPONENT_PROPS: { rows: 10 },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const QUICK_SCRAPE_STREAM: Schema = {
    anchor_size: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 10, max: 500 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 100,
        DESCRIPTION: "Size of hyperlinks in scraped text",
        ICON_NAME: "Ruler",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: 100,
        VALIDATION: null,
    },
    get_content_filter_removal_details: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get list of objects that were ignored during parsing page based on settings.",
        ICON_NAME: "RemoveFormatting",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_links: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get all the links from the scraped page. Links are categorized as internal, external, document, archive etc.",
        ICON_NAME: "Link",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_main_image: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION:
            "Get main image for the scraped page. Main image is usually the biggest or most relevant image on the page. Extracted from OG metadata or other meta tags.",
        ICON_NAME: "Image",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    get_organized_data: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get organized json content for the scrape page.",
        ICON_NAME: "Braces",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_overview: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION:
            "Get overview content for the scraped page. Overview contains basic information for the page like title, other metadata etc.",
        ICON_NAME: "Target",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_structured_data: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get structured data json content for the scrape page.",
        ICON_NAME: "Braces",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_text_data: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Get parsed text data for the scraped page. Generated from 'organized data'.",
        ICON_NAME: "LetterText",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_anchors: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include hyperlinks in scraped text",
        ICON_NAME: "ExternalLink",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_highlighting_markers: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include /exclude highlighting markers like 'underline', 'list markers' etc... from text.",
        ICON_NAME: "Underline",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    include_media: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include media content in text output.",
        ICON_NAME: "TvMinimalPlay",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_media_description: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include media description (media caption etc.) in text. Triggers when include_media is turned on.",
        ICON_NAME: "WholeWord",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_media_links: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include media links (image , video, audio) in text. Triggered when include_media is turned on.",
        ICON_NAME: "Link",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    urls: {
        COMPONENT: "arrayField",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: null,
        DESCRIPTION: "Enter the urls to be scraped.",
        ICON_NAME: "Link",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: ["https://en.wikipedia.org/wiki/Donald_Trump", "https://titaniumsuccess.com/arman-sadeghi/business-coach/"],
        VALIDATION: null,
    },
};

export const GET_COMPILED_RECIPE: Schema = {
    compiled_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the id of the compiled recipe to get.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const READ_LOGS: Schema = {
    filename: {
        COMPONENT: "Select",
        COMPONENT_PROPS: {
            options: [
                { value: "application logs", label: "Application Logs" },
                { value: "daphne logs", label: "Daphne Logs" },
                { value: "local logs", label: "Local Logs" },
            ],
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "application logs",
        DESCRIPTION: "The log file to read (Application Logs, Daphne Logs, or Local Logs).",
        ICON_NAME: "Document",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    lines: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 100,
        DESCRIPTION: "The number of lines to read from the log file (0 for all).",
        ICON_NAME: "Number",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    search: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "A search term to filter log lines (case-insensitive).",
        ICON_NAME: "Search",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const MESSAGE_OBJECT_DEFINITION: Schema = {
    content: {
        COMPONENT: "textarea",
        COMPONENT_PROPS: { rows: 10 },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "",
        DESCRIPTION: "Enter the message content.",
        ICON_NAME: "Text",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    conversation_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "",
        DESCRIPTION: "Enter the conversation id.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    files: {
        COMPONENT: "MultiFileUpload",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Public urls for files to be associated with the message.",
        ICON_NAME: "Files",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "",
        DESCRIPTION: "Enter the message id.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    metadata: {
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "object",
        DEFAULT: {},
        DESCRIPTION: "Metadata for the message.",
        ICON_NAME: "Metadata",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    role: {
        COMPONENT: "Select",
        COMPONENT_PROPS: {
            options: [
                { label: "User", value: "user" },
                { label: "Assistant", value: "assistant" },
                { label: "System", value: "system" },
                { label: "Tool", value: "tool" },
            ],
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "",
        DESCRIPTION: "Enter the message role. (user, assistant, system, tool)",
        ICON_NAME: "User",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    type: {
        COMPONENT: "Select",
        COMPONENT_PROPS: {
            options: [
                { label: "Text", value: "text" },
                { label: "Tool Call", value: "tool_call" },
                { label: "Mixed", value: "mixed" },
            ],
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "",
        DESCRIPTION: "Enter the message type. (text, tool_call, mixed)",
        ICON_NAME: "Type",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const CHAT_CONFIG_DEFINITION: Schema = {
    allow_default_values: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Determines if the default values can be used for brokers which are not provided or are not ready.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    allow_removal_of_unmatched: {
        COMPONENT: "Checkbox",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION:
            "Determines if brokers which are not provided or are not ready should be removed from the input content prior to the call.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    include_classified_output: {
        COMPONENT: "Checkbox",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Determines if the classified output should be included in the response.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    model_override: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the ID of the AI Model or leave blank to use the default model.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: "10168527-4d6b-456f-ab07-a889223ba3a9",
        VALIDATION: null,
    },
    prepare_for_next_call: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Determines if the results should be saved as a new conversation.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    recipe_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the ID of the recipe to be fetched, cached and ready for fast usage.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "e2049ce6-c340-4ff7-987e-deb24a977853",
        VALIDATION: null,
    },
    save_new_conversation: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Determines if the results should be saved as a new conversation.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    tools_override: {
        COMPONENT: "arrayField",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Enter a list of tool names to be used in the call, which will override the tools defined in the recipe.",
        ICON_NAME: "PocketKnife",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    user_id: {
        COMPONENT: "",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "socket_internal_user_id",
        DESCRIPTION: "",
        ICON_NAME: "",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    version: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "latest",
        DESCRIPTION: "Enter the version of the recipe or blank to get the latest version.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: "latest",
        VALIDATION: null,
    },
};

export const CREATE_WC_REPORT: Schema = {
    claim_id: {
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "ID of the associated claim",
        ICON_NAME: "FileText",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const CLEANUP_WORKFLOW: Schema = {
    instance_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the instance ID of the workflow to operate on.",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        VALIDATION: null,
    },
};

export const CALCULATE_WC_RATINGS: Schema = {
    report_id: {
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "ID of the report to calculate ratings for",
        ICON_NAME: "FileText",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const ADD_RECIPE: Schema = {
    compiled_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the id of the compiled recipe to add.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    compiled_recipe: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the compiled recipe to add.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    recipe_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the id of the recipe to add.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "e2049ce6-c340-4ff7-987e-deb24a977853",
        VALIDATION: null,
    },
};

export const CLASSIFY_MARKDOWN: Schema = {
    raw_markdown: {
        COMPONENT: "textarea",
        COMPONENT_PROPS: { rows: 10 },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const SEARCH_AND_SCRAPE: Schema = {
    anchor_size: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 10, max: 500 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 100,
        DESCRIPTION: "Size of hyperlinks in scraped text",
        ICON_NAME: "Ruler",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: 100,
        VALIDATION: null,
    },
    country_code: {
        COMPONENT: "Select",
        COMPONENT_PROPS: {
            options: [
                { label: "Argentina", value: "AR" },
                { label: "Australia", value: "AU" },
                { label: "Austria", value: "AT" },
                { label: "Belgium", value: "BE" },
                { label: "Brazil", value: "BR" },
                { label: "Canada", value: "CA" },
                { label: "Chile", value: "CL" },
                { label: "Denmark", value: "DK" },
                { label: "Finland", value: "FI" },
                { label: "France", value: "FR" },
                { label: "Germany", value: "DE" },
                { label: "Hong Kong", value: "HK" },
                { label: "India", value: "IN" },
                { label: "Indonesia", value: "ID" },
                { label: "Italy", value: "IT" },
                { label: "Japan", value: "JP" },
                { label: "Korea", value: "KR" },
                { label: "Malaysia", value: "MY" },
                { label: "Mexico", value: "MX" },
                { label: "Netherlands", value: "NL" },
                { label: "New Zealand", value: "NZ" },
                { label: "Norway", value: "NO" },
                { label: "Peoples Republic of China", value: "CN" },
                { label: "Poland", value: "PL" },
                { label: "Portugal", value: "PT" },
                { label: "Republic of the Philippines", value: "PH" },
                { label: "Russia", value: "RU" },
                { label: "Saudi Arabia", value: "SA" },
                { label: "South Africa", value: "ZA" },
                { label: "Spain", value: "ES" },
                { label: "Sweden", value: "SE" },
                { label: "Switzerland", value: "CH" },
                { label: "Taiwan", value: "TW" },
                { label: "Turkey", value: "TR" },
                { label: "United Kingdom", value: "GB" },
                { label: "United States", value: "US" },
                { label: "All Regions", value: "ALL" },
            ],
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "all",
        DESCRIPTION: "Enter the country code to get search results for.",
        ICON_NAME: "Flag",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: "US",
        VALIDATION: null,
    },
    get_content_filter_removal_details: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get list of objects that were ignored during parsing page based on settings.",
        ICON_NAME: "RemoveFormatting",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_links: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get all the links from the scraped page. Links are categorized as internal, external, document, archive etc.",
        ICON_NAME: "Link",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_main_image: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION:
            "Get main image for the scraped page. Main image is usually the biggest or most relevant image on the page. Extracted from OG metadata or other meta tags.",
        ICON_NAME: "Image",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    get_organized_data: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get organized json content for the scrape page.",
        ICON_NAME: "Braces",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_overview: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION:
            "Get overview content for the scraped page. Overview contains basic information for the page like title, other metadata etc.",
        ICON_NAME: "Target",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_structured_data: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get structured data json content for the scrape page.",
        ICON_NAME: "Braces",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_text_data: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Get parsed text data for the scraped page. Generated from 'organized data'.",
        ICON_NAME: "LetterText",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_anchors: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include hyperlinks in scraped text",
        ICON_NAME: "ExternalLink",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_highlighting_markers: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include /exclude highlighting markers like 'underline', 'list markers' etc... from text.",
        ICON_NAME: "Underline",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    include_media: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include media content in text output.",
        ICON_NAME: "TvMinimalPlay",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_media_description: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include media description (media caption etc.) in text. Triggers when include_media is turned on.",
        ICON_NAME: "WholeWord",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_media_links: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include media links (image , video, audio) in text. Triggered when include_media is turned on.",
        ICON_NAME: "Link",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    keywords: {
        COMPONENT: "arrayField",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: null,
        DESCRIPTION: "Enter the queries to search for.",
        ICON_NAME: "WholeWord",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: ["apple stock price", "apple stock best time to buy", "apple stock forecast"],
        VALIDATION: null,
    },
    search_type: {
        COMPONENT: "RadioGroup",
        COMPONENT_PROPS: {
            options: [
                { label: "All", value: "all" },
                { label: "Web", value: "web" },
                { label: "News", value: "news" },
            ],
            orientation: "vertical",
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "all",
        DESCRIPTION: "Kind of search type to scrape, 'web', 'news', or 'all'.",
        ICON_NAME: "Rss",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    total_results_per_keyword: {
        COMPONENT: "slider",
        COMPONENT_PROPS: { min: 10, max: 30, step: 1, range: "False" },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 10,
        DESCRIPTION: "Enter the number of results per keyword to get.",
        ICON_NAME: "SlidersHorizontal",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: 10,
        VALIDATION: null,
    },
};

export const OVERRIDE_DEFINITION: Schema = {
    model_override: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "",
        DESCRIPTION: "Enter the id of the model to use.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    other_overrides: {
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "object",
        DEFAULT: {},
        DESCRIPTION: "Some additional overrides may be provided for processing.",
        ICON_NAME: "Parentheses",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    processor_overrides: {
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "object",
        DEFAULT: {},
        DESCRIPTION: "This is a complex field that requires a pre-determined structure to get specific processors and extractors.",
        ICON_NAME: "Parentheses",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const RUN_COMPILED_RECIPE: Schema = {
    compiled_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the id of the compiled recipe to run.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    compiled_recipe: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the compiled recipe to run.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    recipe_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the id of the recipe to run.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "e2049ce6-c340-4ff7-987e-deb24a977853",
        VALIDATION: null,
    },
    stream: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Whether the response should be streamed or sent all at once.",
        ICON_NAME: "Check",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const GET_LOG_FILES: Schema = {};

export const PAUSE_WORKFLOW: Schema = {
    instance_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the instance ID of the workflow to operate on.",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        VALIDATION: null,
    },
};

export const CONVERT_RECIPE_TO_CHAT: Schema = {
    chat_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the ID of the chat to be converted to a recipe.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const GET_PYTHON_DICTS: Schema = {
    dict_variable_name: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the variable name of the dictionary to be created.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    raw_markdown: {
        COMPONENT: "textarea",
        COMPONENT_PROPS: { rows: 10 },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const ACTIVATE_PENDING_FUNCTION: Schema = {
    function_instance_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the function instance ID to manage.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "func-12345678",
        VALIDATION: null,
    },
    instance_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the workflow instance ID.",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        VALIDATION: null,
    },
};

export const GET_ALL_LOGS: Schema = {
    filename: {
        COMPONENT: "Select",
        COMPONENT_PROPS: {
            options: [
                { value: "application logs", label: "Application Logs" },
                { value: "daphne logs", label: "Daphne Logs" },
                { value: "local logs", label: "Local Logs" },
            ],
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "application logs",
        DESCRIPTION: "The log file to read all lines from (Application Logs, Daphne Logs, or Local Logs).",
        ICON_NAME: "Document",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const USER_INPUT_DEFINITION: Schema = {
    broker_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the broker ID for this user input.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: "8fa5f0ba-5145-48a9-ace5-f5115b6b4b5c",
        VALIDATION: null,
    },
    value: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the value for this user input.",
        ICON_NAME: "LetterText",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: "I own an Electronics Recycling Company",
        VALIDATION: null,
    },
};

export const CREATE_WC_INJURY: Schema = {
    digit: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 0 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 0,
        DESCRIPTION: "Digit impairment rating",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    impairment_definition_id: {
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "ID of the impairment definition",
        ICON_NAME: "FileText",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    industrial: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 0, max: 100 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 100,
        DESCRIPTION: "Industrial apportionment percentage",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    le: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 0 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 0,
        DESCRIPTION: "Lower extremity impairment rating",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    pain: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 0 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 0,
        DESCRIPTION: "Pain add-on rating",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    report_id: {
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "ID of the associated report",
        ICON_NAME: "FileText",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    side: {
        COMPONENT: "Select",
        COMPONENT_PROPS: {
            options: [
                { label: "Left", value: "left" },
                { label: "Right", value: "right" },
                { label: "Bilateral", value: "bilateral" },
            ],
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Side of the injury (left, right, or bilateral)",
        ICON_NAME: "ArrowLeftRight",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: "validate_wc_side",
    },
    ue: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 0 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 0,
        DESCRIPTION: "Upper extremity impairment rating",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    wpi: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 0, max: 100 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 0,
        DESCRIPTION: "Whole person impairment percentage",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const GET_ALL_CODE_BLOCKS: Schema = {
    raw_markdown: {
        COMPONENT: "textarea",
        COMPONENT_PROPS: { rows: 10 },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    remove_comments: {
        COMPONENT: "Check",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Whether to remove comments from the code blocks.",
        ICON_NAME: "Check",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const SAMPLE_SERVICE: Schema = {
    checkbox_field: {
        COMPONENT: "Checkbox",
        COMPONENT_PROPS: { indeterminate: "False" },
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Agree to the terms and conditions",
        ICON_NAME: "CheckSquare",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    file_field: {
        COMPONENT: "FileUpload",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "",
        DESCRIPTION: "Upload a document (PDF, DOCX, or TXT)",
        ICON_NAME: "File",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: "sample-document.pdf",
        VALIDATION: null,
    },
    files_field: {
        COMPONENT: "MultiFileUpload",
        COMPONENT_PROPS: { accept: "image/*", maxfiles: 5, maxsize: 2000000 },
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Upload up to 5 images (max 2MB each)",
        ICON_NAME: "Files",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: ["image1.jpg", "image2.png"],
        VALIDATION: null,
    },
    json_field: {
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: { spellCheck: "False" },
        CONVERSION: null,
        DATA_TYPE: "object",
        DEFAULT: { key: "value" },
        DESCRIPTION: "Edit JSON configuration",
        ICON_NAME: "Code",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: { test: "data", nested: { value: 123 } },
        VALIDATION: null,
    },
    radio_field: {
        COMPONENT: "RadioGroup",
        COMPONENT_PROPS: {
            options: [
                { label: "Radio Option 1", value: "radio1" },
                { label: "Radio Option 2", value: "radio2" },
                { label: "Radio Option 3", value: "radio3" },
            ],
            orientation: "vertical",
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "radio1",
        DESCRIPTION: "Choose one of the options",
        ICON_NAME: "Radio",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "radio2",
        VALIDATION: null,
    },
    select_field: {
        COMPONENT: "Select",
        COMPONENT_PROPS: {
            options: [
                { label: "Option 1", value: "option1" },
                { label: "Option 2", value: "option2" },
                { label: "Option 3", value: "option3" },
            ],
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "option2",
        DESCRIPTION: "Select an option from the dropdown",
        ICON_NAME: "List",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "option3",
        VALIDATION: null,
    },
    slider_field: {
        COMPONENT: "slider",
        COMPONENT_PROPS: { min: 0, max: 100, step: 1, range: "False" },
        CONVERSION: null,
        DATA_TYPE: "number",
        DEFAULT: 50,
        DESCRIPTION: "Adjust the value between 0 and 100",
        ICON_NAME: "Sliders",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: 75,
        VALIDATION: null,
    },
    switch_field: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: { size: "default" },
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Enable or disable this feature",
        ICON_NAME: "ToggleLeft",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    textarea_field: {
        COMPONENT: "Textarea",
        COMPONENT_PROPS: { rows: 6, maxLength: 500, placeholder: "Enter your detailed description here...", resize: "vertical" },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "",
        DESCRIPTION: "Provide a detailed description (max 500 characters)",
        ICON_NAME: "FileText",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: "This is a sample text that would be used in test mode.",
        VALIDATION: null,
    },
};

export const EDIT_WC_CLAIM: Schema = {
    age_at_doi: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 0, max: 120 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: null,
        DESCRIPTION: "Updated age at the date of injury",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    applicant_name: {
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Updated full name of the applicant",
        ICON_NAME: "User",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    claim_id: {
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "ID of the claim to edit",
        ICON_NAME: "FileText",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    date_of_birth: {
        COMPONENT: "TextInput",
        COMPONENT_PROPS: { placeholder: "YYYY-MM-DD" },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Updated date of birth in YYYY-MM-DD format",
        ICON_NAME: "Calendar",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: "validate_date",
    },
    date_of_injury: {
        COMPONENT: "TextInput",
        COMPONENT_PROPS: { placeholder: "YYYY-MM-DD" },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Updated date of injury in YYYY-MM-DD format",
        ICON_NAME: "Calendar",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: "validate_date",
    },
    occupational_code: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: null,
        DESCRIPTION: "Updated occupational code",
        ICON_NAME: "Briefcase",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    weekly_earnings: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { step: 0.01, min: 0 },
        CONVERSION: null,
        DATA_TYPE: "float",
        DEFAULT: null,
        DESCRIPTION: "Updated weekly earnings in dollars",
        ICON_NAME: "DollarSign",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const GET_ALL_PYTHON_FUNCTION_DOCSTRINGS: Schema = {
    raw_markdown: {
        COMPONENT: "textarea",
        COMPONENT_PROPS: { rows: 10 },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const RESUME_WORKFLOW: Schema = {
    instance_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the instance ID of the workflow to operate on.",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        VALIDATION: null,
    },
};

export const GET_SEGMENTS: Schema = {
    raw_markdown: {
        COMPONENT: "textarea",
        COMPONENT_PROPS: { rows: 10 },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    segment_type: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the type of segment to be extracted.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: "validate_md_segment_type",
    },
};

export const TAIL_LOGS: Schema = {
    filename: {
        COMPONENT: "Select",
        COMPONENT_PROPS: {
            options: [
                { value: "application logs", label: "Application Logs" },
                { value: "daphne logs", label: "Daphne Logs" },
                { value: "local logs", label: "Local Logs" },
            ],
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "application logs",
        DESCRIPTION: "The log file to tail (Application Logs, Daphne Logs, or Local Logs).",
        ICON_NAME: "Document",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    interval: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "float",
        DEFAULT: 1.0,
        DESCRIPTION: "The interval (in seconds) between checks for new log lines.",
        ICON_NAME: "Clock",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const GET_RECIPE: Schema = {
    recipe_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the id of the recipe to get.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "e2049ce6-c340-4ff7-987e-deb24a977853",
        VALIDATION: null,
    },
};

export const GET_WORKFLOW_STATUS: Schema = {
    instance_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the instance ID of the workflow to operate on.",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        VALIDATION: null,
    },
};

export const CONVERT_NORMALIZED_DATA_TO_USER_DATA: Schema = {
    data: {
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "object",
        DEFAULT: null,
        DESCRIPTION: "Enter a JSON object with normalized keys and values.",
        ICON_NAME: "Grid2x2Plus",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    table_description: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the description of the table to be created.",
        ICON_NAME: "Text",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    table_name: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the name of the table to be created.",
        ICON_NAME: "Baseline",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const PREP_CONVERSATION: Schema = {
    conversation_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the ID of the conversation to be fetched, cached and ready for fast usage.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const GET_ALL_PYTHON_COMMENTS: Schema = {
    raw_markdown: {
        COMPONENT: "textarea",
        COMPONENT_PROPS: { rows: 10 },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const GET_CODE_BLOCKS_BY_LANGUAGE: Schema = {
    language: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the language of the code blocks to be extracted.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: "validate_md_code_language",
    },
    raw_markdown: {
        COMPONENT: "textarea",
        COMPONENT_PROPS: { rows: 10 },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    remove_comments: {
        COMPONENT: "Check",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Whether to remove comments from the code blocks.",
        ICON_NAME: "Check",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const PING_WORKFLOW: Schema = {
    instance_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the instance ID of the workflow to operate on.",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        VALIDATION: null,
    },
};

export const BROKER_DEFINITION: Schema = {
    name: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the name of the broker.",
        ICON_NAME: "User",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the id of the broker.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "5d8c5ed2-5a84-476a-9258-6123a45f996a",
        VALIDATION: null,
    },
    value: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the value of the broker.",
        ICON_NAME: "LetterText",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: "I have an app that let's users create task lists from audio files.",
        VALIDATION: null,
    },
    ready: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: "true",
        DESCRIPTION: "Whether the broker's value is DIRECTLY ready exactly as it is.",
        ICON_NAME: "Check",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const GET_SECTION_GROUPS: Schema = {
    raw_markdown: {
        COMPONENT: "textarea",
        COMPONENT_PROPS: { rows: 10 },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    section_group_type: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the type of section group to be extracted.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: "validate_md_section_group_type",
    },
};

export const GET_STRUCTURED_DATA: Schema = {
    raw_markdown: {
        COMPONENT: "textarea",
        COMPONENT_PROPS: { rows: 10 },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const GET_NEEDED_RECIPE_BROKERS: Schema = {
    recipe_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the ID of the recipe to be fetched, cached and ready for fast usage.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "e2049ce6-c340-4ff7-987e-deb24a977853",
        VALIDATION: null,
    },
    version: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the version of the recipe or blank to get the latest version.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const SET_FUNCTION_PENDING: Schema = {
    function_instance_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the function instance ID to manage.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "func-12345678",
        VALIDATION: null,
    },
    instance_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the workflow instance ID.",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        VALIDATION: null,
    },
};

export const REMOVE_FIRST_AND_LAST_PARAGRAPH: Schema = {
    raw_markdown: {
        COMPONENT: "textarea",
        COMPONENT_PROPS: { rows: 10 },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const GET_PENDING_FUNCTIONS: Schema = {
    instance_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the workflow instance ID to get pending functions for.",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        VALIDATION: null,
    },
};

export const QUICK_SCRAPE: Schema = {
    anchor_size: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 10, max: 500 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 100,
        DESCRIPTION: "Size of hyperlinks in scraped text",
        ICON_NAME: "Ruler",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: 100,
        VALIDATION: null,
    },
    get_content_filter_removal_details: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get list of objects that were ignored during parsing page based on settings.",
        ICON_NAME: "RemoveFormatting",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_links: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get all the links from the scraped page. Links are categorized as internal, external, document, archive etc.",
        ICON_NAME: "Link",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_main_image: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION:
            "Get main image for the scraped page. Main image is usually the biggest or most relevant image on the page. Extracted from OG metadata or other meta tags.",
        ICON_NAME: "Image",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    get_organized_data: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get organized json content for the scrape page.",
        ICON_NAME: "Braces",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_overview: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION:
            "Get overview content for the scraped page. Overview contains basic information for the page like title, other metadata etc.",
        ICON_NAME: "Target",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_structured_data: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Get structured data json content for the scrape page.",
        ICON_NAME: "Braces",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    get_text_data: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Get parsed text data for the scraped page. Generated from 'organized data'.",
        ICON_NAME: "LetterText",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_anchors: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include hyperlinks in scraped text",
        ICON_NAME: "ExternalLink",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_highlighting_markers: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include /exclude highlighting markers like 'underline', 'list markers' etc... from text.",
        ICON_NAME: "Underline",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: false,
        VALIDATION: null,
    },
    include_media: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include media content in text output.",
        ICON_NAME: "TvMinimalPlay",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_media_description: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include media description (media caption etc.) in text. Triggers when include_media is turned on.",
        ICON_NAME: "WholeWord",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    include_media_links: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Include media links (image , video, audio) in text. Triggered when include_media is turned on.",
        ICON_NAME: "Link",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    urls: {
        COMPONENT: "arrayField",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: null,
        DESCRIPTION: "Enter the urls to be scraped.",
        ICON_NAME: "Link",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: ["https://en.wikipedia.org/wiki/Donald_Trump", "https://titaniumsuccess.com/arman-sadeghi/business-coach/"],
        VALIDATION: null,
    },
};

export const EDIT_WC_INJURY: Schema = {
    digit: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 0 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: null,
        DESCRIPTION: "Updated digit impairment rating",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    industrial: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 0, max: 100 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: null,
        DESCRIPTION: "Updated industrial apportionment percentage",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    injury_id: {
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "ID of the injury to edit",
        ICON_NAME: "FileText",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    le: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 0 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: null,
        DESCRIPTION: "Updated lower extremity impairment rating",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    pain: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 0 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: null,
        DESCRIPTION: "Updated pain add-on rating",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    side: {
        COMPONENT: "Select",
        COMPONENT_PROPS: {
            options: [
                { label: "Left", value: "left" },
                { label: "Right", value: "right" },
                { label: "Bilateral", value: "bilateral" },
            ],
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Updated side of the injury (left, right, or bilateral)",
        ICON_NAME: "ArrowLeftRight",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: "validate_wc_side",
    },
    ue: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 0 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: null,
        DESCRIPTION: "Updated upper extremity impairment rating",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    wpi: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: { min: 0, max: 100 },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: null,
        DESCRIPTION: "Updated whole person impairment percentage",
        ICON_NAME: "Hash",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const GET_SECTION_BLOCKS: Schema = {
    raw_markdown: {
        COMPONENT: "textarea",
        COMPONENT_PROPS: { rows: 10 },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    section_type: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the type of section to be extracted.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: "validate_md_section_type",
    },
};

export const NODE_DEFINITION: Schema = {
    additional_dependencies: {
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION:
            "Additional broker IDs that must be True before this step can execute. If a target broker ID is provided, that broker will also get the value for this source broker ID. If no target is provided, then the system will just wait for this source broker ID to be ready.",
        ICON_NAME: "Link",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: [{ source: "8fa5f0ba-5145-48a9-ace5-f5115b6b4b5c" }],
        VALIDATION: null,
    },
    arg_mapping: {
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION:
            "Mapping of function arguments to broker IDs. Mapped arguments will get the value of the source brokers, as soon as the they are ready.",
        ICON_NAME: "ArrowRight",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: [
            { arg_name: "first_number", broker_id: "64ba09cd-b5dd-4a58-a55e-cf0b1c1f5d3a" },
            { arg_name: "second_number", broker_id: "e87ef871-1b3d-4272-8068-a66fead0c75f" },
        ],
        VALIDATION: null,
    },
    arg_overrides: {
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION:
            "Override the initial values for the arguments of this function. If all values for the function are defined in overrides, and all 'required' arguments are set to 'ready', then this function will instantly execute when the workflow starts.",
        ICON_NAME: "Edit",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: [
            { name: "recipe_id", default_value: "f652c807-c4c2-4f64-86f6-d7233e057bb8", ready: true },
            { name: "latest_version", default_value: true, ready: true },
        ],
        VALIDATION: null,
    },
    execution_required: {
        COMPONENT: "checkbox",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION:
            "Whether this step requires execution. If set to False, it will still execute when it is ready, but the workflow will not fail if it does not complete.",
        ICON_NAME: "Play",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: true,
        VALIDATION: null,
    },
    function_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "The ID of the function to execute.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "2ac5576b-d1ab-45b1-ab48-4e196629fdd8",
        VALIDATION: null,
    },
    function_type: {
        COMPONENT: "select",
        COMPONENT_PROPS: {
            options: [
                { value: "registered_function", label: "Registered Function" },
                { value: "workflow_recipe_executor", label: "Recipe Executor" },
            ],
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "The type of function to execute - determines which system to use.",
        ICON_NAME: "Settings",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "registered_function",
        VALIDATION: null,
    },
    return_broker_overrides: {
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Include additional broker IDs where the returns of this function will be published.",
        ICON_NAME: "ArrowLeft",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: [],
        VALIDATION: null,
    },
    status: {
        COMPONENT: "select",
        COMPONENT_PROPS: {
            options: [
                { value: "pending", label: "Pending" },
                { value: "initialized", label: "Initialized" },
                { value: "ready_to_execute", label: "Ready to Execute" },
                { value: "executing", label: "Executing" },
                { value: "execution_complete", label: "Execution Complete" },
                { value: "execution_failed", label: "Execution Failed" },
            ],
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "pending",
        DESCRIPTION: "The initial status for the step. It should typically be 'pending' for normal execution flow.",
        ICON_NAME: "Clock",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: "pending",
        VALIDATION: null,
    },
    step_name: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "A human-readable name for this step.",
        ICON_NAME: "Tag",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: "Get app ideas from occupation",
        VALIDATION: null,
    },
};

export const MIC_CHECK: Schema = {
    mic_check_message: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "Broker sync mic check",
        DESCRIPTION: "Test message for broker sync service connectivity",
        ICON_NAME: "Mic",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const SEARCH_KEYWORDS: Schema = {
    country_code: {
        COMPONENT: "Select",
        COMPONENT_PROPS: {
            options: [
                { label: "Argentina", value: "AR" },
                { label: "Australia", value: "AU" },
                { label: "Austria", value: "AT" },
                { label: "Belgium", value: "BE" },
                { label: "Brazil", value: "BR" },
                { label: "Canada", value: "CA" },
                { label: "Chile", value: "CL" },
                { label: "Denmark", value: "DK" },
                { label: "Finland", value: "FI" },
                { label: "France", value: "FR" },
                { label: "Germany", value: "DE" },
                { label: "Hong Kong", value: "HK" },
                { label: "India", value: "IN" },
                { label: "Indonesia", value: "ID" },
                { label: "Italy", value: "IT" },
                { label: "Japan", value: "JP" },
                { label: "Korea", value: "KR" },
                { label: "Malaysia", value: "MY" },
                { label: "Mexico", value: "MX" },
                { label: "Netherlands", value: "NL" },
                { label: "New Zealand", value: "NZ" },
                { label: "Norway", value: "NO" },
                { label: "Peoples Republic of China", value: "CN" },
                { label: "Poland", value: "PL" },
                { label: "Portugal", value: "PT" },
                { label: "Republic of the Philippines", value: "PH" },
                { label: "Russia", value: "RU" },
                { label: "Saudi Arabia", value: "SA" },
                { label: "South Africa", value: "ZA" },
                { label: "Spain", value: "ES" },
                { label: "Sweden", value: "SE" },
                { label: "Switzerland", value: "CH" },
                { label: "Taiwan", value: "TW" },
                { label: "Turkey", value: "TR" },
                { label: "United Kingdom", value: "GB" },
                { label: "United States", value: "US" },
                { label: "All Regions", value: "ALL" },
            ],
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "all",
        DESCRIPTION: "Enter the country code to get search results for.",
        ICON_NAME: "Flag",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: "US",
        VALIDATION: null,
    },
    keywords: {
        COMPONENT: "arrayField",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: null,
        DESCRIPTION: "Enter the queries to search for.",
        ICON_NAME: "WholeWord",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: ["apple stock price", "apple stock best time to buy", "apple stock forecast"],
        VALIDATION: null,
    },
    search_type: {
        COMPONENT: "RadioGroup",
        COMPONENT_PROPS: {
            options: [
                { label: "All", value: "all" },
                { label: "Web", value: "web" },
                { label: "News", value: "news" },
            ],
            orientation: "vertical",
        },
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "All",
        DESCRIPTION: "Kind of search type to scrape, 'web', 'news', or 'all'.",
        ICON_NAME: "Rss",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    total_results_per_keyword: {
        COMPONENT: "slider",
        COMPONENT_PROPS: { min: 1, max: 100, step: 1, range: "False" },
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 5,
        DESCRIPTION:
            "Enter the number of results per keyword to get. Note: Total results per keyword may deviate from this number due to the search engine results.",
        ICON_NAME: "SlidersHorizontal",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: 5,
        VALIDATION: null,
    },
};

export const AI_CHAT: Schema = {
    conversation_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the conversation id.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
    message_object: {
        COMPONENT: "relatedObject",
        COMPONENT_PROPS: {},
        CONVERSION: "convert_message_object",
        DATA_TYPE: "object",
        DEFAULT: null,
        DESCRIPTION: "Enter the message object with message id, conversation id, content, role, type, and files.",
        ICON_NAME: "Messages",
        REFERENCE: MESSAGE_OBJECT_DEFINITION,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const PREPARE_BATCH_RECIPE: Schema = {
    broker_values: {
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        CONVERSION: "convert_broker_data",
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
        REFERENCE: BROKER_DEFINITION,
        REQUIRED: false,
        VALIDATION: null,
    },
    chat_configs: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Enter the chat configs to be used in the recipe.",
        ICON_NAME: "Key",
        REFERENCE: CHAT_CONFIG_DEFINITION,
        REQUIRED: true,
        VALIDATION: null,
    },
    max_count: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 3,
        DESCRIPTION: "Enter the maximum number of chats to be created.",
        ICON_NAME: "Sigma",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const RUN_BATCH_RECIPE: Schema = {
    broker_values: {
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        CONVERSION: "convert_broker_data",
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
        REFERENCE: BROKER_DEFINITION,
        REQUIRED: false,
        VALIDATION: null,
    },
    chat_configs: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Enter the chat configs to be used in the recipe.",
        ICON_NAME: "Key",
        REFERENCE: CHAT_CONFIG_DEFINITION,
        REQUIRED: true,
        VALIDATION: null,
    },
    max_count: {
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "integer",
        DEFAULT: 3,
        DESCRIPTION: "Enter the maximum number of chats to be created.",
        ICON_NAME: "Sigma",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const RUN_CHAT_RECIPE: Schema = {
    allow_default_values: {
        COMPONENT: "Checkbox",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Determines if the default values can be used for brokers which are not provided or are not ready.",
        ICON_NAME: "SwatchBook",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    allow_removal_of_unmatched: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION:
            "Determines if brokers which are not provided or are not ready should be removed from the input content prior to the call.",
        ICON_NAME: "BadgeX",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    broker_values: {
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        CONVERSION: "convert_broker_data",
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
        REFERENCE: BROKER_DEFINITION,
        REQUIRED: false,
        VALIDATION: null,
    },
    include_classified_output: {
        COMPONENT: "Checkbox",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Determines if the classified output should be included in the response.",
        ICON_NAME: "Shapes",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    model_override: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the ID of the AI Model or leave blank to use the default model.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    prepare_for_next_call: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Determines if the results should be saved as a new conversation.",
        ICON_NAME: "FastForward ",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    recipe_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the ID of the recipe to be fetched, cached and ready for fast usage.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "e2049ce6-c340-4ff7-987e-deb24a977853",
        VALIDATION: null,
    },
    save_new_conversation: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: false,
        DESCRIPTION: "Determines if the results should be saved as a new conversation.",
        ICON_NAME: "Save",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    tools_override: {
        COMPONENT: "arrayField",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Enter a list of tool names to be used in the call, which will override the tools defined in the recipe.",
        ICON_NAME: "PocketKnife",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    user_id: {
        COMPONENT: "",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: "socket_internal_user_id",
        DESCRIPTION: "",
        ICON_NAME: "",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
    version: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the version of the recipe or blank to get the latest version.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const RUN_RECIPE: Schema = {
    broker_values: {
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        CONVERSION: "convert_broker_data",
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
        REFERENCE: BROKER_DEFINITION,
        REQUIRED: false,
        VALIDATION: null,
    },
    overrides: {
        COMPONENT: "relatedObject",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "object",
        DEFAULT: null,
        DESCRIPTION:
            "Enter the overrides to be applied. These will override the 'settings' for the recipe, if overrides are allowed for the recipe.",
        ICON_NAME: "Parentheses",
        REFERENCE: OVERRIDE_DEFINITION,
        REQUIRED: false,
        VALIDATION: null,
    },
    recipe_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the id of the recipe to run.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "e2049ce6-c340-4ff7-987e-deb24a977853",
        VALIDATION: null,
    },
    stream: {
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "boolean",
        DEFAULT: true,
        DESCRIPTION: "Whether the response should be streamed or sent all at once.",
        ICON_NAME: "Check",
        REFERENCE: null,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const RUN_RECIPE_TO_CHAT: Schema = {
    broker_values: {
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        CONVERSION: "convert_broker_data",
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
        REFERENCE: BROKER_DEFINITION,
        REQUIRED: false,
        VALIDATION: null,
    },
    chat_config: {
        COMPONENT: "relatedObject",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "object",
        DEFAULT: null,
        DESCRIPTION: "Enter the chat config to be used in the recipe.",
        ICON_NAME: "Settings",
        REFERENCE: CHAT_CONFIG_DEFINITION,
        REQUIRED: true,
        VALIDATION: null,
    },
};

export const START_WORKFLOW_BY_ID: Schema = {
    broker_values: {
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        CONVERSION: "convert_broker_data",
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
        REFERENCE: BROKER_DEFINITION,
        REQUIRED: false,
        VALIDATION: null,
    },
    user_inputs: {
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Enter user input values for the workflow (optional).",
        ICON_NAME: "User",
        REFERENCE: USER_INPUT_DEFINITION,
        REQUIRED: false,
        VALIDATION: null,
    },
    workflow_id: {
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "string",
        DEFAULT: null,
        DESCRIPTION: "Enter the ID of the workflow to start.",
        ICON_NAME: "Key",
        REFERENCE: null,
        REQUIRED: true,
        TEST_VALUE: "unknown-workflow-uuid",
        VALIDATION: null,
    },
};

export const EXECUTE_SINGLE_STEP: Schema = {
    broker_values: {
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        CONVERSION: "convert_broker_data",
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
        REFERENCE: BROKER_DEFINITION,
        REQUIRED: false,
        VALIDATION: null,
    },
    single_node: {
        COMPONENT: "relatedObject",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "object",
        DEFAULT: null,
        DESCRIPTION: "The step definition to execute as a single step.",
        ICON_NAME: "Play",
        REFERENCE: NODE_DEFINITION,
        REQUIRED: true,
        VALIDATION: null,
    },
    user_inputs: {
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "User input values for broker-mapped arguments (optional).",
        ICON_NAME: "User",
        REFERENCE: USER_INPUT_DEFINITION,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const START_WORKFLOW_WITH_STRUCTURE: Schema = {
    broker_values: {
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        CONVERSION: "convert_broker_data",
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
        REFERENCE: BROKER_DEFINITION,
        REQUIRED: false,
        VALIDATION: null,
    },
    nodes: {
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "The steps to execute in the workflow.",
        ICON_NAME: "Play",
        REFERENCE: NODE_DEFINITION,
        REQUIRED: true,
        VALIDATION: null,
    },
    relays: {
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION:
            "This is used to generate a relay between a single source broker and  a list of target brokers, which will all get this value.",
        ICON_NAME: "ArrowRightLeft",
        REFERENCE: null,
        REQUIRED: false,
        TEST_VALUE: [{ source: "2ca25554-0db3-47e6-81c1-80b3d792b1c6", targets: ["bed0f380-3f1a-4833-9f8e-492da264f12d"] }],
        VALIDATION: null,
    },
    user_inputs: {
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        CONVERSION: null,
        DATA_TYPE: "array",
        DEFAULT: [],
        DESCRIPTION: "Enter user input values for the workflow (optional - can also be included in workflow definition).",
        ICON_NAME: "User",
        REFERENCE: USER_INPUT_DEFINITION,
        REQUIRED: false,
        VALIDATION: null,
    },
};

export const SERVICE_TASKS = {
    ai_chat_service: {
        add_recipe: ADD_RECIPE,
        convert_normalized_data_to_user_data: CONVERT_NORMALIZED_DATA_TO_USER_DATA,
        convert_recipe_to_chat: CONVERT_RECIPE_TO_CHAT,
        get_compiled_recipe: GET_COMPILED_RECIPE,
        get_needed_recipe_brokers: GET_NEEDED_RECIPE_BROKERS,
        get_recipe: GET_RECIPE,
        mic_check: MIC_CHECK,
        prepare_batch_recipe: PREPARE_BATCH_RECIPE,
        run_batch_recipe: RUN_BATCH_RECIPE,
        run_compiled_recipe: RUN_COMPILED_RECIPE,
        run_recipe: RUN_RECIPE,
        run_recipe_to_chat: RUN_RECIPE_TO_CHAT,
    },
    california_worker_compensation_service: {
        calculate_wc_ratings: CALCULATE_WC_RATINGS,
        create_wc_claim: CREATE_WC_CLAIM,
        create_wc_injury: CREATE_WC_INJURY,
        create_wc_report: CREATE_WC_REPORT,
        edit_wc_claim: EDIT_WC_CLAIM,
        edit_wc_injury: EDIT_WC_INJURY,
        mic_check: MIC_CHECK,
    },
    chat_service: {
        ai_chat: AI_CHAT,
        get_needed_recipe_brokers: GET_NEEDED_RECIPE_BROKERS,
        mic_check: MIC_CHECK,
        prep_conversation: PREP_CONVERSATION,
        run_chat_recipe: RUN_CHAT_RECIPE,
    },
    log_service: {
        get_all_logs: GET_ALL_LOGS,
        get_log_files: GET_LOG_FILES,
        read_logs: READ_LOGS,
        stop_tail_logs: STOP_TAIL_LOGS,
        tail_logs: TAIL_LOGS,
    },
    markdown_service: {
        classify_markdown: CLASSIFY_MARKDOWN,
        get_all_code_blocks: GET_ALL_CODE_BLOCKS,
        get_all_python_class_docstrings: GET_ALL_PYTHON_CLASS_DOCSTRINGS,
        get_all_python_comments: GET_ALL_PYTHON_COMMENTS,
        get_all_python_function_docstrings: GET_ALL_PYTHON_FUNCTION_DOCSTRINGS,
        get_code_blocks_by_language: GET_CODE_BLOCKS_BY_LANGUAGE,
        get_python_dicts: GET_PYTHON_DICTS,
        get_section_blocks: GET_SECTION_BLOCKS,
        get_section_groups: GET_SECTION_GROUPS,
        get_segments: GET_SEGMENTS,
        get_structured_data: GET_STRUCTURED_DATA,
        mic_check: MIC_CHECK,
        remove_first_and_last_paragraph: REMOVE_FIRST_AND_LAST_PARAGRAPH,
    },
    sample_service: {
        sample_service: SAMPLE_SERVICE,
    },
    scraper_service_v2: {
        mic_check: MIC_CHECK,
        quick_scrape: QUICK_SCRAPE,
        quick_scrape_stream: QUICK_SCRAPE_STREAM,
        search_and_scrape: SEARCH_AND_SCRAPE,
        search_and_scrape_limited: SEARCH_AND_SCRAPE_LIMITED,
        search_keywords: SEARCH_KEYWORDS,
    },
    workflow_service: {
        activate_pending_function: ACTIVATE_PENDING_FUNCTION,
        cleanup_workflow: CLEANUP_WORKFLOW,
        execute_single_step: EXECUTE_SINGLE_STEP,
        get_pending_functions: GET_PENDING_FUNCTIONS,
        get_workflow_status: GET_WORKFLOW_STATUS,
        pause_workflow: PAUSE_WORKFLOW,
        ping_workflow: PING_WORKFLOW,
        resume_workflow: RESUME_WORKFLOW,
        set_function_pending: SET_FUNCTION_PENDING,
        start_workflow_by_id: START_WORKFLOW_BY_ID,
        start_workflow_with_structure: START_WORKFLOW_WITH_STRUCTURE,
    },
} as const;

export const AVAILABLE_NAMESPACES = {
    "/UserSession": "User Session",
    "/AdminSession": "Admin Session",
    "/Direct": "No Namespace",
    "/custom": "Custom Namespace",
} as const;

export type FieldType =
    | "input"
    | "textarea"
    | "switch"
    | "checkbox"
    | "slider"
    | "select"
    | "radiogroup"
    | "fileupload"
    | "multifileupload"
    | "jsoneditor";

export interface FieldOverride {
    type: FieldType;
    props?: Record<string, any>;
}

export type FieldOverrides = Record<string, FieldOverride>;

export const FIELD_OVERRIDES: FieldOverrides = {
    raw_markdown: {
        type: "textarea",
        props: {
            rows: 10,
        },
    },
};

export const SOCKET_TASKS: { [key: string]: Schema } = Object.entries(SERVICE_TASKS).reduce(
    (acc, [_, serviceTasks]) => ({
        ...acc,
        ...serviceTasks,
    }),
    {}
);

const toTitleCase = (str: string): string => {
    return str
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
};

export const getAvailableServices = (): Array<{ value: string; label: string }> => {
    return Object.keys(SERVICE_TASKS).map((key) => ({
        value: key,
        label: toTitleCase(key),
    }));
};

export const TASK_OPTIONS = Object.entries(SERVICE_TASKS).reduce((acc, [service, tasks]) => {
    acc[service] = Object.keys(tasks).map((task) => ({
        value: task,
        label: toTitleCase(task),
    }));
    return acc;
}, {} as Record<string, Array<{ value: string; label: string }>>);

export const getTasksForService = (service: string): Array<{ value: string; label: string }> => {
    return TASK_OPTIONS[service] || [];
};

export const getAvailableNamespaces = (): Array<{ value: string; label: string }> => {
    return Object.entries(AVAILABLE_NAMESPACES).map(([key, value]) => ({
        value: key,
        label: value,
    }));
};

export const getTaskSchema = (taskName: string): Schema | undefined => {
    return SOCKET_TASKS[taskName];
};

export const initializeTaskDataWithDefaults = (taskName: string): Record<string, any> => {
    const taskSchema = getTaskSchema(taskName);
    if (!taskSchema) {
        return {};
    }

    const taskData: Record<string, any> = {};

    Object.entries(taskSchema).forEach(([fieldName, fieldSpec]) => {
        if (fieldSpec.DEFAULT !== undefined) {
            taskData[fieldName] = fieldSpec.DEFAULT;
        }
    });

    return taskData;
};

export const validateTaskData = (taskName: string, taskData: Record<string, any>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const schema = getTaskSchema(taskName);

    if (!schema) {
        return { isValid: false, errors: [`No schema found for task '${taskName}'`] };
    }

    Object.entries(schema).forEach(([fieldName, fieldSpec]) => {
        const providedValue = taskData[fieldName];
        const isProvided = providedValue !== undefined && providedValue !== null;

        if (fieldSpec.REQUIRED && !isProvided) {
            errors.push(`Field '${fieldName}' is required but was not provided.`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
};

export const getFieldDefinition = (taskName: string, fieldPath: string, traverseNested: boolean = true): SchemaField | undefined => {
    const taskSchema = getTaskSchema(taskName);
    if (!taskSchema) {
        return undefined;
    }

    // Handle array notation in paths (e.g., "user_inputs[0].broker_id")
    // First, extract the base field name and any nested parts
    const normalizedPath = fieldPath.replace(/\[\d+\]/g, ""); // Remove array indices like [0]
    const pathParts = normalizedPath.split(".").filter((part) => part !== ""); // Split and filter empty parts

    // If not traversing nested fields, return the root field directly
    if (!traverseNested || pathParts.length === 1) {
        return taskSchema[pathParts[0]];
    }

    // Traverse the path for nested fields
    let currentSchema: Schema = taskSchema;
    let currentField: SchemaField | undefined;

    for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentField = currentSchema[part];
        if (!currentField) {
            return undefined; // Field not found
        }

        // If there's a REFERENCE and more parts to process, switch to the referenced schema
        if (currentField.REFERENCE && i < pathParts.length - 1) {
            if (!currentField.REFERENCE || typeof currentField.REFERENCE !== "object") {
                return undefined; // Invalid REFERENCE
            }
            currentSchema = currentField.REFERENCE as Schema;
        }
    }

    return currentField;
};

export const getAllFieldPaths = (taskName: string): string[] => {
    const taskSchema = getTaskSchema(taskName);
    if (!taskSchema) {
        return [];
    }

    const fieldPaths: string[] = [];

    const traverseSchema = (schema: Schema, prefix: string = "") => {
        Object.entries(schema).forEach(([fieldName, fieldDefinition]) => {
            const currentPath = prefix ? `${prefix}.${fieldName}` : fieldName;

            // Add the current field path
            fieldPaths.push(currentPath);

            // Handle nested objects via REFERENCE
            if (fieldDefinition.REFERENCE && typeof fieldDefinition.REFERENCE === "object") {
                if (fieldDefinition.DATA_TYPE === "array") {
                    // For arrays, append [index] to the path and traverse the referenced schema
                    const arrayItemPath = `${currentPath}[index]`;
                    traverseSchema(fieldDefinition.REFERENCE as Schema, arrayItemPath);
                } else {
                    // For non-array objects, traverse the referenced schema directly
                    traverseSchema(fieldDefinition.REFERENCE as Schema, currentPath);
                }
            }
        });
    };

    traverseSchema(taskSchema);
    return fieldPaths;
};

export interface FieldDefinitionInfo {
    path: string;
    dataType: string;
    defaultValue: any;
    reference?: Schema;
}

export const getFieldDefinitions = (taskName: string): FieldDefinitionInfo[] => {
    const taskSchema = getTaskSchema(taskName);
    if (!taskSchema) {
        return [];
    }

    const fieldDefinitions: FieldDefinitionInfo[] = [];

    const traverseSchema = (schema: Schema, prefix: string = "") => {
        Object.entries(schema).forEach(([fieldName, fieldDefinition]) => {
            const currentPath = prefix ? `${prefix}.${fieldName}` : fieldName;

            // Add field definition info
            fieldDefinitions.push({
                path: currentPath,
                dataType: fieldDefinition.DATA_TYPE,
                defaultValue: fieldDefinition.DEFAULT,
                reference: fieldDefinition.REFERENCE,
            });

            // Handle nested objects via REFERENCE
            if (fieldDefinition.REFERENCE && typeof fieldDefinition.REFERENCE === "object") {
                if (fieldDefinition.DATA_TYPE === "array") {
                    const arrayItemPath = `${currentPath}[index]`;
                    traverseSchema(fieldDefinition.REFERENCE as Schema, arrayItemPath);
                } else {
                    traverseSchema(fieldDefinition.REFERENCE as Schema, currentPath);
                }
            }
        });
    };

    traverseSchema(taskSchema);
    return fieldDefinitions;
};

// Define the eUUID function that was missing
const eUUID = (value: any): boolean => {
    // UUID regex pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return typeof value === "string" && uuidPattern.test(value);
};

export const validateTextLength = (value: any): boolean => {
    if (typeof value !== "string") {
        return false;
    }
    return value.length > 5;
};

export const validateMarkdown = (value: any): boolean => {
    if (typeof value !== "string") {
        return false;
    }
    // Check for common markdown patterns: headers, bold, italic, lists, links, or code
    const markdownRegex = /(#+\s|[-*+]\s|\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_|`.*?`|\[.*?\]\(.*?\))/;
    return markdownRegex.test(value);
};

export const validateWCSide = (value: any): boolean => {
    const validSides = ["left", "right", "default"];
    return typeof value === "string" && validSides.includes(value);
};

export const validateDate = (value: any): boolean => {
    if (typeof value !== "string") {
        return false;
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(value)) {
        return false;
    }

    try {
        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    } catch {
        return false;
    }
};

export const validToolNames = [
    "code_python_execute",
    "code_web_store_html",
    "code_fetcher_fetch",
    "api_news_fetch_headlines",
    "core_math_calculate",
    "core_web_search",
    "core_web_read_web_pages",
    "core_web_search_and_read",
    "data_sql_execute_query",
    "data_sql_list_tables",
    "data_sql_get_table_schema",
    "data_sql_create_user_generated_table_data",
    "text_analyze",
    "text_regex_extract",
];
export const validateToolNames = (value: any): boolean => {
    // Check if value is an array
    if (!Array.isArray(value)) {
        return false;
    }

    // Check if every item in the array is a string and exists in validToolNames
    return value.every((item) => typeof item === "string" && validToolNames.includes(item));
};

const validationFunctions: Record<string, (value: any) => boolean> = {
    eUUID,
    validateTextLength,
    validateMarkdown,
    validateToolNames,
};

export const isValidField = (
    taskName: string,
    fieldPath: string,
    value: any,
    traverseNested: boolean = true
): { isValid: boolean; errorMessage: string } => {
    const fieldDefinition = getFieldDefinition(taskName, fieldPath, traverseNested);
    if (!fieldDefinition) {
        return { isValid: false, errorMessage: `Field definition not found for ${fieldPath}` };
    }

    const isEmpty = value === null || value === undefined || value === "";

    if (!fieldDefinition.REQUIRED && isEmpty) {
        return { isValid: true, errorMessage: "" };
    }

    if (fieldDefinition.REQUIRED && isEmpty) {
        return { isValid: false, errorMessage: `${fieldPath} is required` };
    }

    const expectedType = fieldDefinition.DATA_TYPE;
    if (!isEmpty) {
        switch (expectedType) {
            case "string":
                if (typeof value !== "string") {
                    // Allow conversion from other types to string for components that need it
                }
                break;
            case "number":
            case "integer": // Add integer type
                const numValue = typeof value === "string" ? parseFloat(value) : value;
                if (typeof numValue !== "number" || isNaN(numValue) || (expectedType === "integer" && !Number.isInteger(numValue))) {
                    return { isValid: false, errorMessage: `Expected an ${expectedType} for ${fieldPath}, got ${typeof value}` };
                }
                break;
            case "boolean":
                if (typeof value !== "boolean") {
                    // Allow string representations of booleans
                    if (typeof value === "string" && (value === "true" || value === "false")) {
                        break;
                    }
                    return { isValid: false, errorMessage: `Expected a boolean for ${fieldPath}, got ${typeof value}` };
                }
                break;
            case "array":
                if (!Array.isArray(value)) {
                    return { isValid: false, errorMessage: `Expected an array for ${fieldPath}, got ${typeof value}` };
                }
                break;
            case "object":
                // Handle both actual objects and valid JSON strings using flexible parsing
                let objectValue = value;
                if (typeof value === "string") {
                    const result = flexibleJsonParse(value);
                    if (result.success) {
                        objectValue = result.data;
                    } else {
                        return {
                            isValid: false,
                            errorMessage: `Expected a valid JSON object for ${fieldPath}, got invalid JSON string: ${result.error}`,
                        };
                    }
                }

                if (typeof objectValue !== "object" || objectValue === null || Array.isArray(objectValue)) {
                    return { isValid: false, errorMessage: `Expected an object for ${fieldPath}, got ${typeof objectValue}` };
                }
                break;
            default:
                return { isValid: false, errorMessage: `Unknown data type ${expectedType} for ${fieldPath}` };
        }
    }

    if (!isEmpty && fieldDefinition.VALIDATION) {
        const validationFn = validationFunctions[fieldDefinition.VALIDATION];
        if (typeof validationFn === "function") {
            const validationResult = validationFn(value);
            if (!validationResult) {
                return {
                    isValid: false,
                    errorMessage: `Validation failed for ${fieldPath}: ${getValidationErrorMessage(fieldDefinition.VALIDATION, value)}`,
                };
            }
            return { isValid: true, errorMessage: "" };
        }
        return { isValid: false, errorMessage: `Validation function ${fieldDefinition.VALIDATION} not found for ${fieldPath}` };
    }

    return { isValid: true, errorMessage: "" };
};

// Helper to provide specific error messages for validation failures
const getValidationErrorMessage = (validationName: string, value: any): string => {
    switch (validationName) {
        case "eUUID":
            return `Expected a valid UUID, got "${value}"`;
        case "validateTextLength":
            return `Expected a string longer than 5 characters, got "${value}"`;
        case "validateMarkdown":
            return `Expected valid Markdown content, got "${value}"`;
        case "validateToolNames":
            return `Expected an array of valid tool names, got ${JSON.stringify(value)}`;
        default:
            return `Invalid value "${value}"`;
    }
};
