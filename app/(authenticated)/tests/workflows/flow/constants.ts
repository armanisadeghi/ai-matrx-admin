import { cloneDeep } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

export const registeredFunctions = [
    {
        id: "90b0bfd0-37fd-4c39-9ad8-bde3eb175263",
        func_name: "run_one_recipe_twice",
        return_broker: "2ce1afd9-0fc0-40d2-b589-b856a53e9182",
        args: [
            {
                id: "a354c87a-17f0-44a3-a681-76d83fae0bbf",
                name: "recipe_id",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "90b0bfd0-37fd-4c39-9ad8-bde3eb175263",
                default_value: {
                    value: null,
                },
            },
            {
                id: "2ca2fd63-e985-4325-9854-0c73df28ed3a",
                name: "version",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "90b0bfd0-37fd-4c39-9ad8-bde3eb175263",
                default_value: {
                    value: null,
                },
            },
            {
                id: "7d8695b2-3df2-42ea-9173-67fe47324f74",
                name: "brokers_with_values_1",
                required: false,
                data_type: "dict",
                ready: false,
                registered_function: "90b0bfd0-37fd-4c39-9ad8-bde3eb175263",
                default_value: {
                    value: null,
                },
            },
            {
                id: "b4847267-88b0-4b49-8de7-468d498c2db5",
                name: "brokers_with_values_2",
                required: false,
                data_type: "dict",
                ready: false,
                registered_function: "90b0bfd0-37fd-4c39-9ad8-bde3eb175263",
                default_value: {
                    value: null,
                },
            },
        ],
    },
    {
        id: "00567d93-beb0-4b66-a026-cae40a2acbe2",
        func_name: "run_recipe_with_session_brokers",
        return_broker: "784f9b61-81cc-44af-8d24-a1cc3d9eac56",
        args: [
            {
                id: "68d7e5ef-426f-46a0-af93-663be16ffd2f",
                name: "recipe_id",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "00567d93-beb0-4b66-a026-cae40a2acbe2",
                default_value: {
                    value: null,
                },
            },
            {
                id: "fbd485db-0db7-43ae-94a4-83f203ae9599",
                name: "latest_version",
                required: false,
                data_type: "bool",
                ready: false,
                registered_function: "00567d93-beb0-4b66-a026-cae40a2acbe2",
                default_value: {
                    value: true,
                },
            },
            {
                id: "a41d9e75-b85e-477c-96ed-335fb530bddb",
                name: "version",
                required: false,
                data_type: "str",
                ready: false,
                registered_function: "00567d93-beb0-4b66-a026-cae40a2acbe2",
                default_value: {
                    value: null,
                },
            },
            {
                id: "694cec25-1036-49e0-932e-b67273024c3d",
                name: "model_override",
                required: false,
                data_type: "str",
                ready: false,
                registered_function: "00567d93-beb0-4b66-a026-cae40a2acbe2",
                default_value: {
                    value: null,
                },
            },
            {
                id: "bb0fe7fa-36ae-4031-8caf-bdc5c603dbc0",
                name: "tools_override",
                required: false,
                data_type: "list",
                ready: false,
                registered_function: "00567d93-beb0-4b66-a026-cae40a2acbe2",
                default_value: {
                    value: null,
                },
            },
        ],
    },
    {
        id: "f543544d-cf09-4db3-b7d1-b83dd0ce344d",
        func_name: "pdf_processing_orchestrator",
        return_broker: "7ed8807a-b5cb-4475-b75c-686383f31125",
        args: [
            {
                id: "9bc8981b-7898-4d72-9cd0-be298b316253",
                name: "pdf_path",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "f543544d-cf09-4db3-b7d1-b83dd0ce344d",
                default_value: {
                    value: null,
                },
            },
            {
                id: "b438d03c-4caa-48d8-b32d-1aa753c3a4bc",
                name: "chunk_size",
                required: false,
                data_type: "int",
                ready: false,
                registered_function: "f543544d-cf09-4db3-b7d1-b83dd0ce344d",
                default_value: {
                    value: 5000,
                },
            },
            {
                id: "601cde15-3551-4293-abfb-1b68b7bfc518",
                name: "chunk_and_save",
                required: false,
                data_type: "bool",
                ready: false,
                registered_function: "f543544d-cf09-4db3-b7d1-b83dd0ce344d",
                default_value: {
                    value: false,
                },
            },
            {
                id: "d2c6b79f-776b-45a2-84dd-5e97302c5976",
                name: "process_with_ai",
                required: false,
                data_type: "bool",
                ready: false,
                registered_function: "f543544d-cf09-4db3-b7d1-b83dd0ce344d",
                default_value: {
                    value: false,
                },
            },
            {
                id: "a1534516-6c96-479e-aada-40eaf0f2ba3d",
                name: "overlap_size",
                required: false,
                data_type: "int",
                ready: false,
                registered_function: "f543544d-cf09-4db3-b7d1-b83dd0ce344d",
                default_value: {
                    value: 500,
                },
            },
        ],
    },
    {
        id: "b42d270b-0627-453c-a4bb-920eb1da6c51",
        func_name: "orchestrate_text_operations",
        return_broker: "2c5e85c9-a81a-472c-a7bc-d060766244ec",
        args: [
            {
                id: "c350d165-6c61-4589-a6f0-a634b30835b1",
                name: "content",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "b42d270b-0627-453c-a4bb-920eb1da6c51",
                default_value: {
                    value: null,
                },
            },
            {
                id: "7368eacf-057a-4811-b68b-be2065233278",
                name: "instructions",
                required: true,
                data_type: "list",
                ready: false,
                registered_function: "b42d270b-0627-453c-a4bb-920eb1da6c51",
                default_value: {
                    value: null,
                },
            },
        ],
    },
    {
        id: "b870cda8-8789-4189-8ce1-95db7ce09290",
        func_name: "process_markdown_make_flat",
        return_broker: "30f69de4-13c9-40f2-9806-ddf4a63776bc",
        args: [
            {
                id: "3359edf1-28a6-49dd-a247-b303daf9c6c6",
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "b870cda8-8789-4189-8ce1-95db7ce09290",
                default_value: {
                    value: null,
                },
            },
            {
                id: "7cf33358-3475-434b-a55e-0a57e5efbae9",
                name: "method",
                required: false,
                data_type: "str",
                ready: true,
                registered_function: "b870cda8-8789-4189-8ce1-95db7ce09290",
                default_value: {
                    value: "dict_structured",
                },
            },
        ],
    },
    {
        id: "d03ae789-3cde-4263-aea9-79a3eaad2dc6",
        func_name: "process_markdown",
        return_broker: "8c221702-cc7a-4d5a-a940-305454f3d6df",
        args: [
            {
                id: "d4accc89-f151-45d0-befd-06a4befd0b48",
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "d03ae789-3cde-4263-aea9-79a3eaad2dc6",
                default_value: {
                    value: null,
                },
            },
            {
                id: "91ad6fa3-1b9e-4b69-b80b-9d5bf8c04a5d",
                name: "clean_markdown",
                required: false,
                data_type: "str",
                ready: true,
                registered_function: "d03ae789-3cde-4263-aea9-79a3eaad2dc6",
                default_value: {
                    value: true,
                },
            },
            {
                id: "c6ff4be5-55ab-4a2b-a2bf-92ce14f135bb",
                name: "extract_jsons",
                required: false,
                data_type: "str",
                ready: false,
                registered_function: "d03ae789-3cde-4263-aea9-79a3eaad2dc6",
                default_value: {
                    value: true,
                },
            },
            {
                id: "b13a0b5c-cb11-47e9-858b-140cff75973d",
                name: "ignore_line_breaks",
                required: false,
                data_type: "str",
                ready: false,
                registered_function: "d03ae789-3cde-4263-aea9-79a3eaad2dc6",
                default_value: {
                    value: true,
                },
            },
        ],
    },
    {
        id: "88324112-a108-4a27-94bd-671fef2c184d",
        func_name: "process_markdown_extract_with_multiple_configs",
        return_broker: "2ca25554-0db3-47e6-81c1-80b3d792b1c6",
        args: [
            {
                id: "ec0d6037-90dc-417c-8c65-e9e1c5413c58",
                name: "configs",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "88324112-a108-4a27-94bd-671fef2c184d",
                default_value: {
                    value: null,
                },
            },
            {
                id: "c373d905-281d-40a9-8340-00c47e19c425",
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "88324112-a108-4a27-94bd-671fef2c184d",
                default_value: {
                    value: null,
                },
            },
            {
                id: "52f69cad-30ec-48c5-abfd-ae9e69444cd2",
                name: "method",
                required: false,
                data_type: "str",
                ready: true,
                registered_function: "88324112-a108-4a27-94bd-671fef2c184d",
                default_value: {
                    value: "dict_structured",
                },
            },
        ],
    },
    {
        id: "7d3da03f-dde5-4444-81cd-cf5e60defc8e",
        func_name: "process_markdown_extract_with_config",
        return_broker: "37c0abef-4788-4dee-9709-929a193d36d0",
        args: [
            {
                id: "2fba6339-aa18-45cd-a0aa-f7ce95564405",
                name: "config",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "7d3da03f-dde5-4444-81cd-cf5e60defc8e",
                default_value: {
                    value: null,
                },
            },
            {
                id: "7db7ee96-97bd-4f8e-9d8c-bd3bd70b4c46",
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "7d3da03f-dde5-4444-81cd-cf5e60defc8e",
                default_value: {
                    value: null,
                },
            },
            {
                id: "1d39ffd0-e4f2-4a2f-ae31-7cd6f2e95e7e",
                name: "method",
                required: false,
                data_type: "str",
                ready: true,
                registered_function: "7d3da03f-dde5-4444-81cd-cf5e60defc8e",
                default_value: {
                    value: "dict_structured",
                },
            },
        ],
    },
    {
        id: "2ac5576b-d1ab-45b1-ab48-4e196629fdd8",
        func_name: "orchestrate_run_recipe",
        return_broker: "784f9b61-81cc-44af-8d24-a1cc3d9eac56",
        args: [
            {
                id: "d19b67a0-8f81-4694-bd16-287ddc66718b",
                name: "recipe_id",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "2ac5576b-d1ab-45b1-ab48-4e196629fdd8",
                default_value: {
                    value: null,
                },
            },
            {
                id: "7469afcc-4fcd-4c72-8c20-65d1579a588e",
                name: "version",
                required: false,
                data_type: "int",
                ready: false,
                registered_function: "2ac5576b-d1ab-45b1-ab48-4e196629fdd8",
                default_value: {
                    value: null,
                },
            },
            {
                id: "ecfc4cad-e93b-4b53-895d-5da863182ff2",
                name: "model_override",
                required: false,
                data_type: "str",
                ready: false,
                registered_function: "2ac5576b-d1ab-45b1-ab48-4e196629fdd8",
                default_value: {
                    value: null,
                },
            },
            {
                id: "ba6e52f3-5859-4090-ab75-a70c6610140c",
                name: "tools_override",
                required: false,
                data_type: "list",
                ready: false,
                registered_function: "2ac5576b-d1ab-45b1-ab48-4e196629fdd8",
                default_value: {
                    value: null,
                },
            },
            {
                id: "e5c2259e-1fb6-4963-9b51-07f8e323e0aa",
                name: "latest_version",
                required: false,
                data_type: "bool",
                ready: true,
                registered_function: "2ac5576b-d1ab-45b1-ab48-4e196629fdd8",
                default_value: {
                    value: true,
                },
            },
            {
                id: "02eea019-5ef2-4f59-be51-7ff648d95a1a",
                name: "recipe_brokers",
                required: true,
                data_type: "list",
                ready: false,
                registered_function: "2ac5576b-d1ab-45b1-ab48-4e196629fdd8",
                default_value: {
                    value: null,
                },
            },
        ],
    },
    {
        id: "cbdbbf0c-e963-4b5f-bea5-87aa743fcb74",
        func_name: "process_markdown_with_dynamic_extraction",
        return_broker: "9fb9b7e5-c0bd-4e85-b606-21d05550842c",
        args: [
            {
                id: "b98ee26e-cd75-49ce-9f95-4b5aa6f542fe",
                name: "extraction_function_str",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "cbdbbf0c-e963-4b5f-bea5-87aa743fcb74",
                default_value: {
                    value: null,
                },
            },
            {
                id: "b4398612-8773-4a23-8a07-d620bbc17bbf",
                name: "markdown_content",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "cbdbbf0c-e963-4b5f-bea5-87aa743fcb74",
                default_value: {
                    value: null,
                },
            },
            {
                id: "d4ab3dd1-ba2d-4771-b9a0-762f2bee3db8",
                name: "method",
                required: false,
                data_type: "str",
                ready: true,
                registered_function: "cbdbbf0c-e963-4b5f-bea5-87aa743fcb74",
                default_value: {
                    value: "dict_structured",
                },
            },
        ],
    },
    {
        id: "06d788e1-906e-4601-b112-bda6d2152f26",
        func_name: "run_one_recipe_twice_concurrently",
        return_broker: "2ce1afd9-0fc0-40d2-b589-b856a53e9182",
        args: [
            {
                id: "c4188bc4-9cf2-417a-9410-0772b8fd91f1",
                name: "recipe_id",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "06d788e1-906e-4601-b112-bda6d2152f26",
                default_value: {
                    value: null,
                },
            },
            {
                id: "59167b65-34d5-4d46-a69d-9595ae477b51",
                name: "version",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "06d788e1-906e-4601-b112-bda6d2152f26",
                default_value: {
                    value: null,
                },
            },
            {
                id: "63f538a7-ea1b-4b8b-8e30-e140f4206a2e",
                name: "model_override",
                required: true,
                data_type: "dict",
                ready: false,
                registered_function: "06d788e1-906e-4601-b112-bda6d2152f26",
                default_value: {
                    value: null,
                },
            },
            {
                id: "0989b8b7-968e-4773-a6ec-08d50e5eed51",
                name: "brokers_with_values_1",
                required: false,
                data_type: "dict",
                ready: false,
                registered_function: "06d788e1-906e-4601-b112-bda6d2152f26",
                default_value: {
                    value: null,
                },
            },
            {
                id: "16f9ba37-40f3-4608-8dee-d84d43310819",
                name: "brokers_with_values_2",
                required: false,
                data_type: "dict",
                ready: false,
                registered_function: "06d788e1-906e-4601-b112-bda6d2152f26",
                default_value: {
                    value: null,
                },
            },
        ],
    },
    {
        id: "8ff3af1c-3975-4a2d-89d1-0f799c784302",
        func_name: "full_markdown_classifier",
        return_broker: "490abd8a-bb15-4ce3-b709-623906bc08de",
        args: [
            {
                id: "bc3bfd7a-d8c1-4589-b13d-5861b20a0972",
                name: "text_data",
                required: true,
                data_type: "str",
                ready: false,
                registered_function: "8ff3af1c-3975-4a2d-89d1-0f799c784302",
                default_value: {
                    value: null,
                },
            },
            {
                id: "3fce8471-3b1e-4664-a486-c258b1b7a4a1",
                name: "remove_line_breaks",
                required: false,
                data_type: "bool",
                ready: false,
                registered_function: "8ff3af1c-3975-4a2d-89d1-0f799c784302",
                default_value: {
                    value: true,
                },
            },
            {
                id: "fa9db855-1ac5-48d7-9934-f98415916659",
                name: "remove_thematic_breaks",
                required: false,
                data_type: "bool",
                ready: false,
                registered_function: "8ff3af1c-3975-4a2d-89d1-0f799c784302",
                default_value: {
                    value: true,
                },
            },
            {
                id: "2f024168-cdb3-48c3-8e2d-310f8b98377c",
                name: "rules_override",
                required: false,
                data_type: "dict",
                ready: false,
                registered_function: "8ff3af1c-3975-4a2d-89d1-0f799c784302",
                default_value: {
                    value: null,
                },
            },
            {
                id: "4ef3a3d3-98e9-44ec-92ab-1a39219bcbf3",
                name: "core_broker_id",
                required: false,
                data_type: "str",
                ready: false,
                registered_function: "8ff3af1c-3975-4a2d-89d1-0f799c784302",
                default_value: {
                    value: null,
                },
            },
            {
                id: "8dfaf865-a497-4183-863b-9e7b4290e8be",
                name: "session_manager",
                required: false,
                data_type: "str",
                ready: false,
                registered_function: "8ff3af1c-3975-4a2d-89d1-0f799c784302",
                default_value: {
                    value: null,
                },
            },
        ],
    },
];

