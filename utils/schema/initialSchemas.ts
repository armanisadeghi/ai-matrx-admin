// File: lib/initialSchemas.ts

import {TableSchema, createTypeReference, InferSchemaType} from './schemaRegistry';

export const initialSchemas: Record<string, TableSchema> = {
    action: {
        name: {
            frontend: 'action',
            backend: 'action',
            database: 'action',
            pretty: 'Action',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            matrix: {
                alts: {
                    frontend: 'matrix',
                    backend: 'matrix',
                    database: 'matrix',
                    db_p: 'p_matrix',
                    pretty: 'Matrix',
                    component: 'Matrix',
                    kebab: 'matrix',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            transformer: {
                alts: {
                    frontend: 'transformer',
                    backend: 'transformer',
                    database: 'transformer',
                    db_p: 'p_transformer',
                    pretty: 'Transformer',
                    component: 'Transformer',
                    kebab: 'transformer',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            nodeType: {
                alts: {
                    frontend: 'nodeType',
                    backend: 'node_type',
                    database: 'node_type',
                    db_p: 'p_node_type',
                    pretty: 'Node Type',
                    component: 'NodeType',
                    kebab: 'node-type',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            referenceId: {
                alts: {
                    frontend: 'referenceId',
                    backend: 'reference_id',
                    database: 'reference_id',
                    db_p: 'p_reference_id',
                    pretty: 'Reference Id',
                    component: 'ReferenceId',
                    kebab: 'reference-id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            automationMatrixReference: {
                alts: {
                    frontend: 'automationMatrixReference',
                    backend: 'automation_matrix_reference',
                    database: 'ref_automation_matrix',
                    db_p: 'p_ref_automation_matrix',
                    pretty: 'Automation Matrix Reference',
                    component: 'AutomationMatrixReference',
                    kebab: 'automation-matrixReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<AutomationMatrixType>(),
                }
            },
            transformerReference: {
                alts: {
                    frontend: 'transformerReference',
                    backend: 'transformer_reference',
                    database: 'ref_transformer',
                    db_p: 'p_ref_transformer',
                    pretty: 'Transformer Reference',
                    component: 'TransformerReference',
                    kebab: 'transformerReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<TransformerType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndFk",
            foreignKeys: [
                {column: 'matrix', relatedTable: 'automation_matrix', relatedColumn: 'id'},
                {column: 'transformer', relatedTable: 'transformer', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
    aiEndpoint: {
        name: {
            frontend: 'aiEndpoint',
            backend: 'ai_endpoint',
            database: 'ai_endpoint',
            pretty: 'Ai Endpoint',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            provider: {
                alts: {
                    frontend: 'provider',
                    backend: 'provider',
                    database: 'provider',
                    db_p: 'p_provider',
                    pretty: 'Provider',
                    component: 'Provider',
                    kebab: 'provider',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    db_p: 'p_description',
                    pretty: 'Description',
                    component: 'Description',
                    kebab: 'description',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            additionalCost: {
                alts: {
                    frontend: 'additionalCost',
                    backend: 'additional_cost',
                    database: 'additional_cost',
                    db_p: 'p_additional_cost',
                    pretty: 'Additional Cost',
                    component: 'AdditionalCost',
                    kebab: 'additional-cost',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },
            costDetails: {
                alts: {
                    frontend: 'costDetails',
                    backend: 'cost_details',
                    database: 'cost_details',
                    db_p: 'p_cost_details',
                    pretty: 'Cost Details',
                    component: 'CostDetails',
                    kebab: 'cost-details',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            params: {
                alts: {
                    frontend: 'params',
                    backend: 'params',
                    database: 'params',
                    db_p: 'p_params',
                    pretty: 'Params',
                    component: 'Params',
                    kebab: 'params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "simple",
            foreignKeys: [],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
    aiModel: {
        name: {
            frontend: 'aiModel',
            backend: 'ai_model',
            database: 'ai_model',
            pretty: 'Ai Model',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            commonName: {
                alts: {
                    frontend: 'commonName',
                    backend: 'common_name',
                    database: 'common_name',
                    db_p: 'p_common_name',
                    pretty: 'Common Name',
                    component: 'CommonName',
                    kebab: 'common-name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            modelClass: {
                alts: {
                    frontend: 'modelClass',
                    backend: 'model_class',
                    database: 'model_class',
                    db_p: 'p_model_class',
                    pretty: 'Model Class',
                    component: 'ModelClass',
                    kebab: 'model-class',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            provider: {
                alts: {
                    frontend: 'provider',
                    backend: 'provider',
                    database: 'provider',
                    db_p: 'p_provider',
                    pretty: 'Provider',
                    component: 'Provider',
                    kebab: 'provider',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            endpoints: {
                alts: {
                    frontend: 'endpoints',
                    backend: 'endpoints',
                    database: 'endpoints',
                    db_p: 'p_endpoints',
                    pretty: 'Endpoints',
                    component: 'Endpoints',
                    kebab: 'endpoints',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            contextWindow: {
                alts: {
                    frontend: 'contextWindow',
                    backend: 'context_window',
                    database: 'context_window',
                    db_p: 'p_context_window',
                    pretty: 'Context Window',
                    component: 'ContextWindow',
                    kebab: 'context-window',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            maxTokens: {
                alts: {
                    frontend: 'maxTokens',
                    backend: 'max_tokens',
                    database: 'max_tokens',
                    db_p: 'p_max_tokens',
                    pretty: 'Max Tokens',
                    component: 'MaxTokens',
                    kebab: 'max-tokens',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            capabilities: {
                alts: {
                    frontend: 'capabilities',
                    backend: 'capabilities',
                    database: 'capabilities',
                    db_p: 'p_capabilities',
                    pretty: 'Capabilities',
                    component: 'Capabilities',
                    kebab: 'capabilities',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            controls: {
                alts: {
                    frontend: 'controls',
                    backend: 'controls',
                    database: 'controls',
                    db_p: 'p_controls',
                    pretty: 'Controls',
                    component: 'Controls',
                    kebab: 'controls',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            recipeModelInverse: {
                alts: {
                    frontend: 'recipeModelInverse',
                    backend: 'recipe_model_Inverse',
                    database: 'ifk_recipe_model',
                    db_p: 'p_ifk_recipe_model',
                    pretty: 'Recipe Model Inverse',
                    component: 'RecipeModelInverse',
                    kebab: 'recipe-modelInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'recipe_model',
                    typeReference: createTypeReference<RecipeModelType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndIfk",
            foreignKeys: [],
            inverseForeignKeys: [
                {relatedTable: 'recipe_model', relatedColumn: 'ai_model', mainTableColumn: 'id'}
            ],
            manyToMany: [
                {
                    junctionTable: 'recipe_model',
                    relatedTable: 'recipe',
                    mainTableColumn: 'ai_model',
                    relatedTableColumn: 'recipe'
                }
            ],

        }
    },
    arg: {
        name: {
            frontend: 'arg',
            backend: 'arg',
            database: 'arg',
            pretty: 'Arg',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            required: {
                alts: {
                    frontend: 'required',
                    backend: 'required',
                    database: 'required',
                    db_p: 'p_required',
                    pretty: 'Required',
                    component: 'Required',
                    kebab: 'required',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },
            default: {
                alts: {
                    frontend: 'default',
                    backend: 'default',
                    database: 'default',
                    db_p: 'p_default',
                    pretty: 'Default',
                    component: 'Default',
                    kebab: 'default',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            dataType: {
                alts: {
                    frontend: 'dataType',
                    backend: 'data_type',
                    database: 'data_type',
                    db_p: 'p_data_type',
                    pretty: 'Data Type',
                    component: 'DataType',
                    kebab: 'data-type',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"bool" | "dict" | "float" | "int" | "list" | "str" | "url" | undefined>(),
                }
            },
            ready: {
                alts: {
                    frontend: 'ready',
                    backend: 'ready',
                    database: 'ready',
                    db_p: 'p_ready',
                    pretty: 'Ready',
                    component: 'Ready',
                    kebab: 'ready',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },
            registeredFunction: {
                alts: {
                    frontend: 'registeredFunction',
                    backend: 'registered_function',
                    database: 'registered_function',
                    db_p: 'p_registered_function',
                    pretty: 'Registered Function',
                    component: 'RegisteredFunction',
                    kebab: 'registered-function',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            registeredFunctionReference: {
                alts: {
                    frontend: 'registeredFunctionReference',
                    backend: 'registered_function_reference',
                    database: 'ref_registered_function',
                    db_p: 'p_ref_registered_function',
                    pretty: 'Registered Function Reference',
                    component: 'RegisteredFunctionReference',
                    kebab: 'registered-functionReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<RegisteredFunctionType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "fk",
            foreignKeys: [
                {column: 'registered_function', relatedTable: 'registered_function', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
    automationBoundaryBroker: {
        name: {
            frontend: 'automationBoundaryBroker',
            backend: 'automation_boundary_broker',
            database: 'automation_boundary_broker',
            pretty: 'Automation Boundary Broker',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            matrix: {
                alts: {
                    frontend: 'matrix',
                    backend: 'matrix',
                    database: 'matrix',
                    db_p: 'p_matrix',
                    pretty: 'Matrix',
                    component: 'Matrix',
                    kebab: 'matrix',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            broker: {
                alts: {
                    frontend: 'broker',
                    backend: 'broker',
                    database: 'broker',
                    db_p: 'p_broker',
                    pretty: 'Broker',
                    component: 'Broker',
                    kebab: 'broker',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            sparkSource: {
                alts: {
                    frontend: 'sparkSource',
                    backend: 'spark_source',
                    database: 'spark_source',
                    db_p: 'p_spark_source',
                    pretty: 'Spark Source',
                    component: 'SparkSource',
                    kebab: 'spark-source',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"api" | "chance" | "database" | "environment" | "file" | "function" | "generated_data" | "none" | "user_input" | undefined>(),
                }
            },
            beaconDestination: {
                alts: {
                    frontend: 'beaconDestination',
                    backend: 'beacon_destination',
                    database: 'beacon_destination',
                    db_p: 'p_beacon_destination',
                    pretty: 'Beacon Destination',
                    component: 'BeaconDestination',
                    kebab: 'beacon-destination',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"api_response" | "database" | "file" | "function" | "user_output" | undefined>(),
                }
            },
            brokerReference: {
                alts: {
                    frontend: 'brokerReference',
                    backend: 'broker_reference',
                    database: 'ref_broker',
                    db_p: 'p_ref_broker',
                    pretty: 'Broker Reference',
                    component: 'BrokerReference',
                    kebab: 'brokerReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<BrokerType>(),
                }
            },
            automationMatrixReference: {
                alts: {
                    frontend: 'automationMatrixReference',
                    backend: 'automation_matrix_reference',
                    database: 'ref_automation_matrix',
                    db_p: 'p_ref_automation_matrix',
                    pretty: 'Automation Matrix Reference',
                    component: 'AutomationMatrixReference',
                    kebab: 'automation-matrixReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<AutomationMatrixType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndFk",
            foreignKeys: [
                {column: 'broker', relatedTable: 'broker', relatedColumn: 'id'},
                {column: 'matrix', relatedTable: 'automation_matrix', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
    automationMatrix: {
        name: {
            frontend: 'automationMatrix',
            backend: 'automation_matrix',
            database: 'automation_matrix',
            pretty: 'Automation Matrix',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    db_p: 'p_description',
                    pretty: 'Description',
                    component: 'Description',
                    kebab: 'description',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            averageSeconds: {
                alts: {
                    frontend: 'averageSeconds',
                    backend: 'average_seconds',
                    database: 'average_seconds',
                    db_p: 'p_average_seconds',
                    pretty: 'Average Seconds',
                    component: 'AverageSeconds',
                    kebab: 'average-seconds',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            isAutomated: {
                alts: {
                    frontend: 'isAutomated',
                    backend: 'is_automated',
                    database: 'is_automated',
                    db_p: 'p_is_automated',
                    pretty: 'Is Automated',
                    component: 'IsAutomated',
                    kebab: 'is-automated',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },
            cognitionMatrices: {
                alts: {
                    frontend: 'cognitionMatrices',
                    backend: 'cognition_matrices',
                    database: 'cognition_matrices',
                    db_p: 'p_cognition_matrices',
                    pretty: 'Cognition Matrices',
                    component: 'CognitionMatrices',
                    kebab: 'cognition-matrices',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"agent_crew" | "agent_mixture" | "conductor" | "hypercluster" | "knowledge_matrix" | "monte_carlo" | "the_matrix" | "workflow" | undefined>(),
                }
            },
            actionInverse: {
                alts: {
                    frontend: 'actionInverse',
                    backend: 'action_Inverse',
                    database: 'ifk_action',
                    db_p: 'p_ifk_action',
                    pretty: 'Action Inverse',
                    component: 'ActionInverse',
                    kebab: 'actionInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'action',
                    typeReference: createTypeReference<ActionType>(),
                }
            },
            automationBoundaryBrokerInverse: {
                alts: {
                    frontend: 'automationBoundaryBrokerInverse',
                    backend: 'automation_boundary_broker_Inverse',
                    database: 'ifk_automation_boundary_broker',
                    db_p: 'p_ifk_automation_boundary_broker',
                    pretty: 'Automation Boundary Broker Inverse',
                    component: 'AutomationBoundaryBrokerInverse',
                    kebab: 'automation-boundary-brokerInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'automation_boundary_broker',
                    typeReference: createTypeReference<AutomationBoundaryBrokerType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndIfk",
            foreignKeys: [],
            inverseForeignKeys: [
                {relatedTable: 'action', relatedColumn: 'matrix', mainTableColumn: 'id'},
                {relatedTable: 'automation_boundary_broker', relatedColumn: 'matrix', mainTableColumn: 'id'}
            ],
            manyToMany: [
                {
                    junctionTable: 'action',
                    relatedTable: 'transformer',
                    mainTableColumn: 'matrix',
                    relatedTableColumn: 'transformer'
                },
                {
                    junctionTable: 'automation_boundary_broker',
                    relatedTable: 'broker',
                    mainTableColumn: 'matrix',
                    relatedTableColumn: 'broker'
                }
            ],

        }
    },
    broker: {
        name: {
            frontend: 'broker',
            backend: 'broker',
            database: 'broker',
            pretty: 'Broker',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            value: {
                alts: {
                    frontend: 'value',
                    backend: 'value',
                    database: 'value',
                    db_p: 'p_value',
                    pretty: 'Value',
                    component: 'Value',
                    kebab: 'value',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            dataType: {
                alts: {
                    frontend: 'dataType',
                    backend: 'data_type',
                    database: 'data_type',
                    db_p: 'p_data_type',
                    pretty: 'Data Type',
                    component: 'DataType',
                    kebab: 'data-type',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"bool" | "dict" | "float" | "int" | "list" | "str" | "url" | undefined>(),
                }
            },
            ready: {
                alts: {
                    frontend: 'ready',
                    backend: 'ready',
                    database: 'ready',
                    db_p: 'p_ready',
                    pretty: 'Ready',
                    component: 'Ready',
                    kebab: 'ready',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },
            defaultSource: {
                alts: {
                    frontend: 'defaultSource',
                    backend: 'default_source',
                    database: 'default_source',
                    db_p: 'p_default_source',
                    pretty: 'Default Source',
                    component: 'DefaultSource',
                    kebab: 'default-source',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"api" | "chance" | "database" | "environment" | "file" | "function" | "generated_data" | "none" | "user_input" | undefined>(),
                }
            },
            displayName: {
                alts: {
                    frontend: 'displayName',
                    backend: 'display_name',
                    database: 'display_name',
                    db_p: 'p_display_name',
                    pretty: 'Display Name',
                    component: 'DisplayName',
                    kebab: 'display-name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    db_p: 'p_description',
                    pretty: 'Description',
                    component: 'Description',
                    kebab: 'description',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            tooltip: {
                alts: {
                    frontend: 'tooltip',
                    backend: 'tooltip',
                    database: 'tooltip',
                    db_p: 'p_tooltip',
                    pretty: 'Tooltip',
                    component: 'Tooltip',
                    kebab: 'tooltip',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            validationRules: {
                alts: {
                    frontend: 'validationRules',
                    backend: 'validation_rules',
                    database: 'validation_rules',
                    db_p: 'p_validation_rules',
                    pretty: 'Validation Rules',
                    component: 'ValidationRules',
                    kebab: 'validation-rules',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            sampleEntries: {
                alts: {
                    frontend: 'sampleEntries',
                    backend: 'sample_entries',
                    database: 'sample_entries',
                    db_p: 'p_sample_entries',
                    pretty: 'Sample Entries',
                    component: 'SampleEntries',
                    kebab: 'sample-entries',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            customSourceComponent: {
                alts: {
                    frontend: 'customSourceComponent',
                    backend: 'custom_source_component',
                    database: 'custom_source_component',
                    db_p: 'p_custom_source_component',
                    pretty: 'Custom Source Component',
                    component: 'CustomSourceComponent',
                    kebab: 'custom-source-component',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            additionalParams: {
                alts: {
                    frontend: 'additionalParams',
                    backend: 'additional_params',
                    database: 'additional_params',
                    db_p: 'p_additional_params',
                    pretty: 'Additional Params',
                    component: 'AdditionalParams',
                    kebab: 'additional-params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            otherSourceParams: {
                alts: {
                    frontend: 'otherSourceParams',
                    backend: 'other_source_params',
                    database: 'other_source_params',
                    db_p: 'p_other_source_params',
                    pretty: 'Other Source Params',
                    component: 'OtherSourceParams',
                    kebab: 'other-source-params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            defaultDestination: {
                alts: {
                    frontend: 'defaultDestination',
                    backend: 'default_destination',
                    database: 'default_destination',
                    db_p: 'p_default_destination',
                    pretty: 'Default Destination',
                    component: 'DefaultDestination',
                    kebab: 'default-destination',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"api_response" | "database" | "file" | "function" | "user_output" | undefined>(),
                }
            },
            outputComponent: {
                alts: {
                    frontend: 'outputComponent',
                    backend: 'output_component',
                    database: 'output_component',
                    db_p: 'p_output_component',
                    pretty: 'Output Component',
                    component: 'OutputComponent',
                    kebab: 'output-component',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"3DModelViewer" | "AudioOutput" | "BucketList" | "BudgetVisualizer" | "Calendar" | "Carousel" | "Checklist" | "Clock" | "CodeView" | "ComplexMulti" | "DataFlowDiagram" | "DecisionTree" | "DiffViewer" | "FileOutput" | "FitnessTracker" | "Flowchart" | "Form" | "GanttChart" | "GeographicMap" | "GlossaryView" | "Heatmap" | "HorizontalList" | "ImageView" | "InteractiveChart" | "JsonViewer" | "KanbanBoard" | "LaTeXRenderer" | "LiveTraffic" | "LocalEvents" | "MarkdownViewer" | "MealPlanner" | "MindMap" | "NeedNewOption" | "NetworkGraph" | "NewsAggregator" | "PDFViewer" | "PivotTable" | "PlainText" | "Presentation" | "PublicLiveCam" | "RichTextEditor" | "RunCodeBack" | "RunCodeFront" | "SVGEditor" | "SankeyDiagram" | "SatelliteView" | "SocialMediaInfo" | "SpectrumAnalyzer" | "Spreadsheet" | "Table" | "TaskPrioritization" | "Textarea" | "Thermometer" | "Timeline" | "TravelPlanner" | "TreeView" | "UMLDiagram" | "VerticalList" | "VoiceSentimentAnalysis" | "WeatherDashboard" | "WeatherMap" | "WordHighlighter" | "WordMap" | "chatResponse" | "none" | "video" | undefined>(),
                }
            },
            tags: {
                alts: {
                    frontend: 'tags',
                    backend: 'tags',
                    database: 'tags',
                    db_p: 'p_tags',
                    pretty: 'Tags',
                    component: 'Tags',
                    kebab: 'tags',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            dataInputComponentReference: {
                alts: {
                    frontend: 'dataInputComponentReference',
                    backend: 'data_input_component_reference',
                    database: 'ref_data_input_component',
                    db_p: 'p_ref_data_input_component',
                    pretty: 'Data Input Component Reference',
                    component: 'DataInputComponentReference',
                    kebab: 'data-input-componentReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<DataInputComponentType>(),
                }
            },
            recipeBrokerInverse: {
                alts: {
                    frontend: 'recipeBrokerInverse',
                    backend: 'recipe_broker_Inverse',
                    database: 'ifk_recipe_broker',
                    db_p: 'p_ifk_recipe_broker',
                    pretty: 'Recipe Broker Inverse',
                    component: 'RecipeBrokerInverse',
                    kebab: 'recipe-brokerInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'recipe_broker',
                    typeReference: createTypeReference<RecipeBrokerType>(),
                }
            },
            registeredFunctionInverse: {
                alts: {
                    frontend: 'registeredFunctionInverse',
                    backend: 'registered_function_Inverse',
                    database: 'ifk_registered_function',
                    db_p: 'p_ifk_registered_function',
                    pretty: 'Registered Function Inverse',
                    component: 'RegisteredFunctionInverse',
                    kebab: 'registered-functionInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'registered_function',
                    typeReference: createTypeReference<RegisteredFunctionType>(),
                }
            },
            automationBoundaryBrokerInverse: {
                alts: {
                    frontend: 'automationBoundaryBrokerInverse',
                    backend: 'automation_boundary_broker_Inverse',
                    database: 'ifk_automation_boundary_broker',
                    db_p: 'p_ifk_automation_boundary_broker',
                    pretty: 'Automation Boundary Broker Inverse',
                    component: 'AutomationBoundaryBrokerInverse',
                    kebab: 'automation-boundary-brokerInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'automation_boundary_broker',
                    typeReference: createTypeReference<AutomationBoundaryBrokerType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "fkIfkAndM2M",
            foreignKeys: [
                {column: 'custom_source_component', relatedTable: 'data_input_component', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [
                {relatedTable: 'recipe_broker', relatedColumn: 'broker', mainTableColumn: 'id'},
                {relatedTable: 'registered_function', relatedColumn: 'return_broker', mainTableColumn: 'id'},
                {relatedTable: 'automation_boundary_broker', relatedColumn: 'broker', mainTableColumn: 'id'}
            ],
            manyToMany: [
                {
                    junctionTable: 'automation_boundary_broker',
                    relatedTable: 'automation_matrix',
                    mainTableColumn: 'broker',
                    relatedTableColumn: 'matrix'
                },
                {
                    junctionTable: 'recipe_broker',
                    relatedTable: 'recipe',
                    mainTableColumn: 'broker',
                    relatedTableColumn: 'recipe'
                }
            ],

        }
    },
    dataInputComponent: {
        name: {
            frontend: 'dataInputComponent',
            backend: 'data_input_component',
            database: 'data_input_component',
            pretty: 'Data Input Component',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            options: {
                alts: {
                    frontend: 'options',
                    backend: 'options',
                    database: 'options',
                    db_p: 'p_options',
                    pretty: 'Options',
                    component: 'Options',
                    kebab: 'options',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            includeOther: {
                alts: {
                    frontend: 'includeOther',
                    backend: 'include_other',
                    database: 'include_other',
                    db_p: 'p_include_other',
                    pretty: 'Include Other',
                    component: 'IncludeOther',
                    kebab: 'include-other',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },
            min: {
                alts: {
                    frontend: 'min',
                    backend: 'min',
                    database: 'min',
                    db_p: 'p_min',
                    pretty: 'Min',
                    component: 'Min',
                    kebab: 'min',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            max: {
                alts: {
                    frontend: 'max',
                    backend: 'max',
                    database: 'max',
                    db_p: 'p_max',
                    pretty: 'Max',
                    component: 'Max',
                    kebab: 'max',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            step: {
                alts: {
                    frontend: 'step',
                    backend: 'step',
                    database: 'step',
                    db_p: 'p_step',
                    pretty: 'Step',
                    component: 'Step',
                    kebab: 'step',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            minRows: {
                alts: {
                    frontend: 'minRows',
                    backend: 'min_rows',
                    database: 'min_rows',
                    db_p: 'p_min_rows',
                    pretty: 'Min Rows',
                    component: 'MinRows',
                    kebab: 'min-rows',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            maxRows: {
                alts: {
                    frontend: 'maxRows',
                    backend: 'max_rows',
                    database: 'max_rows',
                    db_p: 'p_max_rows',
                    pretty: 'Max Rows',
                    component: 'MaxRows',
                    kebab: 'max-rows',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            acceptableFiletypes: {
                alts: {
                    frontend: 'acceptableFiletypes',
                    backend: 'acceptable_filetypes',
                    database: 'acceptable_filetypes',
                    db_p: 'p_acceptable_filetypes',
                    pretty: 'Acceptable Filetypes',
                    component: 'AcceptableFiletypes',
                    kebab: 'acceptable-filetypes',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            src: {
                alts: {
                    frontend: 'src',
                    backend: 'src',
                    database: 'src',
                    db_p: 'p_src',
                    pretty: 'Src',
                    component: 'Src',
                    kebab: 'src',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            classes: {
                alts: {
                    frontend: 'classes',
                    backend: 'classes',
                    database: 'classes',
                    db_p: 'p_classes',
                    pretty: 'Classes',
                    component: 'Classes',
                    kebab: 'classes',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            colorOverrides: {
                alts: {
                    frontend: 'colorOverrides',
                    backend: 'color_overrides',
                    database: 'color_overrides',
                    db_p: 'p_color_overrides',
                    pretty: 'Color Overrides',
                    component: 'ColorOverrides',
                    kebab: 'color-overrides',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            additionalParams: {
                alts: {
                    frontend: 'additionalParams',
                    backend: 'additional_params',
                    database: 'additional_params',
                    db_p: 'p_additional_params',
                    pretty: 'Additional Params',
                    component: 'AdditionalParams',
                    kebab: 'additional-params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            brokerInverse: {
                alts: {
                    frontend: 'brokerInverse',
                    backend: 'broker_Inverse',
                    database: 'ifk_broker',
                    db_p: 'p_ifk_broker',
                    pretty: 'Broker Inverse',
                    component: 'BrokerInverse',
                    kebab: 'brokerInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'broker',
                    typeReference: createTypeReference<BrokerType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "ifk",
            foreignKeys: [],
            inverseForeignKeys: [
                {relatedTable: 'broker', relatedColumn: 'custom_source_component', mainTableColumn: 'id'}
            ],
            manyToMany: [],

        }
    },
    dataOutputComponent: {
        name: {
            frontend: 'dataOutputComponent',
            backend: 'data_output_component',
            database: 'data_output_component',
            pretty: 'Data Output Component',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            componentType: {
                alts: {
                    frontend: 'componentType',
                    backend: 'component_type',
                    database: 'component_type',
                    db_p: 'p_component_type',
                    pretty: 'Component Type',
                    component: 'ComponentType',
                    kebab: 'component-type',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"3DModelViewer" | "AudioOutput" | "BucketList" | "BudgetVisualizer" | "Calendar" | "Carousel" | "Checklist" | "Clock" | "CodeView" | "ComplexMulti" | "DataFlowDiagram" | "DecisionTree" | "DiffViewer" | "FileOutput" | "FitnessTracker" | "Flowchart" | "Form" | "GanttChart" | "GeographicMap" | "GlossaryView" | "Heatmap" | "HorizontalList" | "ImageView" | "InteractiveChart" | "JsonViewer" | "KanbanBoard" | "LaTeXRenderer" | "LiveTraffic" | "LocalEvents" | "MarkdownViewer" | "MealPlanner" | "MindMap" | "NeedNewOption" | "NetworkGraph" | "NewsAggregator" | "PDFViewer" | "PivotTable" | "PlainText" | "Presentation" | "PublicLiveCam" | "RichTextEditor" | "RunCodeBack" | "RunCodeFront" | "SVGEditor" | "SankeyDiagram" | "SatelliteView" | "SocialMediaInfo" | "SpectrumAnalyzer" | "Spreadsheet" | "Table" | "TaskPrioritization" | "Textarea" | "Thermometer" | "Timeline" | "TravelPlanner" | "TreeView" | "UMLDiagram" | "VerticalList" | "VoiceSentimentAnalysis" | "WeatherDashboard" | "WeatherMap" | "WordHighlighter" | "WordMap" | "chatResponse" | "none" | "video" | undefined>(),
                }
            },
            uiComponent: {
                alts: {
                    frontend: 'uiComponent',
                    backend: 'ui_component',
                    database: 'ui_component',
                    db_p: 'p_ui_component',
                    pretty: 'Ui Component',
                    component: 'UiComponent',
                    kebab: 'ui-component',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            props: {
                alts: {
                    frontend: 'props',
                    backend: 'props',
                    database: 'props',
                    db_p: 'p_props',
                    pretty: 'Props',
                    component: 'Props',
                    kebab: 'props',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            additionalParams: {
                alts: {
                    frontend: 'additionalParams',
                    backend: 'additional_params',
                    database: 'additional_params',
                    db_p: 'p_additional_params',
                    pretty: 'Additional Params',
                    component: 'AdditionalParams',
                    kebab: 'additional-params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "simple",
            foreignKeys: [],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
    displayOption: {
        name: {
            frontend: 'displayOption',
            backend: 'display_option',
            database: 'display_option',
            pretty: 'Display Option',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            defaultParams: {
                alts: {
                    frontend: 'defaultParams',
                    backend: 'default_params',
                    database: 'default_params',
                    db_p: 'p_default_params',
                    pretty: 'Default Params',
                    component: 'DefaultParams',
                    kebab: 'default-params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            customizableParams: {
                alts: {
                    frontend: 'customizableParams',
                    backend: 'customizable_params',
                    database: 'customizable_params',
                    db_p: 'p_customizable_params',
                    pretty: 'Customizable Params',
                    component: 'CustomizableParams',
                    kebab: 'customizable-params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            additionalParams: {
                alts: {
                    frontend: 'additionalParams',
                    backend: 'additional_params',
                    database: 'additional_params',
                    db_p: 'p_additional_params',
                    pretty: 'Additional Params',
                    component: 'AdditionalParams',
                    kebab: 'additional-params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            recipeDisplayInverse: {
                alts: {
                    frontend: 'recipeDisplayInverse',
                    backend: 'recipe_display_Inverse',
                    database: 'ifk_recipe_display',
                    db_p: 'p_ifk_recipe_display',
                    pretty: 'Recipe Display Inverse',
                    component: 'RecipeDisplayInverse',
                    kebab: 'recipe-displayInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'recipe_display',
                    typeReference: createTypeReference<RecipeDisplayType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndIfk",
            foreignKeys: [],
            inverseForeignKeys: [
                {relatedTable: 'recipe_display', relatedColumn: 'display', mainTableColumn: 'id'}
            ],
            manyToMany: [
                {
                    junctionTable: 'recipe_display',
                    relatedTable: 'recipe',
                    mainTableColumn: 'display',
                    relatedTableColumn: 'recipe'
                }
            ],

        }
    },
    emails: {
        name: {
            frontend: 'emails',
            backend: 'emails',
            database: 'emails',
            pretty: 'Emails',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            sender: {
                alts: {
                    frontend: 'sender',
                    backend: 'sender',
                    database: 'sender',
                    db_p: 'p_sender',
                    pretty: 'Sender',
                    component: 'Sender',
                    kebab: 'sender',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            recipient: {
                alts: {
                    frontend: 'recipient',
                    backend: 'recipient',
                    database: 'recipient',
                    db_p: 'p_recipient',
                    pretty: 'Recipient',
                    component: 'Recipient',
                    kebab: 'recipient',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            subject: {
                alts: {
                    frontend: 'subject',
                    backend: 'subject',
                    database: 'subject',
                    db_p: 'p_subject',
                    pretty: 'Subject',
                    component: 'Subject',
                    kebab: 'subject',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            body: {
                alts: {
                    frontend: 'body',
                    backend: 'body',
                    database: 'body',
                    db_p: 'p_body',
                    pretty: 'Body',
                    component: 'Body',
                    kebab: 'body',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            timestamp: {
                alts: {
                    frontend: 'timestamp',
                    backend: 'timestamp',
                    database: 'timestamp',
                    db_p: 'p_timestamp',
                    pretty: 'Timestamp',
                    component: 'Timestamp',
                    kebab: 'timestamp',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },
            isRead: {
                alts: {
                    frontend: 'isRead',
                    backend: 'is_read',
                    database: 'is_read',
                    db_p: 'p_is_read',
                    pretty: 'Is Read',
                    component: 'IsRead',
                    kebab: 'is-read',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "simple",
            foreignKeys: [],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
    extractor: {
        name: {
            frontend: 'extractor',
            backend: 'extractor',
            database: 'extractor',
            pretty: 'Extractor',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            outputType: {
                alts: {
                    frontend: 'outputType',
                    backend: 'output_type',
                    database: 'output_type',
                    db_p: 'p_output_type',
                    pretty: 'Output Type',
                    component: 'OutputType',
                    kebab: 'output-type',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"bool" | "dict" | "float" | "int" | "list" | "str" | "url" | undefined>(),
                }
            },
            defaultIdentifier: {
                alts: {
                    frontend: 'defaultIdentifier',
                    backend: 'default_identifier',
                    database: 'default_identifier',
                    db_p: 'p_default_identifier',
                    pretty: 'Default Identifier',
                    component: 'DefaultIdentifier',
                    kebab: 'default-identifier',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            defaultIndex: {
                alts: {
                    frontend: 'defaultIndex',
                    backend: 'default_index',
                    database: 'default_index',
                    db_p: 'p_default_index',
                    pretty: 'Default Index',
                    component: 'DefaultIndex',
                    kebab: 'default-index',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "simple",
            foreignKeys: [],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
    flashcardData: {
        name: {
            frontend: 'flashcardData',
            backend: 'flashcard_data',
            database: 'flashcard_data',
            pretty: 'Flashcard Data',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            userId: {
                alts: {
                    frontend: 'userId',
                    backend: 'user_id',
                    database: 'user_id',
                    db_p: 'p_user_id',
                    pretty: 'User Id',
                    component: 'UserId',
                    kebab: 'user-id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            topic: {
                alts: {
                    frontend: 'topic',
                    backend: 'topic',
                    database: 'topic',
                    db_p: 'p_topic',
                    pretty: 'Topic',
                    component: 'Topic',
                    kebab: 'topic',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            lesson: {
                alts: {
                    frontend: 'lesson',
                    backend: 'lesson',
                    database: 'lesson',
                    db_p: 'p_lesson',
                    pretty: 'Lesson',
                    component: 'Lesson',
                    kebab: 'lesson',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            difficulty: {
                alts: {
                    frontend: 'difficulty',
                    backend: 'difficulty',
                    database: 'difficulty',
                    db_p: 'p_difficulty',
                    pretty: 'Difficulty',
                    component: 'Difficulty',
                    kebab: 'difficulty',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            front: {
                alts: {
                    frontend: 'front',
                    backend: 'front',
                    database: 'front',
                    db_p: 'p_front',
                    pretty: 'Front',
                    component: 'Front',
                    kebab: 'front',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            back: {
                alts: {
                    frontend: 'back',
                    backend: 'back',
                    database: 'back',
                    db_p: 'p_back',
                    pretty: 'Back',
                    component: 'Back',
                    kebab: 'back',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            example: {
                alts: {
                    frontend: 'example',
                    backend: 'example',
                    database: 'example',
                    db_p: 'p_example',
                    pretty: 'Example',
                    component: 'Example',
                    kebab: 'example',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            detailedExplanation: {
                alts: {
                    frontend: 'detailedExplanation',
                    backend: 'detailed_explanation',
                    database: 'detailed_explanation',
                    db_p: 'p_detailed_explanation',
                    pretty: 'Detailed Explanation',
                    component: 'DetailedExplanation',
                    kebab: 'detailed-explanation',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            audioExplanation: {
                alts: {
                    frontend: 'audioExplanation',
                    backend: 'audio_explanation',
                    database: 'audio_explanation',
                    db_p: 'p_audio_explanation',
                    pretty: 'Audio Explanation',
                    component: 'AudioExplanation',
                    kebab: 'audio-explanation',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            personalNotes: {
                alts: {
                    frontend: 'personalNotes',
                    backend: 'personal_notes',
                    database: 'personal_notes',
                    db_p: 'p_personal_notes',
                    pretty: 'Personal Notes',
                    component: 'PersonalNotes',
                    kebab: 'personal-notes',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            isDeleted: {
                alts: {
                    frontend: 'isDeleted',
                    backend: 'is_deleted',
                    database: 'is_deleted',
                    db_p: 'p_is_deleted',
                    pretty: 'Is Deleted',
                    component: 'IsDeleted',
                    kebab: 'is-deleted',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },
            public: {
                alts: {
                    frontend: 'public',
                    backend: 'public',
                    database: 'public',
                    db_p: 'p_public',
                    pretty: 'Public',
                    component: 'Public',
                    kebab: 'public',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },
            sharedWith: {
                alts: {
                    frontend: 'sharedWith',
                    backend: 'shared_with',
                    database: 'shared_with',
                    db_p: 'p_shared_with',
                    pretty: 'Shared With',
                    component: 'SharedWith',
                    kebab: 'shared-with',
                },
                type: 'stringArray',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string[]>(),
                }
            },
            createdAt: {
                alts: {
                    frontend: 'createdAt',
                    backend: 'created_at',
                    database: 'created_at',
                    db_p: 'p_created_at',
                    pretty: 'Created At',
                    component: 'CreatedAt',
                    kebab: 'created-at',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },
            updatedAt: {
                alts: {
                    frontend: 'updatedAt',
                    backend: 'updated_at',
                    database: 'updated_at',
                    db_p: 'p_updated_at',
                    pretty: 'Updated At',
                    component: 'UpdatedAt',
                    kebab: 'updated-at',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },
            flashcardHistoryInverse: {
                alts: {
                    frontend: 'flashcardHistoryInverse',
                    backend: 'flashcard_history_Inverse',
                    database: 'ifk_flashcard_history',
                    db_p: 'p_ifk_flashcard_history',
                    pretty: 'Flashcard History Inverse',
                    component: 'FlashcardHistoryInverse',
                    kebab: 'flashcard-historyInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'flashcard_history',
                    typeReference: createTypeReference<FlashcardHistoryType>(),
                }
            },
            flashcardSetRelationsInverse: {
                alts: {
                    frontend: 'flashcardSetRelationsInverse',
                    backend: 'flashcard_set_relations_Inverse',
                    database: 'ifk_flashcard_set_relations',
                    db_p: 'p_ifk_flashcard_set_relations',
                    pretty: 'Flashcard Set Relations Inverse',
                    component: 'FlashcardSetRelationsInverse',
                    kebab: 'flashcard-set-relationsInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'flashcard_set_relations',
                    typeReference: createTypeReference<FlashcardSetRelationsType>(),
                }
            },
            flashcardImagesInverse: {
                alts: {
                    frontend: 'flashcardImagesInverse',
                    backend: 'flashcard_images_Inverse',
                    database: 'ifk_flashcard_images',
                    db_p: 'p_ifk_flashcard_images',
                    pretty: 'Flashcard Images Inverse',
                    component: 'FlashcardImagesInverse',
                    kebab: 'flashcard-imagesInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'flashcard_images',
                    typeReference: createTypeReference<FlashcardImagesType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndIfk",
            foreignKeys: [],
            inverseForeignKeys: [
                {relatedTable: 'flashcard_history', relatedColumn: 'flashcard_id', mainTableColumn: 'id'},
                {relatedTable: 'flashcard_set_relations', relatedColumn: 'flashcard_id', mainTableColumn: 'id'},
                {relatedTable: 'flashcard_images', relatedColumn: 'flashcard_id', mainTableColumn: 'id'}
            ],
            manyToMany: [
                {
                    junctionTable: 'flashcard_set_relations',
                    relatedTable: 'flashcard_sets',
                    mainTableColumn: 'flashcard_id',
                    relatedTableColumn: 'set_id'
                }
            ],

        }
    },
    flashcardHistory: {
        name: {
            frontend: 'flashcardHistory',
            backend: 'flashcard_history',
            database: 'flashcard_history',
            pretty: 'Flashcard History',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            flashcardId: {
                alts: {
                    frontend: 'flashcardId',
                    backend: 'flashcard_id',
                    database: 'flashcard_id',
                    db_p: 'p_flashcard_id',
                    pretty: 'Flashcard Id',
                    component: 'FlashcardId',
                    kebab: 'flashcard-id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            userId: {
                alts: {
                    frontend: 'userId',
                    backend: 'user_id',
                    database: 'user_id',
                    db_p: 'p_user_id',
                    pretty: 'User Id',
                    component: 'UserId',
                    kebab: 'user-id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            reviewCount: {
                alts: {
                    frontend: 'reviewCount',
                    backend: 'review_count',
                    database: 'review_count',
                    db_p: 'p_review_count',
                    pretty: 'Review Count',
                    component: 'ReviewCount',
                    kebab: 'review-count',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            correctCount: {
                alts: {
                    frontend: 'correctCount',
                    backend: 'correct_count',
                    database: 'correct_count',
                    db_p: 'p_correct_count',
                    pretty: 'Correct Count',
                    component: 'CorrectCount',
                    kebab: 'correct-count',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            incorrectCount: {
                alts: {
                    frontend: 'incorrectCount',
                    backend: 'incorrect_count',
                    database: 'incorrect_count',
                    db_p: 'p_incorrect_count',
                    pretty: 'Incorrect Count',
                    component: 'IncorrectCount',
                    kebab: 'incorrect-count',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            createdAt: {
                alts: {
                    frontend: 'createdAt',
                    backend: 'created_at',
                    database: 'created_at',
                    db_p: 'p_created_at',
                    pretty: 'Created At',
                    component: 'CreatedAt',
                    kebab: 'created-at',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },
            updatedAt: {
                alts: {
                    frontend: 'updatedAt',
                    backend: 'updated_at',
                    database: 'updated_at',
                    db_p: 'p_updated_at',
                    pretty: 'Updated At',
                    component: 'UpdatedAt',
                    kebab: 'updated-at',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },
            flashcardDataReference: {
                alts: {
                    frontend: 'flashcardDataReference',
                    backend: 'flashcard_data_reference',
                    database: 'ref_flashcard_data',
                    db_p: 'p_ref_flashcard_data',
                    pretty: 'Flashcard Data Reference',
                    component: 'FlashcardDataReference',
                    kebab: 'flashcard-dataReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<FlashcardDataType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "fk",
            foreignKeys: [
                {column: 'flashcard_id', relatedTable: 'flashcard_data', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
    flashcardImages: {
        name: {
            frontend: 'flashcardImages',
            backend: 'flashcard_images',
            database: 'flashcard_images',
            pretty: 'Flashcard Images',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            flashcardId: {
                alts: {
                    frontend: 'flashcardId',
                    backend: 'flashcard_id',
                    database: 'flashcard_id',
                    db_p: 'p_flashcard_id',
                    pretty: 'Flashcard Id',
                    component: 'FlashcardId',
                    kebab: 'flashcard-id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            filePath: {
                alts: {
                    frontend: 'filePath',
                    backend: 'file_path',
                    database: 'file_path',
                    db_p: 'p_file_path',
                    pretty: 'File Path',
                    component: 'FilePath',
                    kebab: 'file-path',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            fileName: {
                alts: {
                    frontend: 'fileName',
                    backend: 'file_name',
                    database: 'file_name',
                    db_p: 'p_file_name',
                    pretty: 'File Name',
                    component: 'FileName',
                    kebab: 'file-name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            mimeType: {
                alts: {
                    frontend: 'mimeType',
                    backend: 'mime_type',
                    database: 'mime_type',
                    db_p: 'p_mime_type',
                    pretty: 'Mime Type',
                    component: 'MimeType',
                    kebab: 'mime-type',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            size: {
                alts: {
                    frontend: 'size',
                    backend: 'size',
                    database: 'size',
                    db_p: 'p_size',
                    pretty: 'Size',
                    component: 'Size',
                    kebab: 'size',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            createdAt: {
                alts: {
                    frontend: 'createdAt',
                    backend: 'created_at',
                    database: 'created_at',
                    db_p: 'p_created_at',
                    pretty: 'Created At',
                    component: 'CreatedAt',
                    kebab: 'created-at',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },
            flashcardDataReference: {
                alts: {
                    frontend: 'flashcardDataReference',
                    backend: 'flashcard_data_reference',
                    database: 'ref_flashcard_data',
                    db_p: 'p_ref_flashcard_data',
                    pretty: 'Flashcard Data Reference',
                    component: 'FlashcardDataReference',
                    kebab: 'flashcard-dataReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<FlashcardDataType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "fk",
            foreignKeys: [
                {column: 'flashcard_id', relatedTable: 'flashcard_data', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
    flashcardSetRelations: {
        name: {
            frontend: 'flashcardSetRelations',
            backend: 'flashcard_set_relations',
            database: 'flashcard_set_relations',
            pretty: 'Flashcard Set Relations',
        },
        schemaType: 'table',
        fields: {
            flashcardId: {
                alts: {
                    frontend: 'flashcardId',
                    backend: 'flashcard_id',
                    database: 'flashcard_id',
                    db_p: 'p_flashcard_id',
                    pretty: 'Flashcard Id',
                    component: 'FlashcardId',
                    kebab: 'flashcard-id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            setId: {
                alts: {
                    frontend: 'setId',
                    backend: 'set_id',
                    database: 'set_id',
                    db_p: 'p_set_id',
                    pretty: 'Set Id',
                    component: 'SetId',
                    kebab: 'set-id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            order: {
                alts: {
                    frontend: 'order',
                    backend: 'order',
                    database: 'order',
                    db_p: 'p_order',
                    pretty: 'Order',
                    component: 'Order',
                    kebab: 'order',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            flashcardDataReference: {
                alts: {
                    frontend: 'flashcardDataReference',
                    backend: 'flashcard_data_reference',
                    database: 'ref_flashcard_data',
                    db_p: 'p_ref_flashcard_data',
                    pretty: 'Flashcard Data Reference',
                    component: 'FlashcardDataReference',
                    kebab: 'flashcard-dataReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<FlashcardDataType>(),
                }
            },
            flashcardSetsReference: {
                alts: {
                    frontend: 'flashcardSetsReference',
                    backend: 'flashcard_sets_reference',
                    database: 'ref_flashcard_sets',
                    db_p: 'p_ref_flashcard_sets',
                    pretty: 'Flashcard Sets Reference',
                    component: 'FlashcardSetsReference',
                    kebab: 'flashcard-setsReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<FlashcardSetsType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndFk",
            foreignKeys: [
                {column: 'flashcard_id', relatedTable: 'flashcard_data', relatedColumn: 'id'},
                {column: 'set_id', relatedTable: 'flashcard_sets', relatedColumn: 'set_id'}
            ],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
    flashcardSets: {
        name: {
            frontend: 'flashcardSets',
            backend: 'flashcard_sets',
            database: 'flashcard_sets',
            pretty: 'Flashcard Sets',
        },
        schemaType: 'table',
        fields: {
            setId: {
                alts: {
                    frontend: 'setId',
                    backend: 'set_id',
                    database: 'set_id',
                    db_p: 'p_set_id',
                    pretty: 'Set Id',
                    component: 'SetId',
                    kebab: 'set-id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            userId: {
                alts: {
                    frontend: 'userId',
                    backend: 'user_id',
                    database: 'user_id',
                    db_p: 'p_user_id',
                    pretty: 'User Id',
                    component: 'UserId',
                    kebab: 'user-id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            createdAt: {
                alts: {
                    frontend: 'createdAt',
                    backend: 'created_at',
                    database: 'created_at',
                    db_p: 'p_created_at',
                    pretty: 'Created At',
                    component: 'CreatedAt',
                    kebab: 'created-at',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },
            updatedAt: {
                alts: {
                    frontend: 'updatedAt',
                    backend: 'updated_at',
                    database: 'updated_at',
                    db_p: 'p_updated_at',
                    pretty: 'Updated At',
                    component: 'UpdatedAt',
                    kebab: 'updated-at',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },
            sharedWith: {
                alts: {
                    frontend: 'sharedWith',
                    backend: 'shared_with',
                    database: 'shared_with',
                    db_p: 'p_shared_with',
                    pretty: 'Shared With',
                    component: 'SharedWith',
                    kebab: 'shared-with',
                },
                type: 'stringArray',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string[]>(),
                }
            },
            public: {
                alts: {
                    frontend: 'public',
                    backend: 'public',
                    database: 'public',
                    db_p: 'p_public',
                    pretty: 'Public',
                    component: 'Public',
                    kebab: 'public',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },
            topic: {
                alts: {
                    frontend: 'topic',
                    backend: 'topic',
                    database: 'topic',
                    db_p: 'p_topic',
                    pretty: 'Topic',
                    component: 'Topic',
                    kebab: 'topic',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            lesson: {
                alts: {
                    frontend: 'lesson',
                    backend: 'lesson',
                    database: 'lesson',
                    db_p: 'p_lesson',
                    pretty: 'Lesson',
                    component: 'Lesson',
                    kebab: 'lesson',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            difficulty: {
                alts: {
                    frontend: 'difficulty',
                    backend: 'difficulty',
                    database: 'difficulty',
                    db_p: 'p_difficulty',
                    pretty: 'Difficulty',
                    component: 'Difficulty',
                    kebab: 'difficulty',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            audioOverview: {
                alts: {
                    frontend: 'audioOverview',
                    backend: 'audio_overview',
                    database: 'audio_overview',
                    db_p: 'p_audio_overview',
                    pretty: 'Audio Overview',
                    component: 'AudioOverview',
                    kebab: 'audio-overview',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            flashcardSetRelationsInverse: {
                alts: {
                    frontend: 'flashcardSetRelationsInverse',
                    backend: 'flashcard_set_relations_Inverse',
                    database: 'ifk_flashcard_set_relations',
                    db_p: 'p_ifk_flashcard_set_relations',
                    pretty: 'Flashcard Set Relations Inverse',
                    component: 'FlashcardSetRelationsInverse',
                    kebab: 'flashcard-set-relationsInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'flashcard_set_relations',
                    typeReference: createTypeReference<FlashcardSetRelationsType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndIfk",
            foreignKeys: [],
            inverseForeignKeys: [
                {relatedTable: 'flashcard_set_relations', relatedColumn: 'set_id', mainTableColumn: 'set_id'}
            ],
            manyToMany: [
                {
                    junctionTable: 'flashcard_set_relations',
                    relatedTable: 'flashcard_data',
                    mainTableColumn: 'set_id',
                    relatedTableColumn: 'flashcard_id'
                }
            ],

        }
    },
    processor: {
        name: {
            frontend: 'processor',
            backend: 'processor',
            database: 'processor',
            pretty: 'Processor',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            dependsDefault: {
                alts: {
                    frontend: 'dependsDefault',
                    backend: 'depends_default',
                    database: 'depends_default',
                    db_p: 'p_depends_default',
                    pretty: 'Depends Default',
                    component: 'DependsDefault',
                    kebab: 'depends-default',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            defaultExtractors: {
                alts: {
                    frontend: 'defaultExtractors',
                    backend: 'default_extractors',
                    database: 'default_extractors',
                    db_p: 'p_default_extractors',
                    pretty: 'Default Extractors',
                    component: 'DefaultExtractors',
                    kebab: 'default-extractors',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            params: {
                alts: {
                    frontend: 'params',
                    backend: 'params',
                    database: 'params',
                    db_p: 'p_params',
                    pretty: 'Params',
                    component: 'Params',
                    kebab: 'params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            processorReference: {
                alts: {
                    frontend: 'processorReference',
                    backend: 'processor_reference',
                    database: 'ref_processor',
                    db_p: 'p_ref_processor',
                    pretty: 'Processor Reference',
                    component: 'ProcessorReference',
                    kebab: 'processorReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<ProcessorType>(),
                }
            },
            recipeProcessorInverse: {
                alts: {
                    frontend: 'recipeProcessorInverse',
                    backend: 'recipe_processor_Inverse',
                    database: 'ifk_recipe_processor',
                    db_p: 'p_ifk_recipe_processor',
                    pretty: 'Recipe Processor Inverse',
                    component: 'RecipeProcessorInverse',
                    kebab: 'recipe-processorInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'recipe_processor',
                    typeReference: createTypeReference<RecipeProcessorType>(),
                }
            },
            processorInverse: {
                alts: {
                    frontend: 'processorInverse',
                    backend: 'processor_Inverse',
                    database: 'ifk_processor',
                    db_p: 'p_ifk_processor',
                    pretty: 'Processor Inverse',
                    component: 'ProcessorInverse',
                    kebab: 'processorInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'processor',
                    typeReference: createTypeReference<ProcessorType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "fkIfkAndM2M",
            foreignKeys: [
                {column: 'depends_default', relatedTable: 'self_reference', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [
                {relatedTable: 'recipe_processor', relatedColumn: 'processor', mainTableColumn: 'id'},
                {relatedTable: 'processor', relatedColumn: 'depends_default', mainTableColumn: 'id'}
            ],
            manyToMany: [
                {
                    junctionTable: 'recipe_processor',
                    relatedTable: 'recipe',
                    mainTableColumn: 'processor',
                    relatedTableColumn: 'recipe'
                }
            ],

        }
    },
    recipe: {
        name: {
            frontend: 'recipe',
            backend: 'recipe',
            database: 'recipe',
            pretty: 'Recipe',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    db_p: 'p_description',
                    pretty: 'Description',
                    component: 'Description',
                    kebab: 'description',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            tags: {
                alts: {
                    frontend: 'tags',
                    backend: 'tags',
                    database: 'tags',
                    db_p: 'p_tags',
                    pretty: 'Tags',
                    component: 'Tags',
                    kebab: 'tags',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            sampleOutput: {
                alts: {
                    frontend: 'sampleOutput',
                    backend: 'sample_output',
                    database: 'sample_output',
                    db_p: 'p_sample_output',
                    pretty: 'Sample Output',
                    component: 'SampleOutput',
                    kebab: 'sample-output',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            isPublic: {
                alts: {
                    frontend: 'isPublic',
                    backend: 'is_public',
                    database: 'is_public',
                    db_p: 'p_is_public',
                    pretty: 'Is Public',
                    component: 'IsPublic',
                    kebab: 'is-public',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },
            status: {
                alts: {
                    frontend: 'status',
                    backend: 'status',
                    database: 'status',
                    db_p: 'p_status',
                    pretty: 'Status',
                    component: 'Status',
                    kebab: 'status',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"active_testing" | "archived" | "draft" | "in_review" | "live" | "other" | undefined>(),
                }
            },
            version: {
                alts: {
                    frontend: 'version',
                    backend: 'version',
                    database: 'version',
                    db_p: 'p_version',
                    pretty: 'Version',
                    component: 'Version',
                    kebab: 'version',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            messages: {
                alts: {
                    frontend: 'messages',
                    backend: 'messages',
                    database: 'messages',
                    db_p: 'p_messages',
                    pretty: 'Messages',
                    component: 'Messages',
                    kebab: 'messages',
                },
                type: 'objectArray',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>[]>(),
                }
            },
            postResultOptions: {
                alts: {
                    frontend: 'postResultOptions',
                    backend: 'post_result_options',
                    database: 'post_result_options',
                    db_p: 'p_post_result_options',
                    pretty: 'Post Result Options',
                    component: 'PostResultOptions',
                    kebab: 'post-result-options',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            recipeBrokerInverse: {
                alts: {
                    frontend: 'recipeBrokerInverse',
                    backend: 'recipe_broker_Inverse',
                    database: 'ifk_recipe_broker',
                    db_p: 'p_ifk_recipe_broker',
                    pretty: 'Recipe Broker Inverse',
                    component: 'RecipeBrokerInverse',
                    kebab: 'recipe-brokerInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'recipe_broker',
                    typeReference: createTypeReference<RecipeBrokerType>(),
                }
            },
            recipeProcessorInverse: {
                alts: {
                    frontend: 'recipeProcessorInverse',
                    backend: 'recipe_processor_Inverse',
                    database: 'ifk_recipe_processor',
                    db_p: 'p_ifk_recipe_processor',
                    pretty: 'Recipe Processor Inverse',
                    component: 'RecipeProcessorInverse',
                    kebab: 'recipe-processorInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'recipe_processor',
                    typeReference: createTypeReference<RecipeProcessorType>(),
                }
            },
            recipeModelInverse: {
                alts: {
                    frontend: 'recipeModelInverse',
                    backend: 'recipe_model_Inverse',
                    database: 'ifk_recipe_model',
                    db_p: 'p_ifk_recipe_model',
                    pretty: 'Recipe Model Inverse',
                    component: 'RecipeModelInverse',
                    kebab: 'recipe-modelInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'recipe_model',
                    typeReference: createTypeReference<RecipeModelType>(),
                }
            },
            recipeDisplayInverse: {
                alts: {
                    frontend: 'recipeDisplayInverse',
                    backend: 'recipe_display_Inverse',
                    database: 'ifk_recipe_display',
                    db_p: 'p_ifk_recipe_display',
                    pretty: 'Recipe Display Inverse',
                    component: 'RecipeDisplayInverse',
                    kebab: 'recipe-displayInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'recipe_display',
                    typeReference: createTypeReference<RecipeDisplayType>(),
                }
            },
            recipeFunctionInverse: {
                alts: {
                    frontend: 'recipeFunctionInverse',
                    backend: 'recipe_function_Inverse',
                    database: 'ifk_recipe_function',
                    db_p: 'p_ifk_recipe_function',
                    pretty: 'Recipe Function Inverse',
                    component: 'RecipeFunctionInverse',
                    kebab: 'recipe-functionInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'recipe_function',
                    typeReference: createTypeReference<RecipeFunctionType>(),
                }
            },
            recipeToolInverse: {
                alts: {
                    frontend: 'recipeToolInverse',
                    backend: 'recipe_tool_Inverse',
                    database: 'ifk_recipe_tool',
                    db_p: 'p_ifk_recipe_tool',
                    pretty: 'Recipe Tool Inverse',
                    component: 'RecipeToolInverse',
                    kebab: 'recipe-toolInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'recipe_tool',
                    typeReference: createTypeReference<RecipeToolType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndIfk",
            foreignKeys: [],
            inverseForeignKeys: [
                {relatedTable: 'recipe_broker', relatedColumn: 'recipe', mainTableColumn: 'id'},
                {relatedTable: 'recipe_processor', relatedColumn: 'recipe', mainTableColumn: 'id'},
                {relatedTable: 'recipe_model', relatedColumn: 'recipe', mainTableColumn: 'id'},
                {relatedTable: 'recipe_display', relatedColumn: 'recipe', mainTableColumn: 'id'},
                {relatedTable: 'recipe_function', relatedColumn: 'recipe', mainTableColumn: 'id'},
                {relatedTable: 'recipe_tool', relatedColumn: 'recipe', mainTableColumn: 'id'}
            ],
            manyToMany: [
                {
                    junctionTable: 'recipe_broker',
                    relatedTable: 'broker',
                    mainTableColumn: 'recipe',
                    relatedTableColumn: 'broker'
                },
                {
                    junctionTable: 'recipe_display',
                    relatedTable: 'display_option',
                    mainTableColumn: 'recipe',
                    relatedTableColumn: 'display'
                },
                {
                    junctionTable: 'recipe_function',
                    relatedTable: 'system_function',
                    mainTableColumn: 'recipe',
                    relatedTableColumn: 'function'
                },
                {
                    junctionTable: 'recipe_model',
                    relatedTable: 'ai_model',
                    mainTableColumn: 'recipe',
                    relatedTableColumn: 'ai_model'
                },
                {
                    junctionTable: 'recipe_processor',
                    relatedTable: 'processor',
                    mainTableColumn: 'recipe',
                    relatedTableColumn: 'processor'
                },
                {
                    junctionTable: 'recipe_tool',
                    relatedTable: 'tool',
                    mainTableColumn: 'recipe',
                    relatedTableColumn: 'tool'
                }
            ],

        }
    },
    recipeBroker: {
        name: {
            frontend: 'recipeBroker',
            backend: 'recipe_broker',
            database: 'recipe_broker',
            pretty: 'Recipe Broker',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            recipe: {
                alts: {
                    frontend: 'recipe',
                    backend: 'recipe',
                    database: 'recipe',
                    db_p: 'p_recipe',
                    pretty: 'Recipe',
                    component: 'Recipe',
                    kebab: 'recipe',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            broker: {
                alts: {
                    frontend: 'broker',
                    backend: 'broker',
                    database: 'broker',
                    db_p: 'p_broker',
                    pretty: 'Broker',
                    component: 'Broker',
                    kebab: 'broker',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            brokerRole: {
                alts: {
                    frontend: 'brokerRole',
                    backend: 'broker_role',
                    database: 'broker_role',
                    db_p: 'p_broker_role',
                    pretty: 'Broker Role',
                    component: 'BrokerRole',
                    kebab: 'broker-role',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"input_broker" | "output_broker" | undefined>(),
                }
            },
            required: {
                alts: {
                    frontend: 'required',
                    backend: 'required',
                    database: 'required',
                    db_p: 'p_required',
                    pretty: 'Required',
                    component: 'Required',
                    kebab: 'required',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },
            brokerReference: {
                alts: {
                    frontend: 'brokerReference',
                    backend: 'broker_reference',
                    database: 'ref_broker',
                    db_p: 'p_ref_broker',
                    pretty: 'Broker Reference',
                    component: 'BrokerReference',
                    kebab: 'brokerReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<BrokerType>(),
                }
            },
            recipeReference: {
                alts: {
                    frontend: 'recipeReference',
                    backend: 'recipe_reference',
                    database: 'ref_recipe',
                    db_p: 'p_ref_recipe',
                    pretty: 'Recipe Reference',
                    component: 'RecipeReference',
                    kebab: 'recipeReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<RecipeType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndFk",
            foreignKeys: [
                {column: 'broker', relatedTable: 'broker', relatedColumn: 'id'},
                {column: 'recipe', relatedTable: 'recipe', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
    recipeDisplay: {
        name: {
            frontend: 'recipeDisplay',
            backend: 'recipe_display',
            database: 'recipe_display',
            pretty: 'Recipe Display',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            recipe: {
                alts: {
                    frontend: 'recipe',
                    backend: 'recipe',
                    database: 'recipe',
                    db_p: 'p_recipe',
                    pretty: 'Recipe',
                    component: 'Recipe',
                    kebab: 'recipe',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            display: {
                alts: {
                    frontend: 'display',
                    backend: 'display',
                    database: 'display',
                    db_p: 'p_display',
                    pretty: 'Display',
                    component: 'Display',
                    kebab: 'display',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            priority: {
                alts: {
                    frontend: 'priority',
                    backend: 'priority',
                    database: 'priority',
                    db_p: 'p_priority',
                    pretty: 'Priority',
                    component: 'Priority',
                    kebab: 'priority',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            displaySettings: {
                alts: {
                    frontend: 'displaySettings',
                    backend: 'display_settings',
                    database: 'display_settings',
                    db_p: 'p_display_settings',
                    pretty: 'Display Settings',
                    component: 'DisplaySettings',
                    kebab: 'display-settings',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            displayOptionReference: {
                alts: {
                    frontend: 'displayOptionReference',
                    backend: 'display_option_reference',
                    database: 'ref_display_option',
                    db_p: 'p_ref_display_option',
                    pretty: 'Display Option Reference',
                    component: 'DisplayOptionReference',
                    kebab: 'display-optionReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<DisplayOptionType>(),
                }
            },
            recipeReference: {
                alts: {
                    frontend: 'recipeReference',
                    backend: 'recipe_reference',
                    database: 'ref_recipe',
                    db_p: 'p_ref_recipe',
                    pretty: 'Recipe Reference',
                    component: 'RecipeReference',
                    kebab: 'recipeReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<RecipeType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndFk",
            foreignKeys: [
                {column: 'display', relatedTable: 'display_option', relatedColumn: 'id'},
                {column: 'recipe', relatedTable: 'recipe', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [],
            manyToMany: [],

        }
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
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            recipe: {
                alts: {
                    frontend: 'recipe',
                    backend: 'recipe',
                    database: 'recipe',
                    db_p: 'p_recipe',
                    pretty: 'Recipe',
                    component: 'Recipe',
                    kebab: 'recipe',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            function: {
                alts: {
                    frontend: 'function',
                    backend: 'function',
                    database: 'function',
                    db_p: 'p_function',
                    pretty: 'Function',
                    component: 'Function',
                    kebab: 'function',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            role: {
                alts: {
                    frontend: 'role',
                    backend: 'role',
                    database: 'role',
                    db_p: 'p_role',
                    pretty: 'Role',
                    component: 'Role',
                    kebab: 'role',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"comparison" | "decision" | "other" | "post_processing" | "pre-Processing" | "rating" | "save_data" | "validation" | undefined>(),
                }
            },
            params: {
                alts: {
                    frontend: 'params',
                    backend: 'params',
                    database: 'params',
                    db_p: 'p_params',
                    pretty: 'Params',
                    component: 'Params',
                    kebab: 'params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            systemFunctionReference: {
                alts: {
                    frontend: 'systemFunctionReference',
                    backend: 'system_function_reference',
                    database: 'ref_system_function',
                    db_p: 'p_ref_system_function',
                    pretty: 'System Function Reference',
                    component: 'SystemFunctionReference',
                    kebab: 'system-functionReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<SystemFunctionType>(),
                }
            },
            recipeReference: {
                alts: {
                    frontend: 'recipeReference',
                    backend: 'recipe_reference',
                    database: 'ref_recipe',
                    db_p: 'p_ref_recipe',
                    pretty: 'Recipe Reference',
                    component: 'RecipeReference',
                    kebab: 'recipeReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<RecipeType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndFk",
            foreignKeys: [
                {column: 'function', relatedTable: 'system_function', relatedColumn: 'id'},
                {column: 'recipe', relatedTable: 'recipe', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
    recipeModel: {
        name: {
            frontend: 'recipeModel',
            backend: 'recipe_model',
            database: 'recipe_model',
            pretty: 'Recipe Model',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            recipe: {
                alts: {
                    frontend: 'recipe',
                    backend: 'recipe',
                    database: 'recipe',
                    db_p: 'p_recipe',
                    pretty: 'Recipe',
                    component: 'Recipe',
                    kebab: 'recipe',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            aiModel: {
                alts: {
                    frontend: 'aiModel',
                    backend: 'ai_model',
                    database: 'ai_model',
                    db_p: 'p_ai_model',
                    pretty: 'Ai Model',
                    component: 'AiModel',
                    kebab: 'ai-model',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            role: {
                alts: {
                    frontend: 'role',
                    backend: 'role',
                    database: 'role',
                    db_p: 'p_role',
                    pretty: 'Role',
                    component: 'Role',
                    kebab: 'role',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"primary_model" | "trial_model" | "verified_model" | undefined>(),
                }
            },
            priority: {
                alts: {
                    frontend: 'priority',
                    backend: 'priority',
                    database: 'priority',
                    db_p: 'p_priority',
                    pretty: 'Priority',
                    component: 'Priority',
                    kebab: 'priority',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
            aiModelReference: {
                alts: {
                    frontend: 'aiModelReference',
                    backend: 'ai_model_reference',
                    database: 'ref_ai_model',
                    db_p: 'p_ref_ai_model',
                    pretty: 'Ai Model Reference',
                    component: 'AiModelReference',
                    kebab: 'ai-modelReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<AiModelType>(),
                }
            },
            recipeReference: {
                alts: {
                    frontend: 'recipeReference',
                    backend: 'recipe_reference',
                    database: 'ref_recipe',
                    db_p: 'p_ref_recipe',
                    pretty: 'Recipe Reference',
                    component: 'RecipeReference',
                    kebab: 'recipeReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<RecipeType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndFk",
            foreignKeys: [
                {column: 'ai_model', relatedTable: 'ai_model', relatedColumn: 'id'},
                {column: 'recipe', relatedTable: 'recipe', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
    recipeProcessor: {
        name: {
            frontend: 'recipeProcessor',
            backend: 'recipe_processor',
            database: 'recipe_processor',
            pretty: 'Recipe Processor',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            recipe: {
                alts: {
                    frontend: 'recipe',
                    backend: 'recipe',
                    database: 'recipe',
                    db_p: 'p_recipe',
                    pretty: 'Recipe',
                    component: 'Recipe',
                    kebab: 'recipe',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            processor: {
                alts: {
                    frontend: 'processor',
                    backend: 'processor',
                    database: 'processor',
                    db_p: 'p_processor',
                    pretty: 'Processor',
                    component: 'Processor',
                    kebab: 'processor',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            params: {
                alts: {
                    frontend: 'params',
                    backend: 'params',
                    database: 'params',
                    db_p: 'p_params',
                    pretty: 'Params',
                    component: 'Params',
                    kebab: 'params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            processorReference: {
                alts: {
                    frontend: 'processorReference',
                    backend: 'processor_reference',
                    database: 'ref_processor',
                    db_p: 'p_ref_processor',
                    pretty: 'Processor Reference',
                    component: 'ProcessorReference',
                    kebab: 'processorReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<ProcessorType>(),
                }
            },
            recipeReference: {
                alts: {
                    frontend: 'recipeReference',
                    backend: 'recipe_reference',
                    database: 'ref_recipe',
                    db_p: 'p_ref_recipe',
                    pretty: 'Recipe Reference',
                    component: 'RecipeReference',
                    kebab: 'recipeReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<RecipeType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndFk",
            foreignKeys: [
                {column: 'processor', relatedTable: 'processor', relatedColumn: 'id'},
                {column: 'recipe', relatedTable: 'recipe', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
    recipeTool: {
        name: {
            frontend: 'recipeTool',
            backend: 'recipe_tool',
            database: 'recipe_tool',
            pretty: 'Recipe Tool',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            recipe: {
                alts: {
                    frontend: 'recipe',
                    backend: 'recipe',
                    database: 'recipe',
                    db_p: 'p_recipe',
                    pretty: 'Recipe',
                    component: 'Recipe',
                    kebab: 'recipe',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            tool: {
                alts: {
                    frontend: 'tool',
                    backend: 'tool',
                    database: 'tool',
                    db_p: 'p_tool',
                    pretty: 'Tool',
                    component: 'Tool',
                    kebab: 'tool',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            params: {
                alts: {
                    frontend: 'params',
                    backend: 'params',
                    database: 'params',
                    db_p: 'p_params',
                    pretty: 'Params',
                    component: 'Params',
                    kebab: 'params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            recipeReference: {
                alts: {
                    frontend: 'recipeReference',
                    backend: 'recipe_reference',
                    database: 'ref_recipe',
                    db_p: 'p_ref_recipe',
                    pretty: 'Recipe Reference',
                    component: 'RecipeReference',
                    kebab: 'recipeReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<RecipeType>(),
                }
            },
            toolReference: {
                alts: {
                    frontend: 'toolReference',
                    backend: 'tool_reference',
                    database: 'ref_tool',
                    db_p: 'p_ref_tool',
                    pretty: 'Tool Reference',
                    component: 'ToolReference',
                    kebab: 'toolReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<ToolType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndFk",
            foreignKeys: [
                {column: 'recipe', relatedTable: 'recipe', relatedColumn: 'id'},
                {column: 'tool', relatedTable: 'tool', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    },
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
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            modulePath: {
                alts: {
                    frontend: 'modulePath',
                    backend: 'module_path',
                    database: 'module_path',
                    db_p: 'p_module_path',
                    pretty: 'Module Path',
                    component: 'ModulePath',
                    kebab: 'module-path',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            className: {
                alts: {
                    frontend: 'className',
                    backend: 'class_name',
                    database: 'class_name',
                    db_p: 'p_class_name',
                    pretty: 'Class Name',
                    component: 'ClassName',
                    kebab: 'class-name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    db_p: 'p_description',
                    pretty: 'Description',
                    component: 'Description',
                    kebab: 'description',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            returnBroker: {
                alts: {
                    frontend: 'returnBroker',
                    backend: 'return_broker',
                    database: 'return_broker',
                    db_p: 'p_return_broker',
                    pretty: 'Return Broker',
                    component: 'ReturnBroker',
                    kebab: 'return-broker',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            brokerReference: {
                alts: {
                    frontend: 'brokerReference',
                    backend: 'broker_reference',
                    database: 'ref_broker',
                    db_p: 'p_ref_broker',
                    pretty: 'Broker Reference',
                    component: 'BrokerReference',
                    kebab: 'brokerReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<BrokerType>(),
                }
            },
            systemFunctionInverse: {
                alts: {
                    frontend: 'systemFunctionInverse',
                    backend: 'system_function_Inverse',
                    database: 'ifk_system_function',
                    db_p: 'p_ifk_system_function',
                    pretty: 'System Function Inverse',
                    component: 'SystemFunctionInverse',
                    kebab: 'system-functionInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'system_function',
                    typeReference: createTypeReference<SystemFunctionType>(),
                }
            },
            argInverse: {
                alts: {
                    frontend: 'argInverse',
                    backend: 'arg_Inverse',
                    database: 'ifk_arg',
                    db_p: 'p_ifk_arg',
                    pretty: 'Arg Inverse',
                    component: 'ArgInverse',
                    kebab: 'argInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'arg',
                    typeReference: createTypeReference<ArgType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "fkAndIfk",
            foreignKeys: [
                {column: 'return_broker', relatedTable: 'broker', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [
                {relatedTable: 'system_function', relatedColumn: 'rf_id', mainTableColumn: 'id'},
                {relatedTable: 'arg', relatedColumn: 'registered_function', mainTableColumn: 'id'}
            ],
            manyToMany: [],

        }
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
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    db_p: 'p_description',
                    pretty: 'Description',
                    component: 'Description',
                    kebab: 'description',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            sample: {
                alts: {
                    frontend: 'sample',
                    backend: 'sample',
                    database: 'sample',
                    db_p: 'p_sample',
                    pretty: 'Sample',
                    component: 'Sample',
                    kebab: 'sample',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            inputParams: {
                alts: {
                    frontend: 'inputParams',
                    backend: 'input_params',
                    database: 'input_params',
                    db_p: 'p_input_params',
                    pretty: 'Input Params',
                    component: 'InputParams',
                    kebab: 'input-params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            outputOptions: {
                alts: {
                    frontend: 'outputOptions',
                    backend: 'output_options',
                    database: 'output_options',
                    db_p: 'p_output_options',
                    pretty: 'Output Options',
                    component: 'OutputOptions',
                    kebab: 'output-options',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            rfId: {
                alts: {
                    frontend: 'rfId',
                    backend: 'rf_id',
                    database: 'rf_id',
                    db_p: 'p_rf_id',
                    pretty: 'Rf Id',
                    component: 'RfId',
                    kebab: 'rf-id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            registeredFunctionReference: {
                alts: {
                    frontend: 'registeredFunctionReference',
                    backend: 'registered_function_reference',
                    database: 'ref_registered_function',
                    db_p: 'p_ref_registered_function',
                    pretty: 'Registered Function Reference',
                    component: 'RegisteredFunctionReference',
                    kebab: 'registered-functionReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<RegisteredFunctionType>(),
                }
            },
            toolInverse: {
                alts: {
                    frontend: 'toolInverse',
                    backend: 'tool_Inverse',
                    database: 'ifk_tool',
                    db_p: 'p_ifk_tool',
                    pretty: 'Tool Inverse',
                    component: 'ToolInverse',
                    kebab: 'toolInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'tool',
                    typeReference: createTypeReference<ToolType>(),
                }
            },
            recipeFunctionInverse: {
                alts: {
                    frontend: 'recipeFunctionInverse',
                    backend: 'recipe_function_Inverse',
                    database: 'ifk_recipe_function',
                    db_p: 'p_ifk_recipe_function',
                    pretty: 'Recipe Function Inverse',
                    component: 'RecipeFunctionInverse',
                    kebab: 'recipe-functionInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'recipe_function',
                    typeReference: createTypeReference<RecipeFunctionType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "fkIfkAndM2M",
            foreignKeys: [
                {column: 'rf_id', relatedTable: 'registered_function', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [
                {relatedTable: 'tool', relatedColumn: 'system_function', mainTableColumn: 'id'},
                {relatedTable: 'recipe_function', relatedColumn: 'function', mainTableColumn: 'id'}
            ],
            manyToMany: [
                {
                    junctionTable: 'recipe_function',
                    relatedTable: 'recipe',
                    mainTableColumn: 'function',
                    relatedTableColumn: 'recipe'
                }
            ],

        }
    },
    tool: {
        name: {
            frontend: 'tool',
            backend: 'tool',
            database: 'tool',
            pretty: 'Tool',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            source: {
                alts: {
                    frontend: 'source',
                    backend: 'source',
                    database: 'source',
                    db_p: 'p_source',
                    pretty: 'Source',
                    component: 'Source',
                    kebab: 'source',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    db_p: 'p_description',
                    pretty: 'Description',
                    component: 'Description',
                    kebab: 'description',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            parameters: {
                alts: {
                    frontend: 'parameters',
                    backend: 'parameters',
                    database: 'parameters',
                    db_p: 'p_parameters',
                    pretty: 'Parameters',
                    component: 'Parameters',
                    kebab: 'parameters',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            requiredArgs: {
                alts: {
                    frontend: 'requiredArgs',
                    backend: 'required_args',
                    database: 'required_args',
                    db_p: 'p_required_args',
                    pretty: 'Required Args',
                    component: 'RequiredArgs',
                    kebab: 'required-args',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            systemFunction: {
                alts: {
                    frontend: 'systemFunction',
                    backend: 'system_function',
                    database: 'system_function',
                    db_p: 'p_system_function',
                    pretty: 'System Function',
                    component: 'SystemFunction',
                    kebab: 'system-function',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            additionalParams: {
                alts: {
                    frontend: 'additionalParams',
                    backend: 'additional_params',
                    database: 'additional_params',
                    db_p: 'p_additional_params',
                    pretty: 'Additional Params',
                    component: 'AdditionalParams',
                    kebab: 'additional-params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            systemFunctionReference: {
                alts: {
                    frontend: 'systemFunctionReference',
                    backend: 'system_function_reference',
                    database: 'ref_system_function',
                    db_p: 'p_ref_system_function',
                    pretty: 'System Function Reference',
                    component: 'SystemFunctionReference',
                    kebab: 'system-functionReference',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<SystemFunctionType>(),
                }
            },
            recipeToolInverse: {
                alts: {
                    frontend: 'recipeToolInverse',
                    backend: 'recipe_tool_Inverse',
                    database: 'ifk_recipe_tool',
                    db_p: 'p_ifk_recipe_tool',
                    pretty: 'Recipe Tool Inverse',
                    component: 'RecipeToolInverse',
                    kebab: 'recipe-toolInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'recipe_tool',
                    typeReference: createTypeReference<RecipeToolType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "fkIfkAndM2M",
            foreignKeys: [
                {column: 'system_function', relatedTable: 'system_function', relatedColumn: 'id'}
            ],
            inverseForeignKeys: [
                {relatedTable: 'recipe_tool', relatedColumn: 'tool', mainTableColumn: 'id'}
            ],
            manyToMany: [
                {
                    junctionTable: 'recipe_tool',
                    relatedTable: 'recipe',
                    mainTableColumn: 'tool',
                    relatedTableColumn: 'recipe'
                }
            ],

        }
    },
    transformer: {
        name: {
            frontend: 'transformer',
            backend: 'transformer',
            database: 'transformer',
            pretty: 'Transformer',
        },
        schemaType: 'table',
        fields: {
            id: {
                alts: {
                    frontend: 'id',
                    backend: 'id',
                    database: 'id',
                    db_p: 'p_id',
                    pretty: 'Id',
                    component: 'Id',
                    kebab: 'id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                    kebab: 'name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            inputParams: {
                alts: {
                    frontend: 'inputParams',
                    backend: 'input_params',
                    database: 'input_params',
                    db_p: 'p_input_params',
                    pretty: 'Input Params',
                    component: 'InputParams',
                    kebab: 'input-params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            outputParams: {
                alts: {
                    frontend: 'outputParams',
                    backend: 'output_params',
                    database: 'output_params',
                    db_p: 'p_output_params',
                    pretty: 'Output Params',
                    component: 'OutputParams',
                    kebab: 'output-params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            actionInverse: {
                alts: {
                    frontend: 'actionInverse',
                    backend: 'action_Inverse',
                    database: 'ifk_action',
                    db_p: 'p_ifk_action',
                    pretty: 'Action Inverse',
                    component: 'ActionInverse',
                    kebab: 'actionInverse',
                },
                type: 'array',
                format: 'array',
                structure: {
                    structure: 'inverseForeignKey',
                    databaseTable: 'action',
                    typeReference: createTypeReference<ActionType>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "m2mAndIfk",
            foreignKeys: [],
            inverseForeignKeys: [
                {relatedTable: 'action', relatedColumn: 'transformer', mainTableColumn: 'id'}
            ],
            manyToMany: [
                {
                    junctionTable: 'action',
                    relatedTable: 'automation_matrix',
                    mainTableColumn: 'transformer',
                    relatedTableColumn: 'matrix'
                }
            ],

        }
    },
    userPreferences: {
        name: {
            frontend: 'userPreferences',
            backend: 'user_preferences',
            database: 'user_preferences',
            pretty: 'User Preferences',
        },
        schemaType: 'table',
        fields: {
            userId: {
                alts: {
                    frontend: 'userId',
                    backend: 'user_id',
                    database: 'user_id',
                    db_p: 'p_user_id',
                    pretty: 'User Id',
                    component: 'UserId',
                    kebab: 'user-id',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
            preferences: {
                alts: {
                    frontend: 'preferences',
                    backend: 'preferences',
                    database: 'preferences',
                    db_p: 'p_preferences',
                    pretty: 'Preferences',
                    component: 'Preferences',
                    kebab: 'preferences',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
            createdAt: {
                alts: {
                    frontend: 'createdAt',
                    backend: 'created_at',
                    database: 'created_at',
                    db_p: 'p_created_at',
                    pretty: 'Created At',
                    component: 'CreatedAt',
                    kebab: 'created-at',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },
            updatedAt: {
                alts: {
                    frontend: 'updatedAt',
                    backend: 'updated_at',
                    database: 'updated_at',
                    db_p: 'p_updated_at',
                    pretty: 'Updated At',
                    component: 'UpdatedAt',
                    kebab: 'updated-at',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },
        },
        relationships: {
            fetchStrategy: "simple",
            foreignKeys: [],
            inverseForeignKeys: [],
            manyToMany: [],

        }
    }
};

export type ActionType = InferSchemaType<typeof initialSchemas.action>;
export type AiEndpointType = InferSchemaType<typeof initialSchemas.aiEndpoint>;
export type AiModelType = InferSchemaType<typeof initialSchemas.aiModel>;
export type ArgType = InferSchemaType<typeof initialSchemas.arg>;
export type AutomationBoundaryBrokerType = InferSchemaType<typeof initialSchemas.automationBoundaryBroker>;
export type AutomationMatrixType = InferSchemaType<typeof initialSchemas.automationMatrix>;
export type BrokerType = InferSchemaType<typeof initialSchemas.broker>;
export type DataInputComponentType = InferSchemaType<typeof initialSchemas.dataInputComponent>;
export type DataOutputComponentType = InferSchemaType<typeof initialSchemas.dataOutputComponent>;
export type DisplayOptionType = InferSchemaType<typeof initialSchemas.displayOption>;
export type EmailsType = InferSchemaType<typeof initialSchemas.emails>;
export type ExtractorType = InferSchemaType<typeof initialSchemas.extractor>;
export type FlashcardDataType = InferSchemaType<typeof initialSchemas.flashcardData>;
export type FlashcardHistoryType = InferSchemaType<typeof initialSchemas.flashcardHistory>;
export type FlashcardImagesType = InferSchemaType<typeof initialSchemas.flashcardImages>;
export type FlashcardSetRelationsType = InferSchemaType<typeof initialSchemas.flashcardSetRelations>;
export type FlashcardSetsType = InferSchemaType<typeof initialSchemas.flashcardSets>;
export type ProcessorType = InferSchemaType<typeof initialSchemas.processor>;
export type RecipeType = InferSchemaType<typeof initialSchemas.recipe>;
export type RecipeBrokerType = InferSchemaType<typeof initialSchemas.recipeBroker>;
export type RecipeDisplayType = InferSchemaType<typeof initialSchemas.recipeDisplay>;
export type RecipeFunctionType = InferSchemaType<typeof initialSchemas.recipeFunction>;
export type RecipeModelType = InferSchemaType<typeof initialSchemas.recipeModel>;
export type RecipeProcessorType = InferSchemaType<typeof initialSchemas.recipeProcessor>;
export type RecipeToolType = InferSchemaType<typeof initialSchemas.recipeTool>;
export type RegisteredFunctionType = InferSchemaType<typeof initialSchemas.registeredFunction>;
export type SystemFunctionType = InferSchemaType<typeof initialSchemas.systemFunction>;
export type ToolType = InferSchemaType<typeof initialSchemas.tool>;
export type TransformerType = InferSchemaType<typeof initialSchemas.transformer>;
export type UserPreferencesType = InferSchemaType<typeof initialSchemas.userPreferences>;
