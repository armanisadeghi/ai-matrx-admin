// File: lib/initialSchemas.ts

import {TableSchema, createTypeReference, InferSchemaType} from './schemaRegistry';
import {Json} from "@/types/database.types";
import {BrokerType} from "@/types/brokerTypes";

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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },matrix: {
                alts: {
                    frontend: 'matrix',
                    backend: 'matrix',
                    database: 'matrix',
                    db_p: 'p_matrix',
                    pretty: 'Matrix',
                    component: 'Matrix',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },transformer: {
                alts: {
                    frontend: 'transformer',
                    backend: 'transformer',
                    database: 'transformer',
                    db_p: 'p_transformer',
                    pretty: 'Transformer',
                    component: 'Transformer',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },nodeType: {
                alts: {
                    frontend: 'nodeType',
                    backend: 'node_type',
                    database: 'node_type',
                    db_p: 'p_node_type',
                    pretty: 'Node Type',
                    component: 'NodeType',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },referenceId: {
                alts: {
                    frontend: 'referenceId',
                    backend: 'reference_id',
                    database: 'reference_id',
                    db_p: 'p_reference_id',
                    pretty: 'Reference Id',
                    component: 'ReferenceId',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },provider: {
                alts: {
                    frontend: 'provider',
                    backend: 'provider',
                    database: 'provider',
                    db_p: 'p_provider',
                    pretty: 'Provider',
                    component: 'Provider',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    db_p: 'p_description',
                    pretty: 'Description',
                    component: 'Description',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },additionalCost: {
                alts: {
                    frontend: 'additionalCost',
                    backend: 'additional_cost',
                    database: 'additional_cost',
                    db_p: 'p_additional_cost',
                    pretty: 'Additional Cost',
                    component: 'AdditionalCost',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },costDetails: {
                alts: {
                    frontend: 'costDetails',
                    backend: 'cost_details',
                    database: 'cost_details',
                    db_p: 'p_cost_details',
                    pretty: 'Cost Details',
                    component: 'CostDetails',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },params: {
                alts: {
                    frontend: 'params',
                    backend: 'params',
                    database: 'params',
                    db_p: 'p_params',
                    pretty: 'Params',
                    component: 'Params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },commonName: {
                alts: {
                    frontend: 'commonName',
                    backend: 'common_name',
                    database: 'common_name',
                    db_p: 'p_common_name',
                    pretty: 'Common Name',
                    component: 'CommonName',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },class: {
                alts: {
                    frontend: 'class',
                    backend: 'class',
                    database: 'class',
                    db_p: 'p_class',
                    pretty: 'Class',
                    component: 'Class',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },provider: {
                alts: {
                    frontend: 'provider',
                    backend: 'provider',
                    database: 'provider',
                    db_p: 'p_provider',
                    pretty: 'Provider',
                    component: 'Provider',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },endpoints: {
                alts: {
                    frontend: 'endpoints',
                    backend: 'endpoints',
                    database: 'endpoints',
                    db_p: 'p_endpoints',
                    pretty: 'Endpoints',
                    component: 'Endpoints',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },contextWindow: {
                alts: {
                    frontend: 'contextWindow',
                    backend: 'context_window',
                    database: 'context_window',
                    db_p: 'p_context_window',
                    pretty: 'Context Window',
                    component: 'ContextWindow',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },maxTokens: {
                alts: {
                    frontend: 'maxTokens',
                    backend: 'max_tokens',
                    database: 'max_tokens',
                    db_p: 'p_max_tokens',
                    pretty: 'Max Tokens',
                    component: 'MaxTokens',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },capabilities: {
                alts: {
                    frontend: 'capabilities',
                    backend: 'capabilities',
                    database: 'capabilities',
                    db_p: 'p_capabilities',
                    pretty: 'Capabilities',
                    component: 'Capabilities',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },controls: {
                alts: {
                    frontend: 'controls',
                    backend: 'controls',
                    database: 'controls',
                    db_p: 'p_controls',
                    pretty: 'Controls',
                    component: 'Controls',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },required: {
                alts: {
                    frontend: 'required',
                    backend: 'required',
                    database: 'required',
                    db_p: 'p_required',
                    pretty: 'Required',
                    component: 'Required',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },default: {
                alts: {
                    frontend: 'default',
                    backend: 'default',
                    database: 'default',
                    db_p: 'p_default',
                    pretty: 'Default',
                    component: 'Default',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },dataType: {
                alts: {
                    frontend: 'dataType',
                    backend: 'data_type',
                    database: 'data_type',
                    db_p: 'p_data_type',
                    pretty: 'Data Type',
                    component: 'DataType',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"bool" | "dict" | "float" | "int" | "list" | "str" | "url" | undefined>(),
                }
            },ready: {
                alts: {
                    frontend: 'ready',
                    backend: 'ready',
                    database: 'ready',
                    db_p: 'p_ready',
                    pretty: 'Ready',
                    component: 'Ready',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },registeredFunction: {
                alts: {
                    frontend: 'registeredFunction',
                    backend: 'registered_function',
                    database: 'registered_function',
                    db_p: 'p_registered_function',
                    pretty: 'Registered Function',
                    component: 'RegisteredFunction',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },matrix: {
                alts: {
                    frontend: 'matrix',
                    backend: 'matrix',
                    database: 'matrix',
                    db_p: 'p_matrix',
                    pretty: 'Matrix',
                    component: 'Matrix',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },broker: {
                alts: {
                    frontend: 'broker',
                    backend: 'broker',
                    database: 'broker',
                    db_p: 'p_broker',
                    pretty: 'Broker',
                    component: 'Broker',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },sparkSource: {
                alts: {
                    frontend: 'sparkSource',
                    backend: 'spark_source',
                    database: 'spark_source',
                    db_p: 'p_spark_source',
                    pretty: 'Spark Source',
                    component: 'SparkSource',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"api" | "chance" | "database" | "environment" | "file" | "function" | "generated_data" | "none" | "user_input" | undefined>(),
                }
            },beaconDestination: {
                alts: {
                    frontend: 'beaconDestination',
                    backend: 'beacon_destination',
                    database: 'beacon_destination',
                    db_p: 'p_beacon_destination',
                    pretty: 'Beacon Destination',
                    component: 'BeaconDestination',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"api_response" | "database" | "file" | "function" | "user_output" | undefined>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    db_p: 'p_description',
                    pretty: 'Description',
                    component: 'Description',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },averageSeconds: {
                alts: {
                    frontend: 'averageSeconds',
                    backend: 'average_seconds',
                    database: 'average_seconds',
                    db_p: 'p_average_seconds',
                    pretty: 'Average Seconds',
                    component: 'AverageSeconds',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },isAutomated: {
                alts: {
                    frontend: 'isAutomated',
                    backend: 'is_automated',
                    database: 'is_automated',
                    db_p: 'p_is_automated',
                    pretty: 'Is Automated',
                    component: 'IsAutomated',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },cognitionMatrices: {
                alts: {
                    frontend: 'cognitionMatrices',
                    backend: 'cognition_matrices',
                    database: 'cognition_matrices',
                    db_p: 'p_cognition_matrices',
                    pretty: 'Cognition Matrices',
                    component: 'CognitionMatrices',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"agent_crew" | "agent_mixture" | "conductor" | "hypercluster" | "knowledge_matrix" | "monte_carlo" | "the_matrix" | "workflow" | undefined>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },value: {
                alts: {
                    frontend: 'value',
                    backend: 'value',
                    database: 'value',
                    db_p: 'p_value',
                    pretty: 'Value',
                    component: 'Value',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },dataType: {
                alts: {
                    frontend: 'dataType',
                    backend: 'data_type',
                    database: 'data_type',
                    db_p: 'p_data_type',
                    pretty: 'Data Type',
                    component: 'DataType',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"bool" | "dict" | "float" | "int" | "list" | "str" | "url" | undefined>(),
                }
            },ready: {
                alts: {
                    frontend: 'ready',
                    backend: 'ready',
                    database: 'ready',
                    db_p: 'p_ready',
                    pretty: 'Ready',
                    component: 'Ready',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },defaultSource: {
                alts: {
                    frontend: 'defaultSource',
                    backend: 'default_source',
                    database: 'default_source',
                    db_p: 'p_default_source',
                    pretty: 'Default Source',
                    component: 'DefaultSource',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"api" | "chance" | "database" | "environment" | "file" | "function" | "generated_data" | "none" | "user_input" | undefined>(),
                }
            },displayName: {
                alts: {
                    frontend: 'displayName',
                    backend: 'display_name',
                    database: 'display_name',
                    db_p: 'p_display_name',
                    pretty: 'Display Name',
                    component: 'DisplayName',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    db_p: 'p_description',
                    pretty: 'Description',
                    component: 'Description',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },tooltip: {
                alts: {
                    frontend: 'tooltip',
                    backend: 'tooltip',
                    database: 'tooltip',
                    db_p: 'p_tooltip',
                    pretty: 'Tooltip',
                    component: 'Tooltip',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },validationRules: {
                alts: {
                    frontend: 'validationRules',
                    backend: 'validation_rules',
                    database: 'validation_rules',
                    db_p: 'p_validation_rules',
                    pretty: 'Validation Rules',
                    component: 'ValidationRules',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },sampleEntries: {
                alts: {
                    frontend: 'sampleEntries',
                    backend: 'sample_entries',
                    database: 'sample_entries',
                    db_p: 'p_sample_entries',
                    pretty: 'Sample Entries',
                    component: 'SampleEntries',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },customSourceComponent: {
                alts: {
                    frontend: 'customSourceComponent',
                    backend: 'custom_source_component',
                    database: 'custom_source_component',
                    db_p: 'p_custom_source_component',
                    pretty: 'Custom Source Component',
                    component: 'CustomSourceComponent',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },additionalParams: {
                alts: {
                    frontend: 'additionalParams',
                    backend: 'additional_params',
                    database: 'additional_params',
                    db_p: 'p_additional_params',
                    pretty: 'Additional Params',
                    component: 'AdditionalParams',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },otherSourceParams: {
                alts: {
                    frontend: 'otherSourceParams',
                    backend: 'other_source_params',
                    database: 'other_source_params',
                    db_p: 'p_other_source_params',
                    pretty: 'Other Source Params',
                    component: 'OtherSourceParams',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },defaultDestination: {
                alts: {
                    frontend: 'defaultDestination',
                    backend: 'default_destination',
                    database: 'default_destination',
                    db_p: 'p_default_destination',
                    pretty: 'Default Destination',
                    component: 'DefaultDestination',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"api_response" | "database" | "file" | "function" | "user_output" | undefined>(),
                }
            },outputComponent: {
                alts: {
                    frontend: 'outputComponent',
                    backend: 'output_component',
                    database: 'output_component',
                    db_p: 'p_output_component',
                    pretty: 'Output Component',
                    component: 'OutputComponent',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"3DModelViewer" | "AudioOutput" | "BucketList" | "BudgetVisualizer" | "Calendar" | "Carousel" | "Checklist" | "Clock" | "CodeView" | "ComplexMulti" | "DataFlowDiagram" | "DecisionTree" | "DiffViewer" | "FileOutput" | "FitnessTracker" | "Flowchart" | "Form" | "GanttChart" | "GeographicMap" | "GlossaryView" | "Heatmap" | "HorizontalList" | "ImageView" | "InteractiveChart" | "JsonViewer" | "KanbanBoard" | "LaTeXRenderer" | "LiveTraffic" | "LocalEvents" | "MarkdownViewer" | "MealPlanner" | "MindMap" | "NeedNewOption" | "NetworkGraph" | "NewsAggregator" | "PDFViewer" | "PivotTable" | "PlainText" | "Presentation" | "PublicLiveCam" | "RichTextEditor" | "RunCodeBack" | "RunCodeFront" | "SVGEditor" | "SankeyDiagram" | "SatelliteView" | "SocialMediaInfo" | "SpectrumAnalyzer" | "Spreadsheet" | "Table" | "TaskPrioritization" | "Textarea" | "Thermometer" | "Timeline" | "TravelPlanner" | "TreeView" | "UMLDiagram" | "VerticalList" | "VoiceSentimentAnalysis" | "WeatherDashboard" | "WeatherMap" | "WordHighlighter" | "WordMap" | "chatResponse" | "none" | "video" | undefined>(),
                }
            },tags: {
                alts: {
                    frontend: 'tags',
                    backend: 'tags',
                    database: 'tags',
                    db_p: 'p_tags',
                    pretty: 'Tags',
                    component: 'Tags',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },options: {
                alts: {
                    frontend: 'options',
                    backend: 'options',
                    database: 'options',
                    db_p: 'p_options',
                    pretty: 'Options',
                    component: 'Options',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },includeOther: {
                alts: {
                    frontend: 'includeOther',
                    backend: 'include_other',
                    database: 'include_other',
                    db_p: 'p_include_other',
                    pretty: 'Include Other',
                    component: 'IncludeOther',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },min: {
                alts: {
                    frontend: 'min',
                    backend: 'min',
                    database: 'min',
                    db_p: 'p_min',
                    pretty: 'Min',
                    component: 'Min',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },max: {
                alts: {
                    frontend: 'max',
                    backend: 'max',
                    database: 'max',
                    db_p: 'p_max',
                    pretty: 'Max',
                    component: 'Max',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },step: {
                alts: {
                    frontend: 'step',
                    backend: 'step',
                    database: 'step',
                    db_p: 'p_step',
                    pretty: 'Step',
                    component: 'Step',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },minRows: {
                alts: {
                    frontend: 'minRows',
                    backend: 'min_rows',
                    database: 'min_rows',
                    db_p: 'p_min_rows',
                    pretty: 'Min Rows',
                    component: 'MinRows',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },maxRows: {
                alts: {
                    frontend: 'maxRows',
                    backend: 'max_rows',
                    database: 'max_rows',
                    db_p: 'p_max_rows',
                    pretty: 'Max Rows',
                    component: 'MaxRows',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },acceptableFiletypes: {
                alts: {
                    frontend: 'acceptableFiletypes',
                    backend: 'acceptable_filetypes',
                    database: 'acceptable_filetypes',
                    db_p: 'p_acceptable_filetypes',
                    pretty: 'Acceptable Filetypes',
                    component: 'AcceptableFiletypes',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },src: {
                alts: {
                    frontend: 'src',
                    backend: 'src',
                    database: 'src',
                    db_p: 'p_src',
                    pretty: 'Src',
                    component: 'Src',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },classes: {
                alts: {
                    frontend: 'classes',
                    backend: 'classes',
                    database: 'classes',
                    db_p: 'p_classes',
                    pretty: 'Classes',
                    component: 'Classes',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },colorOverrides: {
                alts: {
                    frontend: 'colorOverrides',
                    backend: 'color_overrides',
                    database: 'color_overrides',
                    db_p: 'p_color_overrides',
                    pretty: 'Color Overrides',
                    component: 'ColorOverrides',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },additionalParams: {
                alts: {
                    frontend: 'additionalParams',
                    backend: 'additional_params',
                    database: 'additional_params',
                    db_p: 'p_additional_params',
                    pretty: 'Additional Params',
                    component: 'AdditionalParams',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },componentType: {
                alts: {
                    frontend: 'componentType',
                    backend: 'component_type',
                    database: 'component_type',
                    db_p: 'p_component_type',
                    pretty: 'Component Type',
                    component: 'ComponentType',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"3DModelViewer" | "AudioOutput" | "BucketList" | "BudgetVisualizer" | "Calendar" | "Carousel" | "Checklist" | "Clock" | "CodeView" | "ComplexMulti" | "DataFlowDiagram" | "DecisionTree" | "DiffViewer" | "FileOutput" | "FitnessTracker" | "Flowchart" | "Form" | "GanttChart" | "GeographicMap" | "GlossaryView" | "Heatmap" | "HorizontalList" | "ImageView" | "InteractiveChart" | "JsonViewer" | "KanbanBoard" | "LaTeXRenderer" | "LiveTraffic" | "LocalEvents" | "MarkdownViewer" | "MealPlanner" | "MindMap" | "NeedNewOption" | "NetworkGraph" | "NewsAggregator" | "PDFViewer" | "PivotTable" | "PlainText" | "Presentation" | "PublicLiveCam" | "RichTextEditor" | "RunCodeBack" | "RunCodeFront" | "SVGEditor" | "SankeyDiagram" | "SatelliteView" | "SocialMediaInfo" | "SpectrumAnalyzer" | "Spreadsheet" | "Table" | "TaskPrioritization" | "Textarea" | "Thermometer" | "Timeline" | "TravelPlanner" | "TreeView" | "UMLDiagram" | "VerticalList" | "VoiceSentimentAnalysis" | "WeatherDashboard" | "WeatherMap" | "WordHighlighter" | "WordMap" | "chatResponse" | "none" | "video" | undefined>(),
                }
            },uiComponent: {
                alts: {
                    frontend: 'uiComponent',
                    backend: 'ui_component',
                    database: 'ui_component',
                    db_p: 'p_ui_component',
                    pretty: 'Ui Component',
                    component: 'UiComponent',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },props: {
                alts: {
                    frontend: 'props',
                    backend: 'props',
                    database: 'props',
                    db_p: 'p_props',
                    pretty: 'Props',
                    component: 'Props',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },additionalParams: {
                alts: {
                    frontend: 'additionalParams',
                    backend: 'additional_params',
                    database: 'additional_params',
                    db_p: 'p_additional_params',
                    pretty: 'Additional Params',
                    component: 'AdditionalParams',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },defaultParams: {
                alts: {
                    frontend: 'defaultParams',
                    backend: 'default_params',
                    database: 'default_params',
                    db_p: 'p_default_params',
                    pretty: 'Default Params',
                    component: 'DefaultParams',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },customizableParams: {
                alts: {
                    frontend: 'customizableParams',
                    backend: 'customizable_params',
                    database: 'customizable_params',
                    db_p: 'p_customizable_params',
                    pretty: 'Customizable Params',
                    component: 'CustomizableParams',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },additionalParams: {
                alts: {
                    frontend: 'additionalParams',
                    backend: 'additional_params',
                    database: 'additional_params',
                    db_p: 'p_additional_params',
                    pretty: 'Additional Params',
                    component: 'AdditionalParams',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },sender: {
                alts: {
                    frontend: 'sender',
                    backend: 'sender',
                    database: 'sender',
                    db_p: 'p_sender',
                    pretty: 'Sender',
                    component: 'Sender',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },recipient: {
                alts: {
                    frontend: 'recipient',
                    backend: 'recipient',
                    database: 'recipient',
                    db_p: 'p_recipient',
                    pretty: 'Recipient',
                    component: 'Recipient',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },subject: {
                alts: {
                    frontend: 'subject',
                    backend: 'subject',
                    database: 'subject',
                    db_p: 'p_subject',
                    pretty: 'Subject',
                    component: 'Subject',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },body: {
                alts: {
                    frontend: 'body',
                    backend: 'body',
                    database: 'body',
                    db_p: 'p_body',
                    pretty: 'Body',
                    component: 'Body',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },timestamp: {
                alts: {
                    frontend: 'timestamp',
                    backend: 'timestamp',
                    database: 'timestamp',
                    db_p: 'p_timestamp',
                    pretty: 'Timestamp',
                    component: 'Timestamp',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },isRead: {
                alts: {
                    frontend: 'isRead',
                    backend: 'is_read',
                    database: 'is_read',
                    db_p: 'p_is_read',
                    pretty: 'Is Read',
                    component: 'IsRead',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },outputType: {
                alts: {
                    frontend: 'outputType',
                    backend: 'output_type',
                    database: 'output_type',
                    db_p: 'p_output_type',
                    pretty: 'Output Type',
                    component: 'OutputType',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"bool" | "dict" | "float" | "int" | "list" | "str" | "url" | undefined>(),
                }
            },defaultIdentifier: {
                alts: {
                    frontend: 'defaultIdentifier',
                    backend: 'default_identifier',
                    database: 'default_identifier',
                    db_p: 'p_default_identifier',
                    pretty: 'Default Identifier',
                    component: 'DefaultIdentifier',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },defaultIndex: {
                alts: {
                    frontend: 'defaultIndex',
                    backend: 'default_index',
                    database: 'default_index',
                    db_p: 'p_default_index',
                    pretty: 'Default Index',
                    component: 'DefaultIndex',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },userId: {
                alts: {
                    frontend: 'userId',
                    backend: 'user_id',
                    database: 'user_id',
                    db_p: 'p_user_id',
                    pretty: 'User Id',
                    component: 'UserId',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },topic: {
                alts: {
                    frontend: 'topic',
                    backend: 'topic',
                    database: 'topic',
                    db_p: 'p_topic',
                    pretty: 'Topic',
                    component: 'Topic',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },lesson: {
                alts: {
                    frontend: 'lesson',
                    backend: 'lesson',
                    database: 'lesson',
                    db_p: 'p_lesson',
                    pretty: 'Lesson',
                    component: 'Lesson',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },difficulty: {
                alts: {
                    frontend: 'difficulty',
                    backend: 'difficulty',
                    database: 'difficulty',
                    db_p: 'p_difficulty',
                    pretty: 'Difficulty',
                    component: 'Difficulty',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },front: {
                alts: {
                    frontend: 'front',
                    backend: 'front',
                    database: 'front',
                    db_p: 'p_front',
                    pretty: 'Front',
                    component: 'Front',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },back: {
                alts: {
                    frontend: 'back',
                    backend: 'back',
                    database: 'back',
                    db_p: 'p_back',
                    pretty: 'Back',
                    component: 'Back',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },example: {
                alts: {
                    frontend: 'example',
                    backend: 'example',
                    database: 'example',
                    db_p: 'p_example',
                    pretty: 'Example',
                    component: 'Example',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },detailedExplanation: {
                alts: {
                    frontend: 'detailedExplanation',
                    backend: 'detailed_explanation',
                    database: 'detailed_explanation',
                    db_p: 'p_detailed_explanation',
                    pretty: 'Detailed Explanation',
                    component: 'DetailedExplanation',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },audioExplanation: {
                alts: {
                    frontend: 'audioExplanation',
                    backend: 'audio_explanation',
                    database: 'audio_explanation',
                    db_p: 'p_audio_explanation',
                    pretty: 'Audio Explanation',
                    component: 'AudioExplanation',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },personalNotes: {
                alts: {
                    frontend: 'personalNotes',
                    backend: 'personal_notes',
                    database: 'personal_notes',
                    db_p: 'p_personal_notes',
                    pretty: 'Personal Notes',
                    component: 'PersonalNotes',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },isDeleted: {
                alts: {
                    frontend: 'isDeleted',
                    backend: 'is_deleted',
                    database: 'is_deleted',
                    db_p: 'p_is_deleted',
                    pretty: 'Is Deleted',
                    component: 'IsDeleted',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },public: {
                alts: {
                    frontend: 'public',
                    backend: 'public',
                    database: 'public',
                    db_p: 'p_public',
                    pretty: 'Public',
                    component: 'Public',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },sharedWith: {
                alts: {
                    frontend: 'sharedWith',
                    backend: 'shared_with',
                    database: 'shared_with',
                    db_p: 'p_shared_with',
                    pretty: 'Shared With',
                    component: 'SharedWith',
                },
                type: 'stringArray',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string[]>(),
                }
            },createdAt: {
                alts: {
                    frontend: 'createdAt',
                    backend: 'created_at',
                    database: 'created_at',
                    db_p: 'p_created_at',
                    pretty: 'Created At',
                    component: 'CreatedAt',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },updatedAt: {
                alts: {
                    frontend: 'updatedAt',
                    backend: 'updated_at',
                    database: 'updated_at',
                    db_p: 'p_updated_at',
                    pretty: 'Updated At',
                    component: 'UpdatedAt',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },flashcardId: {
                alts: {
                    frontend: 'flashcardId',
                    backend: 'flashcard_id',
                    database: 'flashcard_id',
                    db_p: 'p_flashcard_id',
                    pretty: 'Flashcard Id',
                    component: 'FlashcardId',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },userId: {
                alts: {
                    frontend: 'userId',
                    backend: 'user_id',
                    database: 'user_id',
                    db_p: 'p_user_id',
                    pretty: 'User Id',
                    component: 'UserId',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },reviewCount: {
                alts: {
                    frontend: 'reviewCount',
                    backend: 'review_count',
                    database: 'review_count',
                    db_p: 'p_review_count',
                    pretty: 'Review Count',
                    component: 'ReviewCount',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },correctCount: {
                alts: {
                    frontend: 'correctCount',
                    backend: 'correct_count',
                    database: 'correct_count',
                    db_p: 'p_correct_count',
                    pretty: 'Correct Count',
                    component: 'CorrectCount',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },incorrectCount: {
                alts: {
                    frontend: 'incorrectCount',
                    backend: 'incorrect_count',
                    database: 'incorrect_count',
                    db_p: 'p_incorrect_count',
                    pretty: 'Incorrect Count',
                    component: 'IncorrectCount',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },createdAt: {
                alts: {
                    frontend: 'createdAt',
                    backend: 'created_at',
                    database: 'created_at',
                    db_p: 'p_created_at',
                    pretty: 'Created At',
                    component: 'CreatedAt',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },updatedAt: {
                alts: {
                    frontend: 'updatedAt',
                    backend: 'updated_at',
                    database: 'updated_at',
                    db_p: 'p_updated_at',
                    pretty: 'Updated At',
                    component: 'UpdatedAt',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },flashcardId: {
                alts: {
                    frontend: 'flashcardId',
                    backend: 'flashcard_id',
                    database: 'flashcard_id',
                    db_p: 'p_flashcard_id',
                    pretty: 'Flashcard Id',
                    component: 'FlashcardId',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },filePath: {
                alts: {
                    frontend: 'filePath',
                    backend: 'file_path',
                    database: 'file_path',
                    db_p: 'p_file_path',
                    pretty: 'File Path',
                    component: 'FilePath',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },fileName: {
                alts: {
                    frontend: 'fileName',
                    backend: 'file_name',
                    database: 'file_name',
                    db_p: 'p_file_name',
                    pretty: 'File Name',
                    component: 'FileName',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },mimeType: {
                alts: {
                    frontend: 'mimeType',
                    backend: 'mime_type',
                    database: 'mime_type',
                    db_p: 'p_mime_type',
                    pretty: 'Mime Type',
                    component: 'MimeType',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },size: {
                alts: {
                    frontend: 'size',
                    backend: 'size',
                    database: 'size',
                    db_p: 'p_size',
                    pretty: 'Size',
                    component: 'Size',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },createdAt: {
                alts: {
                    frontend: 'createdAt',
                    backend: 'created_at',
                    database: 'created_at',
                    db_p: 'p_created_at',
                    pretty: 'Created At',
                    component: 'CreatedAt',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },setId: {
                alts: {
                    frontend: 'setId',
                    backend: 'set_id',
                    database: 'set_id',
                    db_p: 'p_set_id',
                    pretty: 'Set Id',
                    component: 'SetId',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },order: {
                alts: {
                    frontend: 'order',
                    backend: 'order',
                    database: 'order',
                    db_p: 'p_order',
                    pretty: 'Order',
                    component: 'Order',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },userId: {
                alts: {
                    frontend: 'userId',
                    backend: 'user_id',
                    database: 'user_id',
                    db_p: 'p_user_id',
                    pretty: 'User Id',
                    component: 'UserId',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },createdAt: {
                alts: {
                    frontend: 'createdAt',
                    backend: 'created_at',
                    database: 'created_at',
                    db_p: 'p_created_at',
                    pretty: 'Created At',
                    component: 'CreatedAt',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },updatedAt: {
                alts: {
                    frontend: 'updatedAt',
                    backend: 'updated_at',
                    database: 'updated_at',
                    db_p: 'p_updated_at',
                    pretty: 'Updated At',
                    component: 'UpdatedAt',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },sharedWith: {
                alts: {
                    frontend: 'sharedWith',
                    backend: 'shared_with',
                    database: 'shared_with',
                    db_p: 'p_shared_with',
                    pretty: 'Shared With',
                    component: 'SharedWith',
                },
                type: 'stringArray',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string[]>(),
                }
            },public: {
                alts: {
                    frontend: 'public',
                    backend: 'public',
                    database: 'public',
                    db_p: 'p_public',
                    pretty: 'Public',
                    component: 'Public',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },topic: {
                alts: {
                    frontend: 'topic',
                    backend: 'topic',
                    database: 'topic',
                    db_p: 'p_topic',
                    pretty: 'Topic',
                    component: 'Topic',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },lesson: {
                alts: {
                    frontend: 'lesson',
                    backend: 'lesson',
                    database: 'lesson',
                    db_p: 'p_lesson',
                    pretty: 'Lesson',
                    component: 'Lesson',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },difficulty: {
                alts: {
                    frontend: 'difficulty',
                    backend: 'difficulty',
                    database: 'difficulty',
                    db_p: 'p_difficulty',
                    pretty: 'Difficulty',
                    component: 'Difficulty',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },audioOverview: {
                alts: {
                    frontend: 'audioOverview',
                    backend: 'audio_overview',
                    database: 'audio_overview',
                    db_p: 'p_audio_overview',
                    pretty: 'Audio Overview',
                    component: 'AudioOverview',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },dependsDefault: {
                alts: {
                    frontend: 'dependsDefault',
                    backend: 'depends_default',
                    database: 'depends_default',
                    db_p: 'p_depends_default',
                    pretty: 'Depends Default',
                    component: 'DependsDefault',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },defaultExtractors: {
                alts: {
                    frontend: 'defaultExtractors',
                    backend: 'default_extractors',
                    database: 'default_extractors',
                    db_p: 'p_default_extractors',
                    pretty: 'Default Extractors',
                    component: 'DefaultExtractors',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },params: {
                alts: {
                    frontend: 'params',
                    backend: 'params',
                    database: 'params',
                    db_p: 'p_params',
                    pretty: 'Params',
                    component: 'Params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    db_p: 'p_description',
                    pretty: 'Description',
                    component: 'Description',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },tags: {
                alts: {
                    frontend: 'tags',
                    backend: 'tags',
                    database: 'tags',
                    db_p: 'p_tags',
                    pretty: 'Tags',
                    component: 'Tags',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },sampleOutput: {
                alts: {
                    frontend: 'sampleOutput',
                    backend: 'sample_output',
                    database: 'sample_output',
                    db_p: 'p_sample_output',
                    pretty: 'Sample Output',
                    component: 'SampleOutput',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },isPublic: {
                alts: {
                    frontend: 'isPublic',
                    backend: 'is_public',
                    database: 'is_public',
                    db_p: 'p_is_public',
                    pretty: 'Is Public',
                    component: 'IsPublic',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },status: {
                alts: {
                    frontend: 'status',
                    backend: 'status',
                    database: 'status',
                    db_p: 'p_status',
                    pretty: 'Status',
                    component: 'Status',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"active_testing" | "archived" | "draft" | "in_review" | "live" | "other" | undefined>(),
                }
            },version: {
                alts: {
                    frontend: 'version',
                    backend: 'version',
                    database: 'version',
                    db_p: 'p_version',
                    pretty: 'Version',
                    component: 'Version',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },messages: {
                alts: {
                    frontend: 'messages',
                    backend: 'messages',
                    database: 'messages',
                    db_p: 'p_messages',
                    pretty: 'Messages',
                    component: 'Messages',
                },
                type: 'objectArray',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>[]>(),
                }
            },postResultOptions: {
                alts: {
                    frontend: 'postResultOptions',
                    backend: 'post_result_options',
                    database: 'post_result_options',
                    db_p: 'p_post_result_options',
                    pretty: 'Post Result Options',
                    component: 'PostResultOptions',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },recipe: {
                alts: {
                    frontend: 'recipe',
                    backend: 'recipe',
                    database: 'recipe',
                    db_p: 'p_recipe',
                    pretty: 'Recipe',
                    component: 'Recipe',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },broker: {
                alts: {
                    frontend: 'broker',
                    backend: 'broker',
                    database: 'broker',
                    db_p: 'p_broker',
                    pretty: 'Broker',
                    component: 'Broker',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },brokerRole: {
                alts: {
                    frontend: 'brokerRole',
                    backend: 'broker_role',
                    database: 'broker_role',
                    db_p: 'p_broker_role',
                    pretty: 'Broker Role',
                    component: 'BrokerRole',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"input_broker" | "output_broker" | undefined>(),
                }
            },required: {
                alts: {
                    frontend: 'required',
                    backend: 'required',
                    database: 'required',
                    db_p: 'p_required',
                    pretty: 'Required',
                    component: 'Required',
                },
                type: 'boolean',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<boolean>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },recipe: {
                alts: {
                    frontend: 'recipe',
                    backend: 'recipe',
                    database: 'recipe',
                    db_p: 'p_recipe',
                    pretty: 'Recipe',
                    component: 'Recipe',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },display: {
                alts: {
                    frontend: 'display',
                    backend: 'display',
                    database: 'display',
                    db_p: 'p_display',
                    pretty: 'Display',
                    component: 'Display',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },priority: {
                alts: {
                    frontend: 'priority',
                    backend: 'priority',
                    database: 'priority',
                    db_p: 'p_priority',
                    pretty: 'Priority',
                    component: 'Priority',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },displaySettings: {
                alts: {
                    frontend: 'displaySettings',
                    backend: 'display_settings',
                    database: 'display_settings',
                    db_p: 'p_display_settings',
                    pretty: 'Display Settings',
                    component: 'DisplaySettings',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },recipe: {
                alts: {
                    frontend: 'recipe',
                    backend: 'recipe',
                    database: 'recipe',
                    db_p: 'p_recipe',
                    pretty: 'Recipe',
                    component: 'Recipe',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },function: {
                alts: {
                    frontend: 'function',
                    backend: 'function',
                    database: 'function',
                    db_p: 'p_function',
                    pretty: 'Function',
                    component: 'Function',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },role: {
                alts: {
                    frontend: 'role',
                    backend: 'role',
                    database: 'role',
                    db_p: 'p_role',
                    pretty: 'Role',
                    component: 'Role',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"comparison" | "decision" | "other" | "post_processing" | "pre-Processing" | "rating" | "save_data" | "validation" | undefined>(),
                }
            },params: {
                alts: {
                    frontend: 'params',
                    backend: 'params',
                    database: 'params',
                    db_p: 'p_params',
                    pretty: 'Params',
                    component: 'Params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },recipe: {
                alts: {
                    frontend: 'recipe',
                    backend: 'recipe',
                    database: 'recipe',
                    db_p: 'p_recipe',
                    pretty: 'Recipe',
                    component: 'Recipe',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },aiModel: {
                alts: {
                    frontend: 'aiModel',
                    backend: 'ai_model',
                    database: 'ai_model',
                    db_p: 'p_ai_model',
                    pretty: 'Ai Model',
                    component: 'AiModel',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },role: {
                alts: {
                    frontend: 'role',
                    backend: 'role',
                    database: 'role',
                    db_p: 'p_role',
                    pretty: 'Role',
                    component: 'Role',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<"primary_model" | "trial_model" | "verified_model" | undefined>(),
                }
            },priority: {
                alts: {
                    frontend: 'priority',
                    backend: 'priority',
                    database: 'priority',
                    db_p: 'p_priority',
                    pretty: 'Priority',
                    component: 'Priority',
                },
                type: 'number',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<number>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },recipe: {
                alts: {
                    frontend: 'recipe',
                    backend: 'recipe',
                    database: 'recipe',
                    db_p: 'p_recipe',
                    pretty: 'Recipe',
                    component: 'Recipe',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },processor: {
                alts: {
                    frontend: 'processor',
                    backend: 'processor',
                    database: 'processor',
                    db_p: 'p_processor',
                    pretty: 'Processor',
                    component: 'Processor',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },params: {
                alts: {
                    frontend: 'params',
                    backend: 'params',
                    database: 'params',
                    db_p: 'p_params',
                    pretty: 'Params',
                    component: 'Params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },recipe: {
                alts: {
                    frontend: 'recipe',
                    backend: 'recipe',
                    database: 'recipe',
                    db_p: 'p_recipe',
                    pretty: 'Recipe',
                    component: 'Recipe',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },tool: {
                alts: {
                    frontend: 'tool',
                    backend: 'tool',
                    database: 'tool',
                    db_p: 'p_tool',
                    pretty: 'Tool',
                    component: 'Tool',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },params: {
                alts: {
                    frontend: 'params',
                    backend: 'params',
                    database: 'params',
                    db_p: 'p_params',
                    pretty: 'Params',
                    component: 'Params',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },modulePath: {
                alts: {
                    frontend: 'modulePath',
                    backend: 'module_path',
                    database: 'module_path',
                    db_p: 'p_module_path',
                    pretty: 'Module Path',
                    component: 'ModulePath',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },className: {
                alts: {
                    frontend: 'className',
                    backend: 'class_name',
                    database: 'class_name',
                    db_p: 'p_class_name',
                    pretty: 'Class Name',
                    component: 'ClassName',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    db_p: 'p_description',
                    pretty: 'Description',
                    component: 'Description',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },returnBroker: {
                alts: {
                    frontend: 'returnBroker',
                    backend: 'return_broker',
                    database: 'return_broker',
                    db_p: 'p_return_broker',
                    pretty: 'Return Broker',
                    component: 'ReturnBroker',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    db_p: 'p_description',
                    pretty: 'Description',
                    component: 'Description',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },sample: {
                alts: {
                    frontend: 'sample',
                    backend: 'sample',
                    database: 'sample',
                    db_p: 'p_sample',
                    pretty: 'Sample',
                    component: 'Sample',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },inputParams: {
                alts: {
                    frontend: 'inputParams',
                    backend: 'input_params',
                    database: 'input_params',
                    db_p: 'p_input_params',
                    pretty: 'Input Params',
                    component: 'InputParams',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },outputOptions: {
                alts: {
                    frontend: 'outputOptions',
                    backend: 'output_options',
                    database: 'output_options',
                    db_p: 'p_output_options',
                    pretty: 'Output Options',
                    component: 'OutputOptions',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },rfId: {
                alts: {
                    frontend: 'rfId',
                    backend: 'rf_id',
                    database: 'rf_id',
                    db_p: 'p_rf_id',
                    pretty: 'Rf Id',
                    component: 'RfId',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },source: {
                alts: {
                    frontend: 'source',
                    backend: 'source',
                    database: 'source',
                    db_p: 'p_source',
                    pretty: 'Source',
                    component: 'Source',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },description: {
                alts: {
                    frontend: 'description',
                    backend: 'description',
                    database: 'description',
                    db_p: 'p_description',
                    pretty: 'Description',
                    component: 'Description',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },parameters: {
                alts: {
                    frontend: 'parameters',
                    backend: 'parameters',
                    database: 'parameters',
                    db_p: 'p_parameters',
                    pretty: 'Parameters',
                    component: 'Parameters',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },requiredArgs: {
                alts: {
                    frontend: 'requiredArgs',
                    backend: 'required_args',
                    database: 'required_args',
                    db_p: 'p_required_args',
                    pretty: 'Required Args',
                    component: 'RequiredArgs',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },systemFunction: {
                alts: {
                    frontend: 'systemFunction',
                    backend: 'system_function',
                    database: 'system_function',
                    db_p: 'p_system_function',
                    pretty: 'System Function',
                    component: 'SystemFunction',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },additionalParams: {
                alts: {
                    frontend: 'additionalParams',
                    backend: 'additional_params',
                    database: 'additional_params',
                    db_p: 'p_additional_params',
                    pretty: 'Additional Params',
                    component: 'AdditionalParams',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },name: {
                alts: {
                    frontend: 'name',
                    backend: 'name',
                    database: 'name',
                    db_p: 'p_name',
                    pretty: 'Name',
                    component: 'Name',
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },inputParams: {
                alts: {
                    frontend: 'inputParams',
                    backend: 'input_params',
                    database: 'input_params',
                    db_p: 'p_input_params',
                    pretty: 'Input Params',
                    component: 'InputParams',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },outputParams: {
                alts: {
                    frontend: 'outputParams',
                    backend: 'output_params',
                    database: 'output_params',
                    db_p: 'p_output_params',
                    pretty: 'Output Params',
                    component: 'OutputParams',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },
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
                },
                type: 'string',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<string>(),
                }
            },preferences: {
                alts: {
                    frontend: 'preferences',
                    backend: 'preferences',
                    database: 'preferences',
                    db_p: 'p_preferences',
                    pretty: 'Preferences',
                    component: 'Preferences',
                },
                type: 'object',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Record<string, unknown>>(),
                }
            },createdAt: {
                alts: {
                    frontend: 'createdAt',
                    backend: 'created_at',
                    database: 'created_at',
                    db_p: 'p_created_at',
                    pretty: 'Created At',
                    component: 'CreatedAt',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },updatedAt: {
                alts: {
                    frontend: 'updatedAt',
                    backend: 'updated_at',
                    database: 'updated_at',
                    db_p: 'p_updated_at',
                    pretty: 'Updated At',
                    component: 'UpdatedAt',
                },
                type: 'date',
                format: "single",
                structure: {
                    structure: "simple",
                    typeReference: createTypeReference<Date>(),
                }
            },
        }
    }
};

// You can also export types here
export type RegisteredFunctionType = InferSchemaType<typeof initialSchemas.registeredFunction>;
export type SystemFunctionType = InferSchemaType<typeof initialSchemas.systemFunction>;
export type RecipeFunctionType = InferSchemaType<typeof initialSchemas.recipeFunction>;
export type ArgType = InferSchemaType<typeof initialSchemas.arg>;
export type RecipeWithBrokersType = InferSchemaType<typeof initialSchemas.recipeWithBrokers>;
export type SomeOther3Type = InferSchemaType<typeof initialSchemas.someOther3>;
export type SomeOther4Type = InferSchemaType<typeof initialSchemas.someOther4>;



/*
export const initialSchemas2: Record<string, TableSchema> = {
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
                    db_p: `p_id`,
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
                    database: 'name',
                    db_p: `p_name`,
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
                    database: 'module_path',
                    db_p: `p_module_path`,
                    pretty: 'Module Path',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string>(),
                },
            },
            className: {
                alts: {
                    frontend: 'className',
                    backend: 'class_name',
                    database: 'class_name',
                    db_p: `p_class_name`,
                    pretty: 'Class Name',
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
                    database: 'description',
                    db_p: `p_description`,
                    pretty: 'Description',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string>(),
                },
            },
            returnBroker: {
                alts: {
                    frontend: 'returnBroker',
                    backend: 'return_broker',
                    database: 'return_broker',
                    db_p: `p_return_broker`,
                    pretty: 'Return Broker',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'simple',
                    typeReference: createTypeReference<string>(),
                },
            },
            returnBrokerReference: {
                alts: {
                    frontend: 'returnBrokerReference',
                    backend: 'return_broker_reference',
                    database: 'broker',
                    db_p: `broker`,
                    pretty: 'Return Broker',
                },
                type: 'string',
                format: 'single',
                structure: {
                    structure: 'foreignKey',
                    typeReference: createTypeReference<BrokerType>(),
                },
            },
            arg: {
                alts: {
                    frontend: 'arg',
                    backend: 'arg',
                    database: 'arg',
                    db_p: `p_arg`,
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
            // fields
        },
    }, // comma between each entry
    someOther4: {
        name: {
            frontend: '',
            backend: '',
            database: '',
            pretty: '',
        },
        schemaType: 'table',
        fields: {
            // Fields
        },
    }, // comma between each entry
};  // close it off with this

 */
