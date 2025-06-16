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


export const BROKER_DEFINITION: Schema = {
    name: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the name of the broker.",
        ICON_NAME: "User",
    },
    id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the broker.",
        ICON_NAME: "Key",
        TEST_VALUE: "5d8c5ed2-5a84-476a-9258-6123a45f996a",
    },
    value: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the value of the broker.",
        ICON_NAME: "LetterText",
        TEST_VALUE: "I have an app that let's users create task lists from audio files.",
    },
    ready: {
        REQUIRED: false,
        DEFAULT: "true",
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Whether the broker's value is DIRECTLY ready exactly as it is.",
        ICON_NAME: "Check",
    },
};

export const USER_INPUT_DEFINITION: Schema = {
    broker_id: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the broker ID for this user input.",
        ICON_NAME: "Key",
        TEST_VALUE: "8fa5f0ba-5145-48a9-ace5-f5115b6b4b5c",
    },
    value: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the value for this user input.",
        ICON_NAME: "LetterText",
        TEST_VALUE: "I own an Electronics Recycling Company",
    },
};

export const NODE_DEFINITION: Schema = {
    function_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "The ID of the function to execute.",
        ICON_NAME: "Key",
        TEST_VALUE: "2ac5576b-d1ab-45b1-ab48-4e196629fdd8",
    },
    function_type: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "select",
        COMPONENT_PROPS: {"options": [{"value": "registered_function", "label": "Registered Function"}, {"value": "workflow_recipe_executor", "label": "Recipe Executor"}]},
        DESCRIPTION: "The type of function to execute - determines which system to use.",
        ICON_NAME: "Settings",
        TEST_VALUE: "registered_function",
    },
    step_name: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "A human-readable name for this step.",
        ICON_NAME: "Tag",
        TEST_VALUE: "Get app ideas from occupation",
    },
    status: {
        REQUIRED: false,
        DEFAULT: "pending",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "select",
        COMPONENT_PROPS: {"options": [{"value": "pending", "label": "Pending"}, {"value": "initialized", "label": "Initialized"}, {"value": "ready_to_execute", "label": "Ready to Execute"}, {"value": "executing", "label": "Executing"}, {"value": "execution_complete", "label": "Execution Complete"}, {"value": "execution_failed", "label": "Execution Failed"}]},
        DESCRIPTION: "The initial status for the step. It should typically be 'pending' for normal execution flow.",
        ICON_NAME: "Clock",
        TEST_VALUE: "pending",
    },
    execution_required: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "checkbox",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Whether this step requires execution. If set to False, it will still execute when it is ready, but the workflow will not fail if it does not complete.",
        ICON_NAME: "Play",
        TEST_VALUE: true,
    },
    additional_dependencies: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Additional broker IDs that must be True before this step can execute. If a target broker ID is provided, that broker will also get the value for this source broker ID. If no target is provided, then the system will just wait for this source broker ID to be ready.",
        ICON_NAME: "Link",
        TEST_VALUE: [{"source": "8fa5f0ba-5145-48a9-ace5-f5115b6b4b5c"}],
    },
    arg_mapping: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Mapping of function arguments to broker IDs. Mapped arguments will get the value of the source brokers, as soon as the they are ready.",
        ICON_NAME: "ArrowRight",
        TEST_VALUE: [{"arg_name": "first_number", "broker_id": "64ba09cd-b5dd-4a58-a55e-cf0b1c1f5d3a"}, {"arg_name": "second_number", "broker_id": "e87ef871-1b3d-4272-8068-a66fead0c75f"}],
    },
    return_broker_overrides: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include additional broker IDs where the returns of this function will be published.",
        ICON_NAME: "ArrowLeft",
        TEST_VALUE: [],
    },
    arg_overrides: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Override the initial values for the arguments of this function. If all values for the function are defined in overrides, and all 'required' arguments are set to 'ready', then this function will instantly execute when the workflow starts.",
        ICON_NAME: "Edit",
        TEST_VALUE: [{"name": "recipe_id", "default_value": "f652c807-c4c2-4f64-86f6-d7233e057bb8", "ready": true}, {"name": "latest_version", "default_value": true, "ready": true}],
    },
};

export const MESSAGE_OBJECT_DEFINITION: Schema = {
    id: {
        REQUIRED: false,
        DEFAULT: "",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Enter the message id.",
    },
    conversation_id: {
        REQUIRED: false,
        DEFAULT: "",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Enter the conversation id.",
    },
    content: {
        REQUIRED: false,
        DEFAULT: "",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "textarea",
        COMPONENT_PROPS: {"rows": 10},
        ICON_NAME: "Text",
        DESCRIPTION: "Enter the message content.",
    },
    role: {
        REQUIRED: false,
        DEFAULT: "",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Select",
        COMPONENT_PROPS: {"options": [{"label": "User", "value": "user"}, {"label": "Assistant", "value": "assistant"}, {"label": "System", "value": "system"}, {"label": "Tool", "value": "tool"}]},
        ICON_NAME: "User",
        DESCRIPTION: "Enter the message role. (user, assistant, system, tool)",
    },
    type: {
        REQUIRED: false,
        DEFAULT: "",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Select",
        COMPONENT_PROPS: {"options": [{"label": "Text", "value": "text"}, {"label": "Tool Call", "value": "tool_call"}, {"label": "Mixed", "value": "mixed"}]},
        ICON_NAME: "Type",
        DESCRIPTION: "Enter the message type. (text, tool_call, mixed)",
    },
    files: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "MultiFileUpload",
        COMPONENT_PROPS: {},
        ICON_NAME: "Files",
        DESCRIPTION: "Public urls for files to be associated with the message.",
    },
    metadata: {
        REQUIRED: false,
        DEFAULT: {},
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        ICON_NAME: "Metadata",
        DESCRIPTION: "Metadata for the message.",
    },
};

export const OVERRIDE_DEFINITION: Schema = {
    model_override: {
        REQUIRED: false,
        DEFAULT: "",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the model to use.",
        ICON_NAME: "Key",
    },
    processor_overrides: {
        REQUIRED: false,
        DEFAULT: {},
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        DESCRIPTION: "This is a complex field that requires a pre-determined structure to get specific processors and extractors.",
        ICON_NAME: "Parentheses",
    },
    other_overrides: {
        REQUIRED: false,
        DEFAULT: {},
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Some additional overrides may be provided for processing.",
        ICON_NAME: "Parentheses",
    },
};

export const CHAT_CONFIG_DEFINITION: Schema = {
    recipe_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        TEST_VALUE: "e2049ce6-c340-4ff7-987e-deb24a977853",
        DESCRIPTION: "Enter the ID of the recipe to be fetched, cached and ready for fast usage.",
    },
    version: {
        REQUIRED: false,
        DEFAULT: "latest",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        TEST_VALUE: "latest",
        DESCRIPTION: "Enter the version of the recipe or blank to get the latest version.",
    },
    user_id: {
        REQUIRED: false,
        DEFAULT: "socket_internal_user_id",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "",
        COMPONENT_PROPS: {},
        ICON_NAME: "",
        DESCRIPTION: "",
    },
    prepare_for_next_call: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Determines if the results should be saved as a new conversation.",
    },
    save_new_conversation: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Determines if the results should be saved as a new conversation.",
    },
    include_classified_output: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Checkbox",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Determines if the classified output should be included in the response.",
    },
    model_override: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        TEST_VALUE: "10168527-4d6b-456f-ab07-a889223ba3a9",
        DESCRIPTION: "Enter the ID of the AI Model or leave blank to use the default model.",
    },
    tools_override: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "arrayField",
        COMPONENT_PROPS: {},
        ICON_NAME: "PocketKnife",
        DESCRIPTION: "Enter a list of tool names to be used in the call, which will override the tools defined in the recipe.",
    },
    allow_default_values: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Determines if the default values can be used for brokers which are not provided or are not ready.",
    },
    allow_removal_of_unmatched: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Checkbox",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Determines if brokers which are not provided or are not ready should be removed from the input content prior to the call.",
    },
};

export const GET_PENDING_FUNCTIONS: Schema = {
    instance_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the workflow instance ID to get pending functions for.",
        ICON_NAME: "Hash",
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    },
};

export const ACTIVATE_PENDING_FUNCTION: Schema = {
    instance_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the workflow instance ID.",
        ICON_NAME: "Hash",
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    },
    function_instance_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the function instance ID to manage.",
        ICON_NAME: "Key",
        TEST_VALUE: "func-12345678",
    },
};

