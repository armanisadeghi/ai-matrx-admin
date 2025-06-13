export type PredefinedBroker = {
    id: string;
    label: string;
    description: string;
    dataType: "string" | "array" | "object";
    guaranteed: boolean;
    dynamic_id: boolean;
};

export type CustomTab = {
    id: string;
    label: string;
    component: string;
    replaces: string | null;
    order: number;
};

export type NodeDefinitionType = {
    id: string;
    registered_function_id: string;
    node_type: string;
    name: string;
    description: string;
    is_active: boolean;
    managed_arguments: string[];
    required_arguments: string[];
    argument_defaults: Record<string, any>;
    dynamic_broker_arg: string;
    predefined_brokers: PredefinedBroker[];
    editor_title: string;
    custom_sections: Record<string, string>;
    custom_tabs: CustomTab[];
};

export const EMPTY_NODE_DEFINITION: NodeDefinitionType = {
    id: "",
    registered_function_id: "",
    node_type: "",
    name: "",
    description: "",
    is_active: false,
    managed_arguments: [],
    required_arguments: [],
    argument_defaults: {},
    dynamic_broker_arg: "",
    predefined_brokers: [],
    editor_title: "",
    custom_sections: {},
    custom_tabs: [],
};

export const RECIPE_NODE_DEFINITION: NodeDefinitionType = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    registered_function_id: "123e4567-e89b-12d3-a456-426614174000",
    node_type: "recipe",
    name: "Run Recipe",
    description: "Orchestrates execution of a single recipe and returns multiple structured outputs",
    is_active: true,
    managed_arguments: ["recipe_id", "version", "latest_version"],
    required_arguments: ["recipe_id"],
    argument_defaults: {
        latest_version: true,
        version: null,
    },
    dynamic_broker_arg: "recipe_id",
    predefined_brokers: [
        {
            id: "784f9b61-81cc-44af-8d24-a1cc3d9eac56",
            label: "Full Results",
            description: "The full results of the recipe including all formats.",
            dataType: "object",
            guaranteed: true,
            dynamic_id: false,
        },
        {
            id: "{recipe_id}_content",
            label: "Recipe Content",
            description: "The direct text content in full.",
            dataType: "string",
            guaranteed: true,
            dynamic_id: true,
        },
        {
            id: "{recipe_id}_lines",
            label: "Content Lines",
            description: "Response is identified by the type of line with an entry for type and content.",
            dataType: "array",
            guaranteed: true,
            dynamic_id: true,
        },
        {
            id: "{recipe_id}_sections",
            label: "Content Sections",
            description: "Sections automatically identified so each section type has children which are each a line entry (type/content).",
            dataType: "array",
            guaranteed: true,
            dynamic_id: true,
        },
        {
            id: "{recipe_id}_section_texts",
            label: "Section Texts",
            description:
                "Sections automatically identified but all of the content is directly a single markdown string. Ideal for passing to another recipe directly.",
            dataType: "array",
            guaranteed: true,
            dynamic_id: true,
        },
        {
            id: "{recipe_id}_sections_by_header",
            label: "Sections by Header",
            description: "Same as Content Sections but focused only on headers.",
            dataType: "object",
            guaranteed: true,
            dynamic_id: true,
        },
        {
            id: "{recipe_id}_section_texts_by_header",
            label: "Section Texts by Header",
            description: "Same as Section Texts but focused only on headers.",
            dataType: "object",
            guaranteed: true,
            dynamic_id: true,
        },
        {
            id: "{recipe_id}_sections_by_big_headers",
            label: "Sections by Big Headers",
            description: "Same as Content Sections but but will nest smaller headers such as h2 and h3 under h1.",
            dataType: "object",
            guaranteed: true,
            dynamic_id: true,
        },
        {
            id: "{recipe_id}_section_texts_by_big_headers",
            label: "Section Texts by Big Headers",
            description: "Same as Section Texts but will nest smaller headers such as h2 and h3 under h1.",
            dataType: "object",
            guaranteed: true,
            dynamic_id: true,
        },
    ],
    editor_title: "Run Recipe Configuration",
    custom_sections: {
        "basic-info": "RecipeBasicInfoSection",
        "function-info": "RecipeSelectionSection",
    },
    custom_tabs: [
        {
            id: "basic",
            label: "Overview",
            component: "RecipeOverviewTab",
            replaces: "basic",
            order: 1,
        },
        {
            id: "recipe-details",
            label: "Recipe",
            component: "RecipeDetailsTab",
            replaces: null,
            order: 2,
        },
        {
            id: "recipe-messages",
            label: "Messages",
            component: "RecipeMessagesTab",
            replaces: null,
            order: 3,
        },
        {
            id: "recipe-arguments",
            label: "Arguments",
            component: "RecipeArgumentsTab",
            replaces: "arguments",
            order: 4,
        },

        {
            id: "recipe-dependencies",
            label: "Dependencies",
            component: "RecipeDependenciesTab",
            replaces: "dependencies",
            order: 5,
        },
        {
            id: "recipe-brokers",
            label: "Brokers",
            component: "BrokersTab",
            replaces: "brokers",
            order: 6,
        },
    ],
};

export const TEXT_OPERATIONS_NODE_DEFINITION: NodeDefinitionType = {
    id: "eee8a3fd-2902-4c16-815e-3fe40136c2d0",
    registered_function_id: "b42d270b-0627-453c-a4bb-920eb1da6c51",
    node_type: "text_operations",
    name: "Text Operations",
    description: "Performs text operations on a text input",
    is_active: true,
    managed_arguments: [],
    required_arguments: [],
    argument_defaults: {},
    dynamic_broker_arg: "",
    predefined_brokers: [],
    editor_title: "",
    custom_sections: {},
    custom_tabs: [],
};

export const CUSTOM_NODE_REGISTRY: Record<string, NodeDefinitionType> = {
    "recipe-node-definition": RECIPE_NODE_DEFINITION,
    "text-operations-node-definition": TEXT_OPERATIONS_NODE_DEFINITION,
};