// Represents a dependency between two broker ids.
export interface WorkflowDependency {
    source_broker_id: string; // Required field for the the broker id
    target_broker_id?: string; // Optional target broker id
}

// Represents an override for a function argument
export interface ArgumentOverride {
    name: string; // Official argument name for this specific Registered Function.
    default_value?: any; // Overrides the default value which is pre-defined in the Registered Function.
    ready: boolean; // Indicates if the argument is ready (Should always default to false, until overriden by the user)
}

// Represents a mapping of arguments to broker IDs
export interface ArgumentMapping {
    source_broker_id: string; // ID of the broker
    target_arg_name: string; // Official argument name for this specific Registered Function.
}

export interface BaseNode {
    id: string; // Auto-generated by the database (Never set in React.)
    function_id?: string; // UUID, Foreign Key to the Registered Function.
    function_type?: string; // Nearly always set to "registered_function"
    step_name?: string; // Varchar, nullable (Human readable name for the step.)
    execution_required?: boolean; // Boolean, nullable (If true, the only thing that changes is that the workflow will 'fail' if it doesn't execute.)
    additional_dependencies?: WorkflowDependency[]; // JSONB, Ensures the function does not execute until the source_broker_id is updated and 'ready'=True. If a target is provided, the value of this broker is also passed to the target.
    arg_mapping?: ArgumentMapping[]; // JSONB, This is where args get their values during a workflow run or if there is a user input.
    return_broker_overrides?: string[]; // JSONB, nullable, array of strings (When the function executes, in addition to it's default broker id, these will also get the same value.)
    arg_overrides?: ArgumentOverride[]; // JSONB, nullable, Overides the default settings for a registered function's arguments. (default_value and ready state.)
    workflow_id?: string; // UUID, nullable (Foreign Key to the Workflow.)
}