export const SET_FUNCTION_PENDING: Schema = {
    instance_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the workflow instance ID.",
        ICON_NAME: "Hash",
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    },
    function_instance_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the function instance ID to manage.",
        ICON_NAME: "Key",
        TEST_VALUE: "func-12345678",
    },
};

export const CLEANUP_WORKFLOW: Schema = {
    instance_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the instance ID of the workflow to operate on.",
        ICON_NAME: "Hash",
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    },
};

export const RESUME_WORKFLOW: Schema = {
    instance_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the instance ID of the workflow to operate on.",
        ICON_NAME: "Hash",
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    },
};

export const PAUSE_WORKFLOW: Schema = {
    instance_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the instance ID of the workflow to operate on.",
        ICON_NAME: "Hash",
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    },
};

export const PING_WORKFLOW: Schema = {
    instance_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the instance ID of the workflow to operate on.",
        ICON_NAME: "Hash",
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    },
};

export const GET_WORKFLOW_STATUS: Schema = {
    instance_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the instance ID of the workflow to operate on.",
        ICON_NAME: "Hash",
        TEST_VALUE: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    },
};

export const EXECUTE_SINGLE_STEP: Schema = {
    single_node: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: NODE_DEFINITION,
        COMPONENT: "relatedObject",
        COMPONENT_PROPS: {},
        DESCRIPTION: "The step definition to execute as a single step.",
        ICON_NAME: "Play",
    },
    broker_values: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: "convert_broker_data",
        REFERENCE: BROKER_DEFINITION,
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
    },
    user_inputs: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: USER_INPUT_DEFINITION,
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        DESCRIPTION: "User input values for broker-mapped arguments (optional).",
        ICON_NAME: "User",
    },
};

export const START_WORKFLOW_BY_ID: Schema = {
    workflow_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the ID of the workflow to start.",
        ICON_NAME: "Key",
        TEST_VALUE: "unknown-workflow-uuid",
    },
    broker_values: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: "convert_broker_data",
        REFERENCE: BROKER_DEFINITION,
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
    },
    user_inputs: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: USER_INPUT_DEFINITION,
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter user input values for the workflow (optional).",
        ICON_NAME: "User",
    },
};

export const START_WORKFLOW_WITH_STRUCTURE: Schema = {
    nodes: {
        REQUIRED: true,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: NODE_DEFINITION,
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        DESCRIPTION: "The steps to execute in the workflow.",
        ICON_NAME: "Play",
    },
    broker_values: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: "convert_broker_data",
        REFERENCE: BROKER_DEFINITION,
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
    },
    user_inputs: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: USER_INPUT_DEFINITION,
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter user input values for the workflow (optional - can also be included in workflow definition).",
        ICON_NAME: "User",
    },
    relays: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        DESCRIPTION: "This is used to generate a relay between a single source broker and  a list of target brokers, which will all get this value.",
        ICON_NAME: "ArrowRightLeft",
        TEST_VALUE: [{"source": "2ca25554-0db3-47e6-81c1-80b3d792b1c6", "targets": ["bed0f380-3f1a-4833-9f8e-492da264f12d"]}],
    },
};

export const GET_ALL_LOGS: Schema = {
    filename: {
        REQUIRED: false,
        DEFAULT: "application logs",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Select",
        COMPONENT_PROPS: {"options": [{"value": "application logs", "label": "Application Logs"}, {"value": "daphne logs", "label": "Daphne Logs"}, {"value": "local logs", "label": "Local Logs"}]},
        ICON_NAME: "Document",
        DESCRIPTION: "The log file to read all lines from (Application Logs, Daphne Logs, or Local Logs).",
    },
};

export const GET_LOG_FILES: Schema = {
};

export const STOP_TAIL_LOGS: Schema = {
};

export const TAIL_LOGS: Schema = {
    filename: {
        REQUIRED: false,
        DEFAULT: "application logs",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Select",
        COMPONENT_PROPS: {"options": [{"value": "application logs", "label": "Application Logs"}, {"value": "daphne logs", "label": "Daphne Logs"}, {"value": "local logs", "label": "Local Logs"}]},
        ICON_NAME: "Document",
        DESCRIPTION: "The log file to tail (Application Logs, Daphne Logs, or Local Logs).",
    },
    interval: {
        REQUIRED: false,
        DEFAULT: 1.0,
        VALIDATION: null,
        DATA_TYPE: "float",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        ICON_NAME: "Clock",
        DESCRIPTION: "The interval (in seconds) between checks for new log lines.",
    },
};

export const READ_LOGS: Schema = {
    filename: {
        REQUIRED: false,
        DEFAULT: "application logs",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Select",
        COMPONENT_PROPS: {"options": [{"value": "application logs", "label": "Application Logs"}, {"value": "daphne logs", "label": "Daphne Logs"}, {"value": "local logs", "label": "Local Logs"}]},
        ICON_NAME: "Document",
        DESCRIPTION: "The log file to read (Application Logs, Daphne Logs, or Local Logs).",
    },
    lines: {
        REQUIRED: false,
        DEFAULT: 100,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        ICON_NAME: "Number",
        DESCRIPTION: "The number of lines to read from the log file (0 for all).",
    },
    search: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Search",
        DESCRIPTION: "A search term to filter log lines (case-insensitive).",
    },
};

export const SAMPLE_SERVICE: Schema = {
    slider_field: {
        REQUIRED: false,
        DEFAULT: 50,
        VALIDATION: null,
        DATA_TYPE: "number",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "slider",
        COMPONENT_PROPS: {"min": 0, "max": 100, "step": 1, "range": "False"},
        ICON_NAME: "Sliders",
        DESCRIPTION: "Adjust the value between 0 and 100",
        TEST_VALUE: 75,
    },
    select_field: {
        REQUIRED: true,
        DEFAULT: "option2",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Select",
        COMPONENT_PROPS: {"options": [{"label": "Option 1", "value": "option1"}, {"label": "Option 2", "value": "option2"}, {"label": "Option 3", "value": "option3"}]},
        ICON_NAME: "List",
        DESCRIPTION: "Select an option from the dropdown",
        TEST_VALUE: "option3",
    },
    radio_field: {
        REQUIRED: true,
        DEFAULT: "radio1",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "RadioGroup",
        COMPONENT_PROPS: {"options": [{"label": "Radio Option 1", "value": "radio1"}, {"label": "Radio Option 2", "value": "radio2"}, {"label": "Radio Option 3", "value": "radio3"}], "orientation": "vertical"},
        ICON_NAME: "Radio",
        DESCRIPTION: "Choose one of the options",
        TEST_VALUE: "radio2",
    },
    file_field: {
        REQUIRED: false,
        DEFAULT: "",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "FileUpload",
        COMPONENT_PROPS: {},
        ICON_NAME: "File",
        DESCRIPTION: "Upload a document (PDF, DOCX, or TXT)",
        TEST_VALUE: "sample-document.pdf",
    },
    files_field: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "MultiFileUpload",
        COMPONENT_PROPS: {"accept": "image/*", "maxfiles": 5, "maxsize": 2000000},
        ICON_NAME: "Files",
        DESCRIPTION: "Upload up to 5 images (max 2MB each)",
        TEST_VALUE: ["image1.jpg", "image2.png"],
    },
    json_field: {
        REQUIRED: false,
        DEFAULT: {"key": "value"},
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {"spellCheck": "False"},
        ICON_NAME: "Code",
        DESCRIPTION: "Edit JSON configuration",
        TEST_VALUE: {"test": "data", "nested": {"value": 123}},
    },
    switch_field: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {"size": "default"},
        ICON_NAME: "ToggleLeft",
        DESCRIPTION: "Enable or disable this feature",
        TEST_VALUE: false,
    },
    checkbox_field: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Checkbox",
        COMPONENT_PROPS: {"indeterminate": "False"},
        ICON_NAME: "CheckSquare",
        DESCRIPTION: "Agree to the terms and conditions",
        TEST_VALUE: true,
    },
    textarea_field: {
        REQUIRED: false,
        DEFAULT: "",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Textarea",
        COMPONENT_PROPS: {"rows": 6, "maxLength": 500, "placeholder": "Enter your detailed description here...", "resize": "vertical"},
        ICON_NAME: "FileText",
        DESCRIPTION: "Provide a detailed description (max 500 characters)",
        TEST_VALUE: "This is a sample text that would be used in test mode.",
    },
};

