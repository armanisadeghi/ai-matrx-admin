import { cloneDeep } from 'lodash';

const registeredFunctions = [
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

export const DEFAULT_EXCLUDE_ARG_NAMES = ["recipe_brokers", "session_manager"];


export function getRegisteredFunctions() {
    return cloneDeep(registeredFunctions).map(func => ({
        ...func,
        args: func.args.filter(arg => !DEFAULT_EXCLUDE_ARG_NAMES.includes(arg.name)),
    }));
}