export function getNormalizedRegisteredFunctionNode(function_id: string): BaseNode {
    const function_data = registeredFunctions.find(f => f.id === function_id);
    if (!function_data) {
        throw new Error(`Function with id ${function_id} not found`);
    }

    const arg_overrides: ArgumentOverride[] = function_data.args.map(arg => ({
        name: arg.name,
        default_value: cloneDeep(arg.default_value.value), // Deep copy the value
        ready: arg.ready,
    }));

    const node: BaseNode = {
        id: uuidv4(),
        function_id: function_data.id,
        function_type: "registered_function",
        step_name: "Unnamed Step",
        execution_required: false,
        additional_dependencies: [],
        arg_mapping: [],
        return_broker_overrides: [function_data.return_broker],
        arg_overrides: arg_overrides,
        workflow_id: null,
    }

    return node;
}


export function validateNodeUpdate(node: BaseNode): boolean {
    // Ensure function_id exists and is valid
    if (!node.function_id) {
        throw new Error('Node must have a valid function_id');
    }

    const functionData = registeredFunctions.find(f => f.id === node.function_id);
    if (!functionData) {
        throw new Error(`Function with id ${node.function_id} not found`);
    }

    // Get valid argument names from the registered function
    const validArgNames = new Set(functionData.args.map(arg => arg.name));

    // Validate arg_overrides
    if (node.arg_overrides) {
        for (const override of node.arg_overrides) {
            if (!validArgNames.has(override.name)) {
                throw new Error(`Invalid argument override name: ${override.name}. Must be one of: ${Array.from(validArgNames).join(', ')}`);
            }
        }
    }

    // Validate arg_mapping
    if (node.arg_mapping) {
        for (const mapping of node.arg_mapping) {
            if (!validArgNames.has(mapping.target_arg_name)) {
                throw new Error(`Invalid argument mapping name: ${mapping.target_arg_name}. Must be one of: ${Array.from(validArgNames).join(', ')}`);
            }
        }
    }

    // Validate basic node structure
    if (node.function_type !== 'registered_function') {
        throw new Error('Node function_type must be "registered_function"');
    }

    if (!node.id) {
        throw new Error('Node must have a valid id');
    }

    return true;
}