export const EDIT_WC_INJURY: Schema = {
    injury_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "ID of the injury to edit",
        ICON_NAME: "FileText",
    },
    digit: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 0},
        DESCRIPTION: "Updated digit impairment rating",
        ICON_NAME: "Hash",
    },
    wpi: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 0, "max": 100},
        DESCRIPTION: "Updated whole person impairment percentage",
        ICON_NAME: "Hash",
    },
    le: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 0},
        DESCRIPTION: "Updated lower extremity impairment rating",
        ICON_NAME: "Hash",
    },
    ue: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 0},
        DESCRIPTION: "Updated upper extremity impairment rating",
        ICON_NAME: "Hash",
    },
    industrial: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 0, "max": 100},
        DESCRIPTION: "Updated industrial apportionment percentage",
        ICON_NAME: "Hash",
    },
    pain: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 0},
        DESCRIPTION: "Updated pain add-on rating",
        ICON_NAME: "Hash",
    },
    side: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: "validate_wc_side",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Select",
        COMPONENT_PROPS: {"options": [{"label": "Left", "value": "left"}, {"label": "Right", "value": "right"}, {"label": "Bilateral", "value": "bilateral"}]},
        DESCRIPTION: "Updated side of the injury (left, right, or bilateral)",
        ICON_NAME: "ArrowLeftRight",
    },
};

export const EDIT_WC_CLAIM: Schema = {
    claim_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "ID of the claim to edit",
        ICON_NAME: "FileText",
    },
    date_of_injury: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: "validate_date",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {"placeholder": "YYYY-MM-DD"},
        DESCRIPTION: "Updated date of injury in YYYY-MM-DD format",
        ICON_NAME: "Calendar",
    },
    date_of_birth: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: "validate_date",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {"placeholder": "YYYY-MM-DD"},
        DESCRIPTION: "Updated date of birth in YYYY-MM-DD format",
        ICON_NAME: "Calendar",
    },
    age_at_doi: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 0, "max": 120},
        DESCRIPTION: "Updated age at the date of injury",
        ICON_NAME: "Hash",
    },
    occupational_code: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Updated occupational code",
        ICON_NAME: "Briefcase",
    },
    weekly_earnings: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "float",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"step": 0.01, "min": 0},
        DESCRIPTION: "Updated weekly earnings in dollars",
        ICON_NAME: "DollarSign",
    },
    applicant_name: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Updated full name of the applicant",
        ICON_NAME: "User",
    },
};

export const CALCULATE_WC_RATINGS: Schema = {
    report_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "ID of the report to calculate ratings for",
        ICON_NAME: "FileText",
    },
};

export const CREATE_WC_INJURY: Schema = {
    report_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "ID of the associated report",
        ICON_NAME: "FileText",
    },
    impairment_definition_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "ID of the impairment definition",
        ICON_NAME: "FileText",
    },
    digit: {
        REQUIRED: false,
        DEFAULT: 0,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 0},
        DESCRIPTION: "Digit impairment rating",
        ICON_NAME: "Hash",
    },
    wpi: {
        REQUIRED: false,
        DEFAULT: 0,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 0, "max": 100},
        DESCRIPTION: "Whole person impairment percentage",
        ICON_NAME: "Hash",
    },
    le: {
        REQUIRED: false,
        DEFAULT: 0,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 0},
        DESCRIPTION: "Lower extremity impairment rating",
        ICON_NAME: "Hash",
    },
    ue: {
        REQUIRED: false,
        DEFAULT: 0,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 0},
        DESCRIPTION: "Upper extremity impairment rating",
        ICON_NAME: "Hash",
    },
    industrial: {
        REQUIRED: false,
        DEFAULT: 100,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 0, "max": 100},
        DESCRIPTION: "Industrial apportionment percentage",
        ICON_NAME: "Hash",
    },
    pain: {
        REQUIRED: false,
        DEFAULT: 0,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 0},
        DESCRIPTION: "Pain add-on rating",
        ICON_NAME: "Hash",
    },
    side: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: "validate_wc_side",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Select",
        COMPONENT_PROPS: {"options": [{"label": "Left", "value": "left"}, {"label": "Right", "value": "right"}, {"label": "Bilateral", "value": "bilateral"}]},
        DESCRIPTION: "Side of the injury (left, right, or bilateral)",
        ICON_NAME: "ArrowLeftRight",
    },
};

export const CREATE_WC_REPORT: Schema = {
    claim_id: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "ID of the associated claim",
        ICON_NAME: "FileText",
    },
};

export const CREATE_WC_CLAIM: Schema = {
    date_of_injury: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: "validate_date",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {"placeholder": "YYYY-MM-DD"},
        DESCRIPTION: "Date of injury in YYYY-MM-DD format",
        ICON_NAME: "Calendar",
    },
    date_of_birth: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: "validate_date",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {"placeholder": "YYYY-MM-DD"},
        DESCRIPTION: "Date of birth in YYYY-MM-DD format",
        ICON_NAME: "Calendar",
    },
    age_at_doi: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 0, "max": 120},
        DESCRIPTION: "Age at the date of injury",
        ICON_NAME: "Hash",
    },
    occupational_code: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Occupational code",
        ICON_NAME: "Briefcase",
    },
    weekly_earnings: {
        REQUIRED: false,
        DEFAULT: 290.0,
        VALIDATION: null,
        DATA_TYPE: "float",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"step": 0.01, "min": 0},
        DESCRIPTION: "Weekly earnings in dollars",
        ICON_NAME: "DollarSign",
    },
    applicant_name: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "TextInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Full name of the applicant",
        ICON_NAME: "User",
    },
};

export const SEARCH_AND_SCRAPE_LIMITED: Schema = {
    keyword: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter query to search and get results for.",
        ICON_NAME: "WholeWord",
        TEST_VALUE: "apple stock price",
    },
    country_code: {
        REQUIRED: false,
        DEFAULT: "all",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Select",
        COMPONENT_PROPS: {"options": [{"label": "Argentina", "value": "AR"}, {"label": "Australia", "value": "AU"}, {"label": "Austria", "value": "AT"}, {"label": "Belgium", "value": "BE"}, {"label": "Brazil", "value": "BR"}, {"label": "Canada", "value": "CA"}, {"label": "Chile", "value": "CL"}, {"label": "Denmark", "value": "DK"}, {"label": "Finland", "value": "FI"}, {"label": "France", "value": "FR"}, {"label": "Germany", "value": "DE"}, {"label": "Hong Kong", "value": "HK"}, {"label": "India", "value": "IN"}, {"label": "Indonesia", "value": "ID"}, {"label": "Italy", "value": "IT"}, {"label": "Japan", "value": "JP"}, {"label": "Korea", "value": "KR"}, {"label": "Malaysia", "value": "MY"}, {"label": "Mexico", "value": "MX"}, {"label": "Netherlands", "value": "NL"}, {"label": "New Zealand", "value": "NZ"}, {"label": "Norway", "value": "NO"}, {"label": "Peoples Republic of China", "value": "CN"}, {"label": "Poland", "value": "PL"}, {"label": "Portugal", "value": "PT"}, {"label": "Republic of the Philippines", "value": "PH"}, {"label": "Russia", "value": "RU"}, {"label": "Saudi Arabia", "value": "SA"}, {"label": "South Africa", "value": "ZA"}, {"label": "Spain", "value": "ES"}, {"label": "Sweden", "value": "SE"}, {"label": "Switzerland", "value": "CH"}, {"label": "Taiwan", "value": "TW"}, {"label": "Turkey", "value": "TR"}, {"label": "United Kingdom", "value": "GB"}, {"label": "United States", "value": "US"}, {"label": "All Regions", "value": "ALL"}]},
        DESCRIPTION: "Enter the country code to get search results for.",
        ICON_NAME: "Flag",
        TEST_VALUE: "US",
    },
    max_page_read: {
        REQUIRED: false,
        DEFAULT: 10,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "slider",
        COMPONENT_PROPS: {"min": 1, "max": 20, "step": 1, "range": "False"},
        DESCRIPTION: "Enter the number of results per keyword to get.",
        ICON_NAME: "SlidersHorizontal",
        TEST_VALUE: 5,
    },
    search_type: {
        REQUIRED: false,
        DEFAULT: "all",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "RadioGroup",
        COMPONENT_PROPS: {"options": [{"label": "All", "value": "all"}, {"label": "Web", "value": "web"}, {"label": "News", "value": "news"}], "orientation": "vertical"},
        DESCRIPTION: "Kind of search type to scrape, 'web', 'news', or 'all'.",
        ICON_NAME: "Rss",
    },
    get_organized_data: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get organized json content for the scrape page.",
        ICON_NAME: "Braces",
        TEST_VALUE: false,
    },
    get_structured_data: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get structured data json content for the scrape page.",
        ICON_NAME: "Braces",
        TEST_VALUE: false,
    },
    get_overview: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get overview content for the scraped page. Overview contains basic information for the page like title, other metadata etc.",
        ICON_NAME: "Target",
        TEST_VALUE: false,
    },
    get_text_data: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get parsed text data for the scraped page. Generated from 'organized data'.",
        ICON_NAME: "LetterText",
        TEST_VALUE: true,
    },
    get_main_image: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get main image for the scraped page. Main image is usually the biggest or most relevant image on the page. Extracted from OG metadata or other meta tags.",
        ICON_NAME: "Image",
        TEST_VALUE: true,
    },
    get_links: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get all the links from the scraped page. Links are categorized as internal, external, document, archive etc.",
        ICON_NAME: "Link",
        TEST_VALUE: false,
    },
    get_content_filter_removal_details: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get list of objects that were ignored during parsing page based on settings.",
        ICON_NAME: "RemoveFormatting",
        TEST_VALUE: false,
    },
    include_highlighting_markers: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include /exclude highlighting markers like 'underline', 'list markers' etc... from text.",
        ICON_NAME: "Underline",
        TEST_VALUE: false,
    },
    include_media: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include media content in text output.",
        ICON_NAME: "TvMinimalPlay",
        TEST_VALUE: true,
    },
    include_media_links: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include media links (image , video, audio) in text. Triggered when include_media is turned on.",
        ICON_NAME: "Link",
        TEST_VALUE: true,
    },
    include_media_description: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include media description (media caption etc.) in text. Triggers when include_media is turned on.",
        ICON_NAME: "WholeWord",
        TEST_VALUE: true,
    },
    include_anchors: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include hyperlinks in scraped text",
        ICON_NAME: "ExternalLink",
        TEST_VALUE: true,
    },
    anchor_size: {
        REQUIRED: false,
        DEFAULT: 100,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 10, "max": 500},
        DESCRIPTION: "Size of hyperlinks in scraped text",
        ICON_NAME: "Ruler",
        TEST_VALUE: 100,
    },
};

