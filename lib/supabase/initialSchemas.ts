// File: lib/initialSchemas.ts

import {TableSchema, createTypeReference, InferSchemaType} from './schemaRegistry';

export const initialSchemas: Record<string, TableSchema> = {
    registeredFunction: {
        name: {
            frontend: 'registeredFunction',
            backend: 'registered_function',
            database: 'registered_function',
        },
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'p_id',
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
        },
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'p_id',
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
        },
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'p_id',
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
        },
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'p_id',
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
    someOther3: {
        name: {
            frontend: '',
            backend: '',
            database: '',
        },
        fields: {
            // paste fields here
        },
    },
    someOther4: {
        name: {
            frontend: '',
            backend: '',
            database: '',
        },
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
export type SomeOther3Type = InferSchemaType<typeof initialSchemas.someOther3>;
export type SomeOther4Type = InferSchemaType<typeof initialSchemas.someOther4>;