// Adds a broker mapping to a node for a specific argument
export function addBrokerMapping(node: BaseNode, brokerId: string, argName: string): BaseNode {
    if (!node.function_id) {
        throw new Error('Node must have a valid function_id');
    }

    const functionData = registeredFunctions.find(f => f.id === node.function_id);
    if (!functionData) {
        throw new Error(`Function with id ${node.function_id} not found`);
    }

    // Validate the argument name
    const validArgNames = new Set(functionData.args.map(arg => arg.name));
    if (!validArgNames.has(argName)) {
        throw new Error(`Invalid argument name: ${argName}. Must be one of: ${Array.from(validArgNames).join(', ')}`);
    }

    // Create a deep copy of the node to avoid mutating the original
    const updatedNode = cloneDeep(node);

    // Initialize arg_mapping if it doesn't exist
    if (!updatedNode.arg_mapping) {
        updatedNode.arg_mapping = [];
    }

    // Check if a mapping for this argName already exists
    const existingMappingIndex = updatedNode.arg_mapping.findIndex(
        mapping => mapping.target_arg_name === argName
    );

    const newMapping: ArgumentMapping = {
        source_broker_id: brokerId,
        target_arg_name: argName
    };

    if (existingMappingIndex !== -1) {
        // Update existing mapping
        updatedNode.arg_mapping[existingMappingIndex] = newMapping;
    } else {
        // Add new mapping
        updatedNode.arg_mapping.push(newMapping);
    }

    // Validate the updated node
    validateNodeUpdate(updatedNode);

    return updatedNode;
}

export interface SelectOption {
    value: string; // The function ID
    label: string; // The function name
}

// Returns registered functions formatted as select component options
export function getRegisteredFunctionSelectOptions(): SelectOption[] {
    return registeredFunctions.map(func => ({
        value: func.id,
        label: func.func_name
    }));
}