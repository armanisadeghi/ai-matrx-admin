// File: lib/initialSchemas.ts

import {TableSchema, createTypeReference, InferSchemaType} from './schemaRegistry';
import {Json} from "@/types/database.types";

export const initialSchemas: Record<string, TableSchema> = {
    registeredFunction: {
        name: {
            frontend: 'registeredFunction',
            backend: 'registered_function',
            database: 'registered_function',
            pretty: 'Registered Function',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'p_id',
                    pretty: 'ID',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string>(),
                },
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'p_name',
                    pretty: 'Name',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string>(),
                },
            },
            modulePath: {
                alts: {
                    frontend: 'modulePath',
                    backend: 'module_path',
                    database: 'p_module_path',
                    pretty: 'Module Path',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string>(),
                },
            },
            arg: {
                alts: {
                    frontend: 'arg',
                    backend: 'arg',
                    database: 'p_arg',
                    pretty: 'Arguments',
                },
                type: 'object',
                format: 'object',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'arg',
                    typeReference: createTypeReference<ArgType>(),
                },
            },
            systemFunction: {
                alts: {
                    frontend: 'systemFunction',
                    backend: 'system_function',
                    database: 'system_function',
                    pretty: 'System Function',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'system_function',
                    typeReference: createTypeReference<SystemFunctionType[]>(),
                },
            },
            recipeFunction: {
                alts: {
                    frontend: 'recipeFunction',
                    backend: 'recipe_function',
                    database: 'recipe_function',
                    pretty: 'Recipe Functions',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'recipe_function',
                    typeReference: createTypeReference<RecipeFunctionType[]>(),
                },
            },
        },
    },
    systemFunction: {
        name: {
            frontend: 'systemFunction',
            backend: 'system_function',
            database: 'system_function',
            pretty: 'System Function',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'p_id',
                    pretty: 'ID',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string>(),
                },
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'p_name',
                    pretty: 'Name',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string>(),
                },
            },
            description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'p_description',
                    pretty: 'Description',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string | undefined>(),
                },
            },
            sample: {
                alts: {
                    frontend: 'sample',
                    backend: 'sample',
                    database: 'p_sample',
                    pretty: 'Sample',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string | undefined>(),
                },
            },
            inputParams: {
                alts: {
                    frontend: 'inputParams',
                    backend: 'input_params',
                    database: 'p_input_params',
                    pretty: 'Input Parameters',
                },
                type: 'object',
                format: 'object',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<Record<string, unknown> | undefined>(),
                },
            },
            outputOptions: {
                alts: {
                    frontend: 'outputOptions',
                    backend: 'output_options',
                    database: 'p_output_options',
                    pretty: 'Output Options',
                },
                type: 'object',
                format: 'object',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<Record<string, unknown> | undefined>(),
                },
            },
            rfId: {
                alts: {
                    frontend: 'rfId',
                    backend: 'registered_function',
                    database: 'p_registered_function',
                    pretty: 'Registered Function ID',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    databaseTable: 'registeredFunction',
                    typeReference: createTypeReference<string>(),
                },
            },
        },
    },
    arg: {
        name: {
            frontend: 'arg',
            backend: 'arg',
            database: 'arg',
            pretty: 'Argument',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'p_id',
                    pretty: 'ID',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string>(),
                },
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'p_name',
                    pretty: 'Name',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string>(),
                },
            },
            required: {
                alts: {
                    frontend: 'required',
                    backend: 'required',
                    database: 'p_required',
                    pretty: 'Required',
                },
                type: 'boolean',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<boolean | undefined>(),
                },
            },
            default: {
                alts: {
                    frontend: 'default',
                    backend: 'default',
                    database: 'p_default',
                    pretty: 'Default Value',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string | undefined>(),
                },
            },
            dataType: {
                alts: {
                    frontend: 'dataType',
                    backend: 'data_type',
                    database: 'p_data_type',
                    pretty: 'Data Type',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<"str" | "int" | "float" | "bool" | "dict" | "list" | "url" | undefined>(),
                },
            },
            ready: {
                alts: {
                    frontend: 'ready',
                    backend: 'ready',
                    database: 'p_ready',
                    pretty: 'Ready',
                },
                type: 'boolean',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<boolean | undefined>(),
                },
            },
            registeredFunction: {
                alts: {
                    frontend: 'registeredFunction',
                    backend: 'registered_function',
                    database: 'p_registered_function',
                    pretty: 'Registered Function',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    databaseTable: 'registeredFunction',
                    typeReference: createTypeReference<string | undefined>(),
                },
            },
        },
    },
    recipeFunction: {
        name: {
            frontend: 'recipeFunction',
            backend: 'recipe_function',
            database: 'recipe_function',
            pretty: 'Recipe Function',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'p_id',
                    pretty: 'ID',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string>(),
                },
            },
            recipe: {
                alts: {
                    frontend: 'recipe',
                    backend: 'recipe',
                    database: 'p_recipe',
                    pretty: 'Recipe',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    databaseTable: 'recipe',
                    typeReference: createTypeReference<string>(),
                },
            },
            function: {
                alts: {
                    frontend: 'function',
                    backend: 'system_function',
                    database: 'p_system_function',
                    pretty: 'Function',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    databaseTable: 'systemFunction',
                    typeReference: createTypeReference<string>(),
                },
            },
            role: {
                alts: {
                    frontend: 'role',
                    backend: 'role',
                    database: 'p_role',
                    pretty: 'Role',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<"decision" | "validation" | "post_processing" | "pre-Processing" | "rating" | "comparison" | "save_data" | "other">(),
                },
            },
            params: {
                alts: {
                    frontend: 'params',
                    backend: 'params',
                    database: 'p_params',
                    pretty: 'Parameters',
                },
                type: 'object',
                format: 'object',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<Record<string, unknown> | undefined>(),
                },
            },
        },
    },
    recipeWithBrokers: {
        name: {
            frontend: 'recipeWithBrokers',
            backend: 'recipe_with_brokers',
            database: 'recipe_with_brokers',
            pretty: 'Recipe with Brokers',
        },
        schemaType: 'view',
        fields: {
            additional_models: {
                alts: {
                    frontend: 'additionalModels',
                    backend: 'additional_models',
                    database: 'additional_models',
                    pretty: 'Additional Models',
                },
                type: 'object',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<Json | null>(),
                },
            },
            created_at: {
                alts: {
                    frontend: 'createdAt',
                    backend: 'created_at',
                    database: 'created_at',
                    pretty: 'Created At',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string | null>(),
                },
            },
            decision_func: {
                alts: {
                    frontend: 'decisionFunc',
                    backend: 'decision_func',
                    database: 'decision_func',
                    pretty: 'Decision Function',
                },
                type: 'number',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<number | null>(),
                },
            },
            description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    pretty: 'Description',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string | null>(),
                },
            },
            display: {
                alts: {
                    frontend: 'display',
                    backend: 'display',
                    database: 'display',
                    pretty: 'Display',
                },
                type: 'object',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<Json | null>(),
                },
            },
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    pretty: 'ID',
                },
                type: 'number',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<number | null>(),
                },
            },
            input_broker_objects: {
                alts: {
                    frontend: 'inputBrokerObjects',
                    backend: 'input_broker_objects',
                    database: 'input_broker_objects',
                    pretty: 'Input Broker Objects',
                },
                type: 'object',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<Json | null>(),
                },
            },
            input_brokers: {
                alts: {
                    frontend: 'inputBrokers',
                    backend: 'input_brokers',
                    database: 'input_brokers',
                    pretty: 'Input Brokers',
                },
                type: 'object',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<Json | null>(),
                },
            },
            is_public: {
                alts: {
                    frontend: 'isPublic',
                    backend: 'is_public',
                    database: 'is_public',
                    pretty: 'Is Public',
                },
                type: 'boolean',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<boolean | null>(),
                },
            },
            messages: {
                alts: {
                    frontend: 'messages',
                    backend: 'messages',
                    database: 'messages',
                    pretty: 'Messages',
                },
                type: 'object',
                format: 'array',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<Json[] | null>(),
                },
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    pretty: 'Name',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string | null>(),
                },
            },
            next_step_options: {
                alts: {
                    frontend: 'nextStepOptions',
                    backend: 'next_step_options',
                    database: 'next_step_options',
                    pretty: 'Next Step Options',
                },
                type: 'object',
                format: 'array',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<Json[] | null>(),
                },
            },
            optional_processors: {
                alts: {
                    frontend: 'optionalProcessors',
                    backend: 'optional_processors',
                    database: 'optional_processors',
                    pretty: 'Optional Processors',
                },
                type: 'object',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<Json | null>(),
                },
            },
            output_broker_objects: {
                alts: {
                    frontend: 'outputBrokerObjects',
                    backend: 'output_broker_objects',
                    database: 'output_broker_objects',
                    pretty: 'Output Broker Objects',
                },
                type: 'object',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<Json | null>(),
                },
            },
            output_brokers: {
                alts: {
                    frontend: 'outputBrokers',
                    backend: 'output_brokers',
                    database: 'output_brokers',
                    pretty: 'Output Brokers',
                },
                type: 'object',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<Json | null>(),
                },
            },
            overrides: {
                alts: {
                    frontend: 'overrides',
                    backend: 'overrides',
                    database: 'overrides',
                    pretty: 'Overrides',
                },
                type: 'object',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<Json | null>(),
                },
            },
            permanent_processors: {
                alts: {
                    frontend: 'permanentProcessors',
                    backend: 'permanent_processors',
                    database: 'permanent_processors',
                    pretty: 'Permanent Processors',
                },
                type: 'object',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<Json | null>(),
                },
            },
            primary_model: {
                alts: {
                    frontend: 'primaryModel',
                    backend: 'primary_model',
                    database: 'primary_model',
                    pretty: 'Primary Model',
                },
                type: 'number',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<number | null>(),
                },
            },
            recipe_id: {
                alts: {
                    frontend: 'recipeId',
                    backend: 'recipe_id',
                    database: 'recipe_id',
                    pretty: 'Recipe ID',
                },
                type: 'number',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<number | null>(),
                },
            },
            sample_output: {
                alts: {
                    frontend: 'sampleOutput',
                    backend: 'sample_output',
                    database: 'sample_output',
                    pretty: 'Sample Output',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string | null>(),
                },
            },
            status: {
                alts: {
                    frontend: 'status',
                    backend: 'status',
                    database: 'status',
                    pretty: 'Status',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<"draft" | "other" | "in_review" | "active_testing" | "live" | "archived" | null>(),
                },
            },
            tags: {
                alts: {
                    frontend: 'tags',
                    backend: 'tags',
                    database: 'tags',
                    pretty: 'Tags',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string[] | null>(),
                },
            },
            temp_id: {
                alts: {
                    frontend: 'tempId',
                    backend: 'temp_id',
                    database: 'temp_id',
                    pretty: 'Temporary ID',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string | null>(),
                },
            },
            tools: {
                alts: {
                    frontend: 'tools',
                    backend: 'tools',
                    database: 'tools',
                    pretty: 'Tools',
                },
                type: 'number',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<number | null>(),
                },
            },
            updated_at: {
                alts: {
                    frontend: 'updatedAt',
                    backend: 'updated_at',
                    database: 'updated_at',
                    pretty: 'Updated At',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string | null>(),
                },
            },
            user: {
                alts: {
                    frontend: 'user',
                    backend: 'user',
                    database: 'user',
                    pretty: 'User',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string | null>(),
                },
            },
            validation_func: {
                alts: {
                    frontend: 'validationFunc',
                    backend: 'validation_func',
                    database: 'validation_func',
                    pretty: 'Validation Function',
                },
                type: 'number',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<number | null>(),
                },
            },
            version: {
                alts: {
                    frontend: 'version',
                    backend: 'version',
                    database: 'version',
                    pretty: 'Version',
                },
                type: 'number',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<number | null>(),
                },
            },
        },
    },
    someOther3: {
        name: {
            frontend: '',
            backend: '',
            database: '',
            pretty: '',
        },
        schemaType: 'table',
        fields: {
            // paste fields here
        },
    },
    someOther4: {
        name: {
            frontend: '',
            backend: '',
            database: '',
            pretty: '',
        },
        schemaType: 'table',
        fields: {
            // paste fields here
        },
    },
};

// You can also export types here
export type RegisteredFunctionType = InferSchemaType<typeof initialSchemas.registeredFunction>;
export type SystemFunctionType = InferSchemaType<typeof initialSchemas.systemFunction>;
export type RecipeFunctionType = InferSchemaType<typeof initialSchemas.recipeFunction>;
export type ArgType = InferSchemaType<typeof initialSchemas.arg>;
export type RecipeWithBrokersType = InferSchemaType<typeof initialSchemas.recipeWithBrokers>;
export type SomeOther3Type = InferSchemaType<typeof initialSchemas.someOther3>;
export type SomeOther4Type = InferSchemaType<typeof initialSchemas.someOther4>;