export const SEARCH_KEYWORDS: Schema = {
    keywords: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "arrayField",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the queries to search for.",
        ICON_NAME: "WholeWord",
        TEST_VALUE: ["apple stock price", "apple stock best time to buy", "apple stock forecast"],
    },
    country_code: {
        REQUIRED: false,
        DEFAULT: "all",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Select",
        COMPONENT_PROPS: {"options": [{"label": "Argentina", "value": "AR"}, {"label": "Australia", "value": "AU"}, {"label": "Austria", "value": "AT"}, {"label": "Belgium", "value": "BE"}, {"label": "Brazil", "value": "BR"}, {"label": "Canada", "value": "CA"}, {"label": "Chile", "value": "CL"}, {"label": "Denmark", "value": "DK"}, {"label": "Finland", "value": "FI"}, {"label": "France", "value": "FR"}, {"label": "Germany", "value": "DE"}, {"label": "Hong Kong", "value": "HK"}, {"label": "India", "value": "IN"}, {"label": "Indonesia", "value": "ID"}, {"label": "Italy", "value": "IT"}, {"label": "Japan", "value": "JP"}, {"label": "Korea", "value": "KR"}, {"label": "Malaysia", "value": "MY"}, {"label": "Mexico", "value": "MX"}, {"label": "Netherlands", "value": "NL"}, {"label": "New Zealand", "value": "NZ"}, {"label": "Norway", "value": "NO"}, {"label": "Peoples Republic of China", "value": "CN"}, {"label": "Poland", "value": "PL"}, {"label": "Portugal", "value": "PT"}, {"label": "Republic of the Philippines", "value": "PH"}, {"label": "Russia", "value": "RU"}, {"label": "Saudi Arabia", "value": "SA"}, {"label": "South Africa", "value": "ZA"}, {"label": "Spain", "value": "ES"}, {"label": "Sweden", "value": "SE"}, {"label": "Switzerland", "value": "CH"}, {"label": "Taiwan", "value": "TW"}, {"label": "Turkey", "value": "TR"}, {"label": "United Kingdom", "value": "GB"}, {"label": "United States", "value": "US"}, {"label": "All Regions", "value": "ALL"}]},
        DESCRIPTION: "Enter the country code to get search results for.",
        ICON_NAME: "Flag",
        TEST_VALUE: "US",
    },
    total_results_per_keyword: {
        REQUIRED: false,
        DEFAULT: 5,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "slider",
        COMPONENT_PROPS: {"min": 1, "max": 100, "step": 1, "range": "False"},
        DESCRIPTION: "Enter the number of results per keyword to get. Note: Total results per keyword may deviate from this number due to the search engine results.",
        ICON_NAME: "SlidersHorizontal",
        TEST_VALUE: 5,
    },
    search_type: {
        REQUIRED: false,
        DEFAULT: "All",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "RadioGroup",
        COMPONENT_PROPS: {"options": [{"label": "All", "value": "all"}, {"label": "Web", "value": "web"}, {"label": "News", "value": "news"}], "orientation": "vertical"},
        DESCRIPTION: "Kind of search type to scrape, 'web', 'news', or 'all'.",
        ICON_NAME: "Rss",
    },
};

export const SEARCH_AND_SCRAPE: Schema = {
    keywords: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "ArrayField",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the queries to search for.",
        ICON_NAME: "WholeWord",
        TEST_VALUE: ["apple stock price", "apple stock best time to buy", "apple stock forecast"],
    },
    country_code: {
        REQUIRED: false,
        DEFAULT: "all",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Select",
        COMPONENT_PROPS: {"options": [{"label": "Argentina", "value": "AR"}, {"label": "Australia", "value": "AU"}, {"label": "Austria", "value": "AT"}, {"label": "Belgium", "value": "BE"}, {"label": "Brazil", "value": "BR"}, {"label": "Canada", "value": "CA"}, {"label": "Chile", "value": "CL"}, {"label": "Denmark", "value": "DK"}, {"label": "Finland", "value": "FI"}, {"label": "France", "value": "FR"}, {"label": "Germany", "value": "DE"}, {"label": "Hong Kong", "value": "HK"}, {"label": "India", "value": "IN"}, {"label": "Indonesia", "value": "ID"}, {"label": "Italy", "value": "IT"}, {"label": "Japan", "value": "JP"}, {"label": "Korea", "value": "KR"}, {"label": "Malaysia", "value": "MY"}, {"label": "Mexico", "value": "MX"}, {"label": "Netherlands", "value": "NL"}, {"label": "New Zealand", "value": "NZ"}, {"label": "Norway", "value": "NO"}, {"label": "Peoples Republic of China", "value": "CN"}, {"label": "Poland", "value": "PL"}, {"label": "Portugal", "value": "PT"}, {"label": "Republic of the Philippines", "value": "PH"}, {"label": "Russia", "value": "RU"}, {"label": "Saudi Arabia", "value": "SA"}, {"label": "South Africa", "value": "ZA"}, {"label": "Spain", "value": "ES"}, {"label": "Sweden", "value": "SE"}, {"label": "Switzerland", "value": "CH"}, {"label": "Taiwan", "value": "TW"}, {"label": "Turkey", "value": "TR"}, {"label": "United Kingdom", "value": "GB"}, {"label": "United States", "value": "US"}, {"label": "All Regions", "value": "ALL"}]},
        DESCRIPTION: "Enter the country code to get search results for.",
        ICON_NAME: "Flag",
        TEST_VALUE: "US",
    },
    total_results_per_keyword: {
        REQUIRED: false,
        DEFAULT: 10,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "slider",
        COMPONENT_PROPS: {"min": 10, "max": 30, "step": 1, "range": "False"},
        DESCRIPTION: "Enter the number of results per keyword to get.",
        ICON_NAME: "SlidersHorizontal",
        TEST_VALUE: 10,
    },
    search_type: {
        REQUIRED: false,
        DEFAULT: "all",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "RadioGroup",
        COMPONENT_PROPS: {"options": [{"label": "All", "value": "all"}, {"label": "Web", "value": "web"}, {"label": "News", "value": "news"}], "orientation": "vertical"},
        DESCRIPTION: "Kind of search type to scrape, 'web', 'news', or 'all'.",
        ICON_NAME: "Rss",
    },
    get_organized_data: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get organized json content for the scrape page.",
        ICON_NAME: "Braces",
        TEST_VALUE: false,
    },
    get_structured_data: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get structured data json content for the scrape page.",
        ICON_NAME: "Braces",
        TEST_VALUE: false,
    },
    get_overview: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get overview content for the scraped page. Overview contains basic information for the page like title, other metadata etc.",
        ICON_NAME: "Target",
        TEST_VALUE: false,
    },
    get_text_data: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get parsed text data for the scraped page. Generated from 'organized data'.",
        ICON_NAME: "LetterText",
        TEST_VALUE: true,
    },
    get_main_image: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get main image for the scraped page. Main image is usually the biggest or most relevant image on the page. Extracted from OG metadata or other meta tags.",
        ICON_NAME: "Image",
        TEST_VALUE: true,
    },
    get_links: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get all the links from the scraped page. Links are categorized as internal, external, document, archive etc.",
        ICON_NAME: "Link",
        TEST_VALUE: false,
    },
    get_content_filter_removal_details: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get list of objects that were ignored during parsing page based on settings.",
        ICON_NAME: "RemoveFormatting",
        TEST_VALUE: false,
    },
    include_highlighting_markers: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include /exclude highlighting markers like 'underline', 'list markers' etc... from text.",
        ICON_NAME: "Underline",
        TEST_VALUE: false,
    },
    include_media: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include media content in text output.",
        ICON_NAME: "TvMinimalPlay",
        TEST_VALUE: true,
    },
    include_media_links: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include media links (image , video, audio) in text. Triggered when include_media is turned on.",
        ICON_NAME: "Link",
        TEST_VALUE: true,
    },
    include_media_description: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include media description (media caption etc.) in text. Triggers when include_media is turned on.",
        ICON_NAME: "WholeWord",
        TEST_VALUE: true,
    },
    include_anchors: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include hyperlinks in scraped text",
        ICON_NAME: "ExternalLink",
        TEST_VALUE: true,
    },
    anchor_size: {
        REQUIRED: false,
        DEFAULT: 100,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 10, "max": 500},
        DESCRIPTION: "Size of hyperlinks in scraped text",
        ICON_NAME: "Ruler",
        TEST_VALUE: 100,
    },
};

