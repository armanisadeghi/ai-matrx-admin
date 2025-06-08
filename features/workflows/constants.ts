import { cloneDeep } from "lodash";

const registeredFunctions_1 = [
    {
        id: "90b0bfd0-37fd-4c39-9ad8-bde3eb175263",
        name: "Run One Recipe Twice",
        return_broker: "2ce1afd9-0fc0-40d2-b589-b856a53e9182",
        args: [
            {
                name: "recipe_id",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "version",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "brokers_with_values_1",
                required: false,
                data_type: "dict",
                ready: false,
                default_value: null,
            },
            {
                name: "brokers_with_values_2",
                required: false,
                data_type: "dict",
                ready: false,
                default_value: null,
            },
        ],
    },
    {
        id: "b42d270b-0627-453c-a4bb-920eb1da6c51",
        name: "Orchestrate Text Operations",
        return_broker: "2c5e85c9-a81a-472c-a7bc-d060766244ec",
        args: [
            {
                name: "content",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "instructions",
                required: true,
                data_type: "list",
                ready: false,
                default_value: null,
            },
        ],
    },
    {
        id: "b870cda8-8789-4189-8ce1-95db7ce09290",
        name: "Process Markdown Make Flat",
        return_broker: "30f69de4-13c9-40f2-9806-ddf4a63776bc",
        args: [
            {
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "method",
                required: false,
                data_type: "str",
                ready: true,
                default_value: "dict_structured",
            },
        ],
    },
    {
        id: "d03ae789-3cde-4263-aea9-79a3eaad2dc6",
        name: "Process Markdown",
        return_broker: "8c221702-cc7a-4d5a-a940-305454f3d6df",
        args: [
            {
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "clean_markdown",
                required: false,
                data_type: "str",
                ready: true,
                default_value: true,
            },
            {
                name: "extract_jsons",
                required: false,
                data_type: "str",
                ready: false,
                default_value: true,
            },
            {
                name: "ignore_line_breaks",
                required: false,
                data_type: "str",
                ready: false,
                default_value: true,
            },
        ],
    },
    {
        id: "88324112-a108-4a27-94bd-671fef2c184d",
        name: "Process Markdown Extract Multiple Items with Configs",
        return_broker: "2ca25554-0db3-47e6-81c1-80b3d792b1c6",
        args: [
            {
                name: "configs",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "method",
                required: false,
                data_type: "str",
                ready: true,
                default_value: "dict_structured",
            },
        ],
    },
    {
        id: "7d3da03f-dde5-4444-81cd-cf5e60defc8e",
        name: "Process Markdown Extract One With Config",
        return_broker: "37c0abef-4788-4dee-9709-929a193d36d0",
        args: [
            {
                name: "config",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "method",
                required: false,
                data_type: "str",
                ready: true,
                default_value: "dict_structured",
            },
        ],
    },
    {
        id: "2ac5576b-d1ab-45b1-ab48-4e196629fdd8",
        name: "Run Recipe",
        return_broker: "784f9b61-81cc-44af-8d24-a1cc3d9eac56",
        args: [
            {
                name: "recipe_id",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "version",
                required: false,
                data_type: "int",
                ready: false,
                default_value: null,
            },
            {
                name: "model_override",
                required: false,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "tools_override",
                required: false,
                data_type: "list",
                ready: false,
                default_value: null,
            },
            {
                name: "latest_version",
                required: false,
                data_type: "bool",
                ready: true,
                default_value: true,
            },
            {
                name: "recipe_brokers",
                required: true,
                data_type: "list",
                ready: false,
                default_value: null,
            },
        ],
    },
    {
        id: "cbdbbf0c-e963-4b5f-bea5-87aa743fcb74",
        name: "Process Markdown With Dynamic Extraction",
        return_broker: "9fb9b7e5-c0bd-4e85-b606-21d05550842c",
        args: [
            {
                name: "extraction_function_str",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "method",
                required: false,
                data_type: "str",
                ready: true,
                default_value: "dict_structured",
            },
        ],
    },
    {
        id: "06d788e1-906e-4601-b112-bda6d2152f26",
        name: "Run One Recipe Twice Concurrently",
        return_broker: "2ce1afd9-0fc0-40d2-b589-b856a53e9182",
        args: [
            {
                name: "recipe_id",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "version",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "model_override",
                required: true,
                data_type: "dict",
                ready: false,
                default_value: null,
            },
            {
                name: "brokers_with_values_1",
                required: false,
                data_type: "dict",
                ready: false,
                default_value: null,
            },
            {
                name: "brokers_with_values_2",
                required: false,
                data_type: "dict",
                ready: false,
                default_value: null,
            },
        ],
    },
    {
        id: "8ff3af1c-3975-4a2d-89d1-0f799c784302",
        name: "Full Markdown Classifier",
        return_broker: "490abd8a-bb15-4ce3-b709-623906bc08de",
        args: [
            {
                name: "text_data",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "remove_line_breaks",
                required: false,
                data_type: "bool",
                ready: false,
                default_value: true,
            },
            {
                name: "remove_thematic_breaks",
                required: false,
                data_type: "bool",
                ready: false,
                default_value: true,
            },
            {
                name: "rules_override",
                required: false,
                data_type: "dict",
                ready: false,
                default_value: null,
            },
            {
                name: "core_broker_id",
                required: false,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "session_manager",
                required: false,
                data_type: "str",
                ready: false,
                default_value: null,
            },
        ],
    },
];

// registeredFunctions added on 2025-06-04 09:53:37
export const registeredFunctions = [
    {
        id: "90b0bfd0-37fd-4c39-9ad8-bde3eb175263",
        name: "Run One Recipe Twice",
        return_broker: "2ce1afd9-0fc0-40d2-b589-b856a53e9182",
        args: [
            {
                name: "recipe_id",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "version",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "brokers_with_values_1",
                required: false,
                data_type: "dict",
                ready: false,
                default_value: null,
            },
            {
                name: "brokers_with_values_2",
                required: false,
                data_type: "dict",
                ready: false,
                default_value: null,
            },
        ],
        description:
            "\n    Runs a recipe twice with different broker values and returns both results.\n\n    Args:\n        recipe_id (str): Unique recipe identifier.\n        version (str): Recipe version.\n        brokers_with_values_1 (dict, optional): Broker values for the first run.\n        brokers_with_values_2 (dict, optional): Broker values for the second run.\n\n    Returns:\n        dict: Dictionary with 'recipe_result_1' and 'recipe_result_2' keys containing each recipe execution result.\n\n    Tags:\n        'recipe execution', 'multi-run', 'workflow orchestration'\n        'AI workflow', 'result comparison', 'batch processing', 'data pipeline'\n    ",
    },
    {
        id: "b42d270b-0627-453c-a4bb-920eb1da6c51",
        name: "Orchestrate Text Operations",
        return_broker: "2c5e85c9-a81a-472c-a7bc-d060766244ec",
        args: [
            {
                name: "content",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "instructions",
                required: true,
                data_type: "list",
                ready: false,
                default_value: null,
            },
        ],
        description:
            "\n    Runs a sequence of text editing operations on input content as specified by instructions.\n\n    Args:\n        content (str): Input text to modify.\n        instructions (list): List of dicts with 'operation' and 'params' for each text operation.\n\n    Returns:\n        str: Processed text after all operations, or empty string if any operation fails.\n\n    Tags:\n        'text processing', 'text editing', 'workflow automation', 'batch operations', 'string manipulation',\n        'multi-step processing', 'custom text pipeline', 'instruction execution', 'text orchestration'\n    \nExample Instructions:\n\n[\n    {\n        'operation': 'marker_extract_recursive',\n        'params': {\n            'marker_pairs': [\n                (\"## 2. Suggestion\\n\", \"## 3. Suggestion\"),\n                (\"- **App Name:**\\n  \", \"- **Image Description:**\")\n            ]\n        }\n    },\n        {\n        'operation': 'literal_replace',\n        'params': {\n            'search_text': \"- **App Description:**\",\n            'replacement': \"About the app:\\n\"\n        }\n    },\n]\n\ninstructions = [\n    {\n        'operation': 'marker_extract_recursive',\n        'params': {\n            'marker_pairs': [\n                (\"## 2. Suggestion\\n\", \"## 3. Suggestion\"),\n                (\"--START_OF_CONTENT--\", \"- **Image Description:**\")\n            ]\n        }\n    },\n    {\n        'operation': 'literal_delete',\n        'params': {\n            'search_text': \"- **App Description:**\\n\"\n        }\n    },\n    {\n        'operation': 'literal_replace',\n        'params': {\n            'search_text': \"- **App Name:**\",\n            'replacement': \"App Info: \"\n        }\n    },\n    {\n        'operation': 'literal_replace',\n        'params': {\n            'search_text': \"\\n  \",\n            'replacement': \"\\n\"\n        }\n    },\n    {\n        'operation': 'literal_replace',\n        'params': {\n            'search_text': \"\\n\\n\",\n            'replacement': \"\\n\"\n        }\n    }\n]\n\n",
    },
    {
        id: "b870cda8-8789-4189-8ce1-95db7ce09290",
        name: "Process Markdown Make Flat",
        return_broker: "30f69de4-13c9-40f2-9806-ddf4a63776bc",
        args: [
            {
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "method",
                required: false,
                data_type: "str",
                ready: true,
                default_value: "dict_structured",
            },
        ],
        description:
            'Process markdown and then make the internal structure flat.\n\nReturns:\n{\n        "source": "process_markdown_make_flat",\n        "markdown_content": markdown_content,\n        "classified_sections": classified_sections,\n        "flattened_sections": flattened_sections,\n    }',
    },
    {
        id: "d03ae789-3cde-4263-aea9-79a3eaad2dc6",
        name: "Process Markdown",
        return_broker: "8c221702-cc7a-4d5a-a940-305454f3d6df",
        args: [
            {
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "clean_markdown",
                required: false,
                data_type: "str",
                ready: true,
                default_value: true,
            },
            {
                name: "extract_jsons",
                required: false,
                data_type: "str",
                ready: false,
                default_value: true,
            },
            {
                name: "ignore_line_breaks",
                required: false,
                data_type: "str",
                ready: false,
                default_value: true,
            },
        ],
        description:
            "Takes markdown content and does a basic classification to return content separated by sections and each line separated by the type of line.",
    },
    {
        id: "88324112-a108-4a27-94bd-671fef2c184d",
        name: "Process Markdown Extract Multiple Items with Configs",
        return_broker: "2ca25554-0db3-47e6-81c1-80b3d792b1c6",
        args: [
            {
                name: "configs",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "method",
                required: false,
                data_type: "str",
                ready: true,
                default_value: "dict_structured",
            },
        ],
        description:
            'Process markdown and extract multiple items with an array of configs.\n\nExample configs array:\n    configs = [\n        {\n            "section": "dict_wrapped_in_list",\n            "path": [2, "name"],\n            "output_type": "single",\n            "section_index": 0,  # Explicitly target the first dict_wrapped_in_list\n        },\n        {\n            "section": "dict_wrapped_in_list",\n            "path": [],\n            "output_type": "list",\n            "fields": ["name"],\n            "section_index": 1,  # Target the second dict_wrapped_in_list\n        },\n        {"section": "checklist", "path": [], "output_type": "list"},\n        {"section": "header_with_list", "path": [3], "output_type": "single", "filter": {"App Name": "LaundryGenie"}},\n    ]\n\nReturns:\n{\n        "source": "process_markdown_extract_with_multiple_configs",\n        "markdown_content": markdown_content,\n        "classified_sections": flattener_results["classified_sections"],\n        "flattened_sections": flattener_results["flattened_sections"],\n        "all_extracted_data": data,\n    }\n\n"data" has status, output, and error keys.',
    },
    {
        id: "7d3da03f-dde5-4444-81cd-cf5e60defc8e",
        name: "Process Markdown Extract One With Config",
        return_broker: "37c0abef-4788-4dee-9709-929a193d36d0",
        args: [
            {
                name: "config",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "method",
                required: false,
                data_type: "str",
                ready: true,
                default_value: "dict_structured",
            },
        ],
        description:
            'Processes markdown and extracts one item with a config object.\n\nExample Config:\n        {\n            "section": "dict_wrapped_in_list",\n            "path": [2, "name"],\n            "output_type": "single",\n            "section_index": 0,  # Explicitly target the first dict_wrapped_in_list\n        }\n\nReturns:\n{\n        "source": "process_markdown_extract_with_config",\n        "markdown_content": markdown_content,\n        "classified_sections": flattener_results["classified_sections"],\n        "flattened_sections": flattener_results["flattened_sections"],\n        "status": data["status"],\n        "output": data["output"],\n        "error": data["error"],\n    }',
    },
    {
        id: "2ac5576b-d1ab-45b1-ab48-4e196629fdd8",
        name: "Run Recipe",
        return_broker: "784f9b61-81cc-44af-8d24-a1cc3d9eac56",
        args: [
            {
                name: "recipe_id",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "version",
                required: false,
                data_type: "int",
                ready: false,
                default_value: null,
            },
            {
                name: "model_override",
                required: false,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "tools_override",
                required: false,
                data_type: "list",
                ready: false,
                default_value: null,
            },
            {
                name: "latest_version",
                required: false,
                data_type: "bool",
                ready: true,
                default_value: true,
            },
            {
                name: "recipe_brokers",
                required: true,
                data_type: "list",
                ready: false,
                default_value: null,
            },
        ],
        description:
            'Runs a recipe and returns the results which is either a results object which includes the content and metadata, including the classified flat structure.\n\nReturns:\n{\n     "status": "success",\n     "response": response.content,\n     "metadata": response.metadata,\n }',
    },
    {
        id: "cbdbbf0c-e963-4b5f-bea5-87aa743fcb74",
        name: "Process Markdown With Dynamic Extraction",
        return_broker: "9fb9b7e5-c0bd-4e85-b606-21d05550842c",
        args: [
            {
                name: "extraction_function_str",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "method",
                required: false,
                data_type: "str",
                ready: true,
                default_value: "dict_structured",
            },
        ],
        description:
            'Processes markdown and flattens it, then executes a dynamic extraction function which is provided as a string.\n\nSample Extraction Function:\n"""\ndef extract(data):\n    for section in data:\n        if section[\'section\'] == \'dict_wrapped_in_list\':\n            return section[\'content\'][2][\'name\']\n    return None\n"""\n\n\nReturns:\n{\n        "source": "process_markdown_extract_with_dynamic_extraction",\n        "markdown_content": markdown_content,\n        "classified_sections": classified_sections,\n        "flattened_sections": flattened_sections,\n        "final_result": final_result,\n    }',
    },
    {
        id: "06d788e1-906e-4601-b112-bda6d2152f26",
        name: "Run One Recipe Twice Concurrently",
        return_broker: "2ce1afd9-0fc0-40d2-b589-b856a53e9182",
        args: [
            {
                name: "recipe_id",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "version",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "model_override",
                required: true,
                data_type: "dict",
                ready: false,
                default_value: null,
            },
            {
                name: "brokers_with_values_1",
                required: false,
                data_type: "dict",
                ready: false,
                default_value: null,
            },
            {
                name: "brokers_with_values_2",
                required: false,
                data_type: "dict",
                ready: false,
                default_value: null,
            },
        ],
        description:
            "\n    Runs a recipe twice in parallel with two sets of broker values and returns both results.\n\n    Args:\n        recipe_id (str): ID of the recipe to run.\n        version (str): Version of the recipe.\n        model_override (dict): Model override parameters.\n        brokers_with_values_1 (dict, optional): Broker values for the first run.\n        brokers_with_values_2 (dict, optional): Broker values for the second run.\n\n    Returns:\n        dict: A dictionary with keys 'recipe_result_1' and 'recipe_result_2', \n              each containing the output from running the recipe with the respective broker values.\n\n    Tags:\n        'concurrent execution', 'recipe processing', 'parallel tasks', 'workflow automation', \n        'data processing', 'result comparison', 'automation', 'task orchestration'\n    ",
    },
    {
        id: "da9323fa-9fe2-4a06-9848-bf20e47268dd",
        name: "Extract Values With Bookmarks",
        return_broker: "7ed8807a-b5cb-4475-b75c-686383f31125",
        args: [
            {
                name: "results_object",
                required: true,
                data_type: "dict",
                ready: false,
                default_value: null,
            },
            {
                name: "bookmarks",
                required: true,
                data_type: "list",
                ready: false,
                default_value: null,
            },
        ],
        description:
            "\n    Extracts values from a results object by using bookmark paths for each bookmark.\n\n    Args:\n        results_object (dict): Source dictionary containing data.\n        bookmarks (list): List of dicts with 'name' and 'bookmark_path' keys.\n\n    Returns:\n        dict: Keys are bookmark names, values are extracted data or error messages if extraction fails.\n\n    Tags:\n        'value extraction', 'results processing', 'bookmark lookup', 'dictionary utilities', 'data navigation', 'content mapping', 'automation', 'path traversal', 'data extraction'\n    ",
    },
    {
        id: "8ff3af1c-3975-4a2d-89d1-0f799c784302",
        name: "Full Markdown Classifier",
        return_broker: "490abd8a-bb15-4ce3-b709-623906bc08de",
        args: [
            {
                name: "text_data",
                required: true,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "remove_line_breaks",
                required: false,
                data_type: "bool",
                ready: false,
                default_value: true,
            },
            {
                name: "remove_thematic_breaks",
                required: false,
                data_type: "bool",
                ready: false,
                default_value: true,
            },
            {
                name: "rules_override",
                required: false,
                data_type: "dict",
                ready: false,
                default_value: null,
            },
            {
                name: "core_broker_id",
                required: false,
                data_type: "str",
                ready: false,
                default_value: null,
            },
            {
                name: "session_manager",
                required: false,
                data_type: "str",
                ready: false,
                default_value: null,
            },
        ],
        description:
            "\n    Classifies sections in markdown text and returns structured information about them.\n\n    Args:\n        text_data (str): The markdown text to analyze.\n        remove_line_breaks (bool, optional): Whether to remove line breaks. Defaults to True.\n        remove_thematic_breaks (bool, optional): Whether to remove thematic breaks. Defaults to True.\n        rules_override (dict, optional): Custom rules for sectioning. Defaults to None.\n        core_broker_id (str, optional): Reference ID for session storage. Defaults to None.\n        session_manager (optional): Manager for storing results in session. Defaults to None.\n\n    Returns:\n        dict: Dictionary with keys:\n              - 'markdown_text': the input markdown.\n              - 'lines': list of classified lines/sections.\n              - 'sections': processed section data.\n              - 'section_texts': extracted text for each section.\n\n    Tags:\n        'markdown analysis', 'section classifier', 'text processing', 'document structuring', 'content extraction', \n        'markdown parsing', 'section handling', 'session storage', 'document analysis', 'content organization'\n    ",
    },
    {
        id: "e2cee96c-85a6-42a6-975d-43a9bb4645a1",
        name: "Enhanced Bookmark Extraction",
        return_broker: "7ed8807a-b5cb-4475-b75c-686383f31125",
        args: [
            {
                name: "results_object",
                required: true,
                data_type: "dict",
                ready: false,
                default_value: null,
            },
            {
                name: "enhanced_bookmarks",
                required: true,
                data_type: "list",
                ready: false,
                default_value: null,
            },
        ],
        description:
            "\n    Extracts values from a data dictionary using user-defined bookmark paths.\n\n    Args:\n        results_object (dict): Source dictionary with data to extract.\n        enhanced_bookmarks (list): List of dicts, each with 'name' (str) and 'path' (list of keys/indices).\n\n    Returns:\n        dict: Maps bookmark names to extracted values for each bookmark in enhanced_bookmarks.\n              Raises ValueError with details if extraction for any bookmark fails.\n\n    Tags:\n        'value extraction', 'data lookup', 'custom bookmarks', 'path traversal', 'dictionary navigation', \n        'results mapping', 'content extraction', 'automation', 'bookmark utilities'\n    ",
    },
];

export const DEFAULT_EXCLUDE_ARG_NAMES = ["recipe_brokers", "session_manager"];

export function getRegisteredFunctions() {
    return cloneDeep(registeredFunctions).map((func) => ({
        ...func,
        args: func.args.filter((arg) => !DEFAULT_EXCLUDE_ARG_NAMES.includes(arg.name)),
    }));
}