export const QUICK_SCRAPE_STREAM: Schema = {
    urls: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "arrayField",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the urls to be scraped.",
        ICON_NAME: "Link",
        TEST_VALUE: ["https://en.wikipedia.org/wiki/Donald_Trump", "https://titaniumsuccess.com/arman-sadeghi/business-coach/"],
    },
    get_organized_data: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get organized json content for the scrape page.",
        ICON_NAME: "Braces",
        TEST_VALUE: false,
    },
    get_structured_data: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get structured data json content for the scrape page.",
        ICON_NAME: "Braces",
        TEST_VALUE: false,
    },
    get_overview: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get overview content for the scraped page. Overview contains basic information for the page like title, other metadata etc.",
        ICON_NAME: "Target",
        TEST_VALUE: false,
    },
    get_text_data: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get parsed text data for the scraped page. Generated from 'organized data'.",
        ICON_NAME: "LetterText",
        TEST_VALUE: true,
    },
    get_main_image: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get main image for the scraped page. Main image is usually the biggest or most relevant image on the page. Extracted from OG metadata or other meta tags.",
        ICON_NAME: "Image",
        TEST_VALUE: true,
    },
    get_links: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get all the links from the scraped page. Links are categorized as internal, external, document, archive etc.",
        ICON_NAME: "Link",
        TEST_VALUE: false,
    },
    get_content_filter_removal_details: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get list of objects that were ignored during parsing page based on settings.",
        ICON_NAME: "RemoveFormatting",
        TEST_VALUE: false,
    },
    include_highlighting_markers: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include /exclude highlighting markers like 'underline', 'list markers' etc... from text.",
        ICON_NAME: "Underline",
        TEST_VALUE: false,
    },
    include_media: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include media content in text output.",
        ICON_NAME: "TvMinimalPlay",
        TEST_VALUE: true,
    },
    include_media_links: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include media links (image , video, audio) in text. Triggered when include_media is turned on.",
        ICON_NAME: "Link",
        TEST_VALUE: true,
    },
    include_media_description: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include media description (media caption etc.) in text. Triggers when include_media is turned on.",
        ICON_NAME: "WholeWord",
        TEST_VALUE: true,
    },
    include_anchors: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include hyperlinks in scraped text",
        ICON_NAME: "ExternalLink",
        TEST_VALUE: true,
    },
    anchor_size: {
        REQUIRED: false,
        DEFAULT: 100,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 10, "max": 500},
        DESCRIPTION: "Size of hyperlinks in scraped text",
        ICON_NAME: "Ruler",
        TEST_VALUE: 100,
    },
};

export const TRACK_CONTENT_GROUPING_RUN: Schema = {
    content_grouping_run_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the content grouping run id to be tracked.",
        ICON_NAME: "Key",
    },
};

export const CREATE_CONTENT_GROUPING_RUN: Schema = {
    full_site_scrape_task_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the full site scrape task id to be scraped.",
        ICON_NAME: "Key",
    },
    content_grouping_config: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the content grouping config to be used for the scrape.",
        ICON_NAME: "Bolt",
    },
};

export const VIEW_PARSED_PAGE: Schema = {
    parsed_content_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the parsed content id to be viewed.",
        ICON_NAME: "Key",
    },
};

export const GET_PARSED_PAGES: Schema = {
    full_site_scrape_task_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the full site scrape task id to be scraped.",
        ICON_NAME: "Key",
    },
    cursor: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the cursor to be used for the scrape.",
        ICON_NAME: "Key",
    },
    page_size: {
        REQUIRED: false,
        DEFAULT: 1000,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the page size to be used for the scrape.",
        ICON_NAME: "Key",
    },
};

export const RESUME_FULL_SITE_SCRAPE_TASK: Schema = {
    full_site_scrape_task_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the full site scrape task id to be scraped.",
        ICON_NAME: "Key",
    },
};

export const PAUSE_FULL_SITE_SCRAPE_TASK: Schema = {
    full_site_scrape_task_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the full site scrape task id to be scraped.",
        ICON_NAME: "Key",
    },
};

export const CANCEL_FULL_SITE_SCRAPE_TASK: Schema = {
    full_site_scrape_task_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the full site scrape task id to be scraped.",
        ICON_NAME: "Key",
    },
};

export const GET_FULL_SITE_SCRAPE_PROGRESS_DETAILED: Schema = {
    full_site_scrape_task_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the full site scrape task id to be scraped.",
        ICON_NAME: "Key",
    },
};

export const GET_FULL_SITE_SCRAPE_PROGRESS: Schema = {
    full_site_scrape_task_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the full site scrape task id to be scraped.",
        ICON_NAME: "Key",
    },
};

export const CREATE_FULL_SITE_SCRAPE_TASK: Schema = {
    urls: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: "validate_scrape_urls",
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "ArrayField",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the urls to be scraped.",
        ICON_NAME: "Link",
    },
};

export const GET_SCRAPE_TASK_DETAILS: Schema = {
    scrape_task_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the scrape task id to be scraped.",
        ICON_NAME: "Key",
    },
};

export const GET_SCRAPE_HISTORY_BY_TASK_ID: Schema = {
    scrape_task_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the scrape task id to be scraped.",
        ICON_NAME: "Key",
    },
};

export const GET_SCRAPE_HISTORY_BY_URL: Schema = {
    url: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the url to be scraped.",
        ICON_NAME: "Link",
    },
};

export const PARSE_RESPONSES_BY_ID: Schema = {
    scrape_task_ids: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "ArrayField",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the scrape task ids to be parsed.",
        ICON_NAME: "ChartNetwork",
    },
    use_configs: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Whether to use configs.",
        ICON_NAME: "Cog",
    },
    noise_config_id: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the noise config id to be used for the scrape.",
        ICON_NAME: "Key",
    },
    filter_config_id: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the filter config id to be used for the scrape.",
        ICON_NAME: "Key",
    },
};

export const PARSE_RESPONSE_BY_ID: Schema = {
    scrape_task_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the scrape task id to be parsed.",
        ICON_NAME: "Key",
    },
    use_configs: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Whether to use configs.",
        ICON_NAME: "Cog",
    },
    noise_config_id: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the noise config id to be used for the scrape.",
        ICON_NAME: "Key",
    },
    filter_config_id: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the filter config id to be used for the scrape.",
        ICON_NAME: "Key",
    },
};

export const SCRAPE_PAGE: Schema = {
    url: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the url to be scraped.",
        ICON_NAME: "Link",
    },
    use_mode: {
        REQUIRED: false,
        DEFAULT: "normal",
        VALIDATION: "validate_scrape_mode",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the mode to be used for the scrape.",
        ICON_NAME: "Blend",
    },
    interaction_settings_id: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the interaction settings id to be used for the scrape.",
        ICON_NAME: "Key",
    },
};

export const CREATE_SCRAPE_TASKS: Schema = {
    urls: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: "validate_scrape_urls",
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "ArrayField",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the urls to be scraped.",
        ICON_NAME: "Link",
    },
    use_configs: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Whether to use configs.",
        ICON_NAME: "Cog",
    },
    use_mode: {
        REQUIRED: false,
        DEFAULT: "normal",
        VALIDATION: "validate_scrape_mode",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the mode to be used for the scrape.",
        ICON_NAME: "Blend",
    },
    interaction_settings_id: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the interaction settings id to be used for the scrape.",
        ICON_NAME: "Key",
    },
};

export const QUICK_SCRAPE: Schema = {
    urls: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "arrayField",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the urls to be scraped.",
        ICON_NAME: "Link",
        TEST_VALUE: ["https://en.wikipedia.org/wiki/Donald_Trump", "https://titaniumsuccess.com/arman-sadeghi/business-coach/"],
    },
    get_organized_data: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get organized json content for the scrape page.",
        ICON_NAME: "Braces",
        TEST_VALUE: false,
    },
    get_structured_data: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get structured data json content for the scrape page.",
        ICON_NAME: "Braces",
        TEST_VALUE: false,
    },
    get_overview: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get overview content for the scraped page. Overview contains basic information for the page like title, other metadata etc.",
        ICON_NAME: "Target",
        TEST_VALUE: false,
    },
    get_text_data: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get parsed text data for the scraped page. Generated from 'organized data'.",
        ICON_NAME: "LetterText",
        TEST_VALUE: true,
    },
    get_main_image: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get main image for the scraped page. Main image is usually the biggest or most relevant image on the page. Extracted from OG metadata or other meta tags.",
        ICON_NAME: "Image",
        TEST_VALUE: true,
    },
    get_links: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get all the links from the scraped page. Links are categorized as internal, external, document, archive etc.",
        ICON_NAME: "Link",
        TEST_VALUE: false,
    },
    get_content_filter_removal_details: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Get list of objects that were ignored during parsing page based on settings.",
        ICON_NAME: "RemoveFormatting",
        TEST_VALUE: false,
    },
    include_highlighting_markers: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include /exclude highlighting markers like 'underline', 'list markers' etc... from text.",
        ICON_NAME: "Underline",
        TEST_VALUE: false,
    },
    include_media: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include media content in text output.",
        ICON_NAME: "TvMinimalPlay",
        TEST_VALUE: true,
    },
    include_media_links: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include media links (image , video, audio) in text. Triggered when include_media is turned on.",
        ICON_NAME: "Link",
        TEST_VALUE: true,
    },
    include_media_description: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include media description (media caption etc.) in text. Triggers when include_media is turned on.",
        ICON_NAME: "WholeWord",
        TEST_VALUE: true,
    },
    include_anchors: {
        REQUIRED: false,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Include hyperlinks in scraped text",
        ICON_NAME: "ExternalLink",
        TEST_VALUE: true,
    },
    anchor_size: {
        REQUIRED: false,
        DEFAULT: 100,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {"min": 10, "max": 500},
        DESCRIPTION: "Size of hyperlinks in scraped text",
        ICON_NAME: "Ruler",
        TEST_VALUE: 100,
    },
};

export const SAVE_INTERACTION_SETTINGS: Schema = {
    interaction_settings_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the interaction settings to be used for the domain.",
        ICON_NAME: "Key",
    },
    new_interaction_settings: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the new interaction settings to be used for the domain.",
        ICON_NAME: "Key",
    },
};

export const SAVE_FILTER_CONFIG: Schema = {
    filter_config_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the filter config to be used for the domain.",
        ICON_NAME: "Key",
    },
    new_filter_config: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: "validate_scrape_filter_config",
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the new filter config to be used for the domain.",
        ICON_NAME: "Key",
    },
};

export const SAVE_NOISE_CONFIG: Schema = {
    noise_config_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the noise config to be used for the domain.",
        ICON_NAME: "Key",
    },
    new_noise_config: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: "validate_scrape_noise_config",
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the new noise config to be used for the domain.",
        ICON_NAME: "Key",
    },
};

export const CREATE_FILTER_CONFIG: Schema = {
    filter_config_name: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the name of the filter config to be created.",
        ICON_NAME: "Key",
    },
};

export const CREATE_NOISE_CONFIG: Schema = {
    noise_config_name: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the name of the noise config to be created.",
        ICON_NAME: "Key",
    },
};

export const GET_INTERACTION_SETTINGS_BY_ID: Schema = {
    interaction_settings_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the interaction settings to be used for the domain.",
        ICON_NAME: "Key",
    },
};

export const GET_FILTER_CONFIGS: Schema = {
};

export const GET_FILTER_CONFIG_BY_ID: Schema = {
    filter_config_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the filter config to be used for the domain.",
        ICON_NAME: "Key",
    },
};

export const GET_NOISE_CONFIGS: Schema = {
};

export const GET_NOISE_CONFIG_BY_ID: Schema = {
    noise_config_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the noise config to be used for the domain.",
        ICON_NAME: "Key",
    },
};

export const CREATE_INTERACTION_SETTINGS: Schema = {
    interaction_settings_name: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the name of the interaction settings to be created.",
        ICON_NAME: "Key",
    },
};

export const CREATE_DOMAIN: Schema = {
    domain: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the domain to be created.",
        ICON_NAME: "Key",
    },
};

export const UPDATE_DOMAIN_CONFIG: Schema = {
    domain_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the domain to update.",
        ICON_NAME: "Key",
    },
    path_pattern: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the path pattern to be used for the domain.",
        ICON_NAME: "Key",
    },
    noise_config_id: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the noise config to be used for the domain.",
        ICON_NAME: "Key",
    },
    filter_config_id: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the filter config to be used for the domain.",
        ICON_NAME: "Key",
    },
    plugin_ids: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "ArrayField",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the ids of the plugins to be used for the domain.",
        ICON_NAME: "Blocks",
    },
    interaction_settings_id: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the interaction settings to be used for the domain.",
        ICON_NAME: "Key",
    },
    use_mode: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: "validate_scrape_mode",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the mode to be used for the domain.",
        ICON_NAME: "Key",
    },
};

export const CREATE_DOMAIN_CONFIG: Schema = {
    domain_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the domain to create.",
        ICON_NAME: "Key",
    },
    path_pattern: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the path pattern to be used for the domain.",
        ICON_NAME: "Key",
    },
    noise_config_id: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the noise config to be used for the domain.",
        ICON_NAME: "Key",
    },
    filter_config_id: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the filter config to be used for the domain.",
        ICON_NAME: "Key",
    },
    plugin_ids: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "ArrayField",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the ids of the plugins to be used for the domain.",
        ICON_NAME: "Blocks",
    },
    interaction_settings_id: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the interaction settings to be used for the domain.",
        ICON_NAME: "Key",
    },
    use_mode: {
        REQUIRED: false,
        DEFAULT: "normal",
        VALIDATION: "validate_scrape_mode",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the mode to be used for the domain.",
        ICON_NAME: "Key",
    },
};

export const GET_DOMAIN_CONFIG_BY_ID: Schema = {
    domain_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the domain to get.",
        ICON_NAME: "Key",
    },
};

export const GET_DOMAINS: Schema = {
};

export const GET_ALL_PYTHON_CLASS_DOCSTRINGS: Schema = {
    raw_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "textarea",
        COMPONENT_PROPS: {"rows": 10},
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
    },
};

export const GET_ALL_PYTHON_FUNCTION_DOCSTRINGS: Schema = {
    raw_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "textarea",
        COMPONENT_PROPS: {"rows": 10},
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
    },
};

export const GET_ALL_PYTHON_COMMENTS: Schema = {
    raw_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "textarea",
        COMPONENT_PROPS: {"rows": 10},
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
    },
};

export const GET_PYTHON_DICTS: Schema = {
    raw_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "textarea",
        COMPONENT_PROPS: {"rows": 10},
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
    },
    dict_variable_name: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the variable name of the dictionary to be created.",
        ICON_NAME: "Key",
    },
};

export const REMOVE_FIRST_AND_LAST_PARAGRAPH: Schema = {
    raw_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "textarea",
        COMPONENT_PROPS: {"rows": 10},
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
    },
};

export const GET_SEGMENTS: Schema = {
    raw_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "textarea",
        COMPONENT_PROPS: {"rows": 10},
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
    },
    segment_type: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: "validate_md_segment_type",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the type of segment to be extracted.",
        ICON_NAME: "Key",
    },
};

export const GET_SECTION_GROUPS: Schema = {
    raw_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "textarea",
        COMPONENT_PROPS: {"rows": 10},
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
    },
    section_group_type: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: "validate_md_section_group_type",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the type of section group to be extracted.",
        ICON_NAME: "Key",
    },
};

export const GET_SECTION_BLOCKS: Schema = {
    raw_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "textarea",
        COMPONENT_PROPS: {"rows": 10},
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
    },
    section_type: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: "validate_md_section_type",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the type of section to be extracted.",
        ICON_NAME: "Key",
    },
};

export const GET_ALL_CODE_BLOCKS: Schema = {
    raw_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "textarea",
        COMPONENT_PROPS: {"rows": 10},
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
    },
    remove_comments: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Check",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Whether to remove comments from the code blocks.",
        ICON_NAME: "Check",
    },
};

export const GET_STRUCTURED_DATA: Schema = {
    raw_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "textarea",
        COMPONENT_PROPS: {"rows": 10},
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
    },
};

export const GET_CODE_BLOCKS_BY_LANGUAGE: Schema = {
    raw_markdown: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "textarea",
        COMPONENT_PROPS: {"rows": 10},
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
    },
    language: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: "validate_md_code_language",
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the language of the code blocks to be extracted.",
        ICON_NAME: "Key",
    },
    remove_comments: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Check",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Whether to remove comments from the code blocks.",
        ICON_NAME: "Check",
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
        COMPONENT: "textarea",
        COMPONENT_PROPS: {"rows": 10},
        DESCRIPTION: "Enter the raw markdown to be classified.",
        ICON_NAME: "Key",
    },
};

export const RUN_CHAT_RECIPE: Schema = {
    recipe_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the ID of the recipe to be fetched, cached and ready for fast usage.",
        ICON_NAME: "Key",
        TEST_VALUE: "e2049ce6-c340-4ff7-987e-deb24a977853",
    },
    version: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Enter the version of the recipe or blank to get the latest version.",
    },
    broker_values: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: "convert_broker_data",
        REFERENCE: BROKER_DEFINITION,
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
    },
    user_id: {
        REQUIRED: false,
        DEFAULT: "socket_internal_user_id",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "",
        COMPONENT_PROPS: {},
        ICON_NAME: "",
        DESCRIPTION: "",
    },
    prepare_for_next_call: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        ICON_NAME: "FastForward ",
        DESCRIPTION: "Determines if the results should be saved as a new conversation.",
    },
    save_new_conversation: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        ICON_NAME: "Save",
        DESCRIPTION: "Determines if the results should be saved as a new conversation.",
    },
    include_classified_output: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Checkbox",
        COMPONENT_PROPS: {},
        ICON_NAME: "Shapes",
        DESCRIPTION: "Determines if the classified output should be included in the response.",
    },
    model_override: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Enter the ID of the AI Model or leave blank to use the default model.",
    },
    tools_override: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "arrayField",
        COMPONENT_PROPS: {},
        ICON_NAME: "PocketKnife",
        DESCRIPTION: "Enter a list of tool names to be used in the call, which will override the tools defined in the recipe.",
    },
    allow_default_values: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Checkbox",
        COMPONENT_PROPS: {},
        ICON_NAME: "SwatchBook",
        DESCRIPTION: "Determines if the default values can be used for brokers which are not provided or are not ready.",
    },
    allow_removal_of_unmatched: {
        REQUIRED: false,
        DEFAULT: false,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        ICON_NAME: "BadgeX",
        DESCRIPTION: "Determines if brokers which are not provided or are not ready should be removed from the input content prior to the call.",
    },
};

export const PREP_CONVERSATION: Schema = {
    conversation_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Enter the ID of the conversation to be fetched, cached and ready for fast usage.",
    },
};

export const AI_CHAT: Schema = {
    conversation_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Enter the conversation id.",
    },
    message_object: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: "convert_message_object",
        REFERENCE: MESSAGE_OBJECT_DEFINITION,
        COMPONENT: "relatedObject",
        COMPONENT_PROPS: {},
        ICON_NAME: "Messages",
        DESCRIPTION: "Enter the message object with message id, conversation id, content, role, type, and files.",
    },
};

export const MIC_CHECK: Schema = {
    mic_check_message: {
        REQUIRED: false,
        DEFAULT: "",
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Check",
        DESCRIPTION: "Enter any message and the same message will be streamed back to you as a test of the mic.",
    },
};

export const GET_NEEDED_RECIPE_BROKERS: Schema = {
    recipe_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the ID of the recipe to be fetched, cached and ready for fast usage.",
        ICON_NAME: "Key",
        TEST_VALUE: "e2049ce6-c340-4ff7-987e-deb24a977853",
    },
    version: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Enter the version of the recipe or blank to get the latest version.",
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
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the compiled recipe to get.",
        ICON_NAME: "Key",
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
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the recipe to get.",
        ICON_NAME: "Key",
        TEST_VALUE: "e2049ce6-c340-4ff7-987e-deb24a977853",
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
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the recipe to add.",
        ICON_NAME: "Key",
        TEST_VALUE: "e2049ce6-c340-4ff7-987e-deb24a977853",
    },
    compiled_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the compiled recipe to add.",
        ICON_NAME: "Key",
    },
    compiled_recipe: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the compiled recipe to add.",
        ICON_NAME: "Key",
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
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the recipe to run.",
        ICON_NAME: "Key",
        TEST_VALUE: "e2049ce6-c340-4ff7-987e-deb24a977853",
    },
    broker_values: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: "convert_broker_data",
        REFERENCE: BROKER_DEFINITION,
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
    },
    overrides: {
        REQUIRED: false,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: OVERRIDE_DEFINITION,
        COMPONENT: "relatedObject",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the overrides to be applied. These will override the 'settings' for the recipe, if overrides are allowed for the recipe.",
        ICON_NAME: "Parentheses",
    },
    stream: {
        REQUIRED: true,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Whether the response should be streamed or sent all at once.",
        ICON_NAME: "Check",
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
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the recipe to run.",
        ICON_NAME: "Key",
        TEST_VALUE: "e2049ce6-c340-4ff7-987e-deb24a977853",
    },
    compiled_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the id of the compiled recipe to run.",
        ICON_NAME: "Key",
    },
    compiled_recipe: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the compiled recipe to run.",
        ICON_NAME: "Key",
    },
    stream: {
        REQUIRED: true,
        DEFAULT: true,
        VALIDATION: null,
        DATA_TYPE: "boolean",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "Switch",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Whether the response should be streamed or sent all at once.",
        ICON_NAME: "Check",
    },
};

export const CONVERT_RECIPE_TO_CHAT: Schema = {
    chat_id: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Enter the ID of the chat to be converted to a recipe.",
    },
};

export const CONVERT_NORMALIZED_DATA_TO_USER_DATA: Schema = {
    data: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "JsonEditor",
        COMPONENT_PROPS: {},
        ICON_NAME: "Grid2x2Plus",
        DESCRIPTION: "Enter a JSON object with normalized keys and values.",
    },
    table_name: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Baseline",
        DESCRIPTION: "Enter the name of the table to be created.",
    },
    table_description: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "string",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Text",
        DESCRIPTION: "Enter the description of the table to be created.",
    },
};

export const PREPARE_BATCH_RECIPE: Schema = {
    chat_configs: {
        REQUIRED: true,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: CHAT_CONFIG_DEFINITION,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Enter the chat configs to be used in the recipe.",
    },
    broker_values: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: "convert_broker_data",
        REFERENCE: BROKER_DEFINITION,
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
    },
    max_count: {
        REQUIRED: false,
        DEFAULT: 3,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        ICON_NAME: "Sigma",
        DESCRIPTION: "Enter the maximum number of chats to be created.",
    },
};

export const RUN_BATCH_RECIPE: Schema = {
    chat_configs: {
        REQUIRED: true,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: null,
        REFERENCE: CHAT_CONFIG_DEFINITION,
        COMPONENT: "input",
        COMPONENT_PROPS: {},
        ICON_NAME: "Key",
        DESCRIPTION: "Enter the chat configs to be used in the recipe.",
    },
    broker_values: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: "convert_broker_data",
        REFERENCE: BROKER_DEFINITION,
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
    },
    max_count: {
        REQUIRED: false,
        DEFAULT: 3,
        VALIDATION: null,
        DATA_TYPE: "integer",
        CONVERSION: null,
        REFERENCE: null,
        COMPONENT: "NumberInput",
        COMPONENT_PROPS: {},
        ICON_NAME: "Sigma",
        DESCRIPTION: "Enter the maximum number of chats to be created.",
    },
};

export const RUN_RECIPE_TO_CHAT: Schema = {
    chat_config: {
        REQUIRED: true,
        DEFAULT: null,
        VALIDATION: null,
        DATA_TYPE: "object",
        CONVERSION: null,
        REFERENCE: CHAT_CONFIG_DEFINITION,
        COMPONENT: "relatedObject",
        COMPONENT_PROPS: {},
        ICON_NAME: "Settings",
        DESCRIPTION: "Enter the chat config to be used in the recipe.",
    },
    broker_values: {
        REQUIRED: false,
        DEFAULT: [],
        VALIDATION: null,
        DATA_TYPE: "array",
        CONVERSION: "convert_broker_data",
        REFERENCE: BROKER_DEFINITION,
        COMPONENT: "relatedArrayObject",
        COMPONENT_PROPS: {},
        DESCRIPTION: "Enter the broker values to be used in the recipe.",
        ICON_NAME: "Parentheses",
    },
};
export const SERVICE_TASKS = {
    ai_chat_service: {
        run_recipe_to_chat: RUN_RECIPE_TO_CHAT,
        run_batch_recipe: RUN_BATCH_RECIPE,
        prepare_batch_recipe: PREPARE_BATCH_RECIPE,
        convert_normalized_data_to_user_data: CONVERT_NORMALIZED_DATA_TO_USER_DATA,
        convert_recipe_to_chat: CONVERT_RECIPE_TO_CHAT,
        run_compiled_recipe: RUN_COMPILED_RECIPE,
        run_recipe: RUN_RECIPE,
        add_recipe: ADD_RECIPE,
        get_recipe: GET_RECIPE,
        get_compiled_recipe: GET_COMPILED_RECIPE,
        get_needed_recipe_brokers: GET_NEEDED_RECIPE_BROKERS,
        mic_check: MIC_CHECK,
    },
    chat_service: {
        ai_chat: AI_CHAT,
        prep_conversation: PREP_CONVERSATION,
        get_needed_recipe_brokers: GET_NEEDED_RECIPE_BROKERS,
        run_chat_recipe: RUN_CHAT_RECIPE,
        mic_check: MIC_CHECK,
    },
    markdown_service: {
        classify_markdown: CLASSIFY_MARKDOWN,
        get_code_blocks_by_language: GET_CODE_BLOCKS_BY_LANGUAGE,
        get_structured_data: GET_STRUCTURED_DATA,
        get_all_code_blocks: GET_ALL_CODE_BLOCKS,
        get_section_blocks: GET_SECTION_BLOCKS,
        get_section_groups: GET_SECTION_GROUPS,
        get_segments: GET_SEGMENTS,
        remove_first_and_last_paragraph: REMOVE_FIRST_AND_LAST_PARAGRAPH,
        get_python_dicts: GET_PYTHON_DICTS,
        get_all_python_comments: GET_ALL_PYTHON_COMMENTS,
        get_all_python_function_docstrings: GET_ALL_PYTHON_FUNCTION_DOCSTRINGS,
        get_all_python_class_docstrings: GET_ALL_PYTHON_CLASS_DOCSTRINGS,
        mic_check: MIC_CHECK,
    },
    scraper_service: {
        get_domains: GET_DOMAINS,
        get_domain_config_by_id: GET_DOMAIN_CONFIG_BY_ID,
        create_domain_config: CREATE_DOMAIN_CONFIG,
        update_domain_config: UPDATE_DOMAIN_CONFIG,
        create_domain: CREATE_DOMAIN,
        create_interaction_settings: CREATE_INTERACTION_SETTINGS,
        get_noise_config_by_id: GET_NOISE_CONFIG_BY_ID,
        get_noise_configs: GET_NOISE_CONFIGS,
        get_filter_config_by_id: GET_FILTER_CONFIG_BY_ID,
        get_filter_configs: GET_FILTER_CONFIGS,
        get_interaction_settings_by_id: GET_INTERACTION_SETTINGS_BY_ID,
        create_noise_config: CREATE_NOISE_CONFIG,
        create_filter_config: CREATE_FILTER_CONFIG,
        save_noise_config: SAVE_NOISE_CONFIG,
        save_filter_config: SAVE_FILTER_CONFIG,
        save_interaction_settings: SAVE_INTERACTION_SETTINGS,
        quick_scrape: QUICK_SCRAPE,
        create_scrape_tasks: CREATE_SCRAPE_TASKS,
        scrape_page: SCRAPE_PAGE,
        parse_response_by_id: PARSE_RESPONSE_BY_ID,
        parse_responses_by_id: PARSE_RESPONSES_BY_ID,
        get_scrape_history_by_url: GET_SCRAPE_HISTORY_BY_URL,
        get_scrape_history_by_task_id: GET_SCRAPE_HISTORY_BY_TASK_ID,
        get_scrape_task_details: GET_SCRAPE_TASK_DETAILS,
        create_full_site_scrape_task: CREATE_FULL_SITE_SCRAPE_TASK,
        get_full_site_scrape_progress: GET_FULL_SITE_SCRAPE_PROGRESS,
        get_full_site_scrape_progress_detailed: GET_FULL_SITE_SCRAPE_PROGRESS_DETAILED,
        cancel_full_site_scrape_task: CANCEL_FULL_SITE_SCRAPE_TASK,
        pause_full_site_scrape_task: PAUSE_FULL_SITE_SCRAPE_TASK,
        resume_full_site_scrape_task: RESUME_FULL_SITE_SCRAPE_TASK,
        get_parsed_pages: GET_PARSED_PAGES,
        view_parsed_page: VIEW_PARSED_PAGE,
        create_content_grouping_run: CREATE_CONTENT_GROUPING_RUN,
        track_content_grouping_run: TRACK_CONTENT_GROUPING_RUN,
        mic_check: MIC_CHECK,
    },
    scraper_service_v2: {
        quick_scrape: QUICK_SCRAPE,
        quick_scrape_stream: QUICK_SCRAPE_STREAM,
        search_and_scrape: SEARCH_AND_SCRAPE,
        search_keywords: SEARCH_KEYWORDS,
        search_and_scrape_limited: SEARCH_AND_SCRAPE_LIMITED,
        mic_check: MIC_CHECK,
    },
    california_worker_compensation_service: {
        create_wc_claim: CREATE_WC_CLAIM,
        create_wc_report: CREATE_WC_REPORT,
        create_wc_injury: CREATE_WC_INJURY,
        calculate_wc_ratings: CALCULATE_WC_RATINGS,
        edit_wc_claim: EDIT_WC_CLAIM,
        edit_wc_injury: EDIT_WC_INJURY,
        mic_check: MIC_CHECK,
    },
    sample_service: {
        sample_service: SAMPLE_SERVICE,
    },
    log_service: {
        read_logs: READ_LOGS,
        tail_logs: TAIL_LOGS,
        stop_tail_logs: STOP_TAIL_LOGS,
        get_log_files: GET_LOG_FILES,
        get_all_logs: GET_ALL_LOGS,
    },
    workflow_service: {
        start_workflow_with_structure: START_WORKFLOW_WITH_STRUCTURE,
        start_workflow_by_id: START_WORKFLOW_BY_ID,
        execute_single_step: EXECUTE_SINGLE_STEP,
        get_workflow_status: GET_WORKFLOW_STATUS,
        ping_workflow: PING_WORKFLOW,
        pause_workflow: PAUSE_WORKFLOW,
        resume_workflow: RESUME_WORKFLOW,
        cleanup_workflow: CLEANUP_WORKFLOW,
        set_function_pending: SET_FUNCTION_PENDING,
        activate_pending_function: ACTIVATE_PENDING_FUNCTION,
        get_pending_functions: GET_PENDING_FUNCTIONS,
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
        return (
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
        );
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