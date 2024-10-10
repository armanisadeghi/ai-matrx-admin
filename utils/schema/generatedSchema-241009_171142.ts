// import {TableSchema, createTypeReference, InferSchemaType} from './schemaRegistry';
// import {Json} from "@/types/database.types";
//
//
// export const initialSchemas: Record<string, TableSchema> = {
//     action: {
//         name: {
//             frontend: 'action',
//             backend: 'action',
//             database: 'action',
//             pretty: 'Action'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             matrix: {
//                 alts: {
//                     frontend: 'matrix',
//                     backend: 'matrix',
//                     database: 'matrix',
//                     db_p: 'p_matrix',
//                     pretty: 'Matrix'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             transformer: {
//                 alts: {
//                     frontend: 'transformer',
//                     backend: 'transformer',
//                     database: 'transformer',
//                     db_p: 'p_transformer',
//                     pretty: 'Transformer'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             node_type: {
//                 alts: {
//                     frontend: 'node_type',
//                     backend: 'nodetype',
//                     database: 'node_type',
//                     db_p: 'p_node_type',
//                     pretty: 'Node Type'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             reference_id: {
//                 alts: {
//                     frontend: 'reference_id',
//                     backend: 'referenceid',
//                     database: 'reference_id',
//                     db_p: 'p_reference_id',
//                     pretty: 'Reference Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     ai_endpoint: {
//         name: {
//             frontend: 'ai_endpoint',
//             backend: 'aiendpoint',
//             database: 'ai_endpoint',
//             pretty: 'Ai Endpoint'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             provider: {
//                 alts: {
//                     frontend: 'provider',
//                     backend: 'provider',
//                     database: 'provider',
//                     db_p: 'p_provider',
//                     pretty: 'Provider'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             description: {
//                 alts: {
//                     frontend: 'description',
//                     backend: 'description',
//                     database: 'description',
//                     db_p: 'p_description',
//                     pretty: 'Description'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             additional_cost: {
//                 alts: {
//                     frontend: 'additional_cost',
//                     backend: 'additionalcost',
//                     database: 'additional_cost',
//                     db_p: 'p_additional_cost',
//                     pretty: 'Additional Cost'
//                 },
//                 type: 'boolean',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<boolean>()
//                 }
//             },
//             cost_details: {
//                 alts: {
//                     frontend: 'cost_details',
//                     backend: 'costdetails',
//                     database: 'cost_details',
//                     db_p: 'p_cost_details',
//                     pretty: 'Cost Details'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             params: {
//                 alts: {
//                     frontend: 'params',
//                     backend: 'params',
//                     database: 'params',
//                     db_p: 'p_params',
//                     pretty: 'Params'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     ai_model: {
//         name: {
//             frontend: 'ai_model',
//             backend: 'aimodel',
//             database: 'ai_model',
//             pretty: 'Ai Model'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             common_name: {
//                 alts: {
//                     frontend: 'common_name',
//                     backend: 'commonname',
//                     database: 'common_name',
//                     db_p: 'p_common_name',
//                     pretty: 'Common Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             class: {
//                 alts: {
//                     frontend: 'class',
//                     backend: 'class',
//                     database: 'class',
//                     db_p: 'p_class',
//                     pretty: 'Class'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             provider: {
//                 alts: {
//                     frontend: 'provider',
//                     backend: 'provider',
//                     database: 'provider',
//                     db_p: 'p_provider',
//                     pretty: 'Provider'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             endpoints: {
//                 alts: {
//                     frontend: 'endpoints',
//                     backend: 'endpoints',
//                     database: 'endpoints',
//                     db_p: 'p_endpoints',
//                     pretty: 'Endpoints'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             context_window: {
//                 alts: {
//                     frontend: 'context_window',
//                     backend: 'contextwindow',
//                     database: 'context_window',
//                     db_p: 'p_context_window',
//                     pretty: 'Context Window'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             max_tokens: {
//                 alts: {
//                     frontend: 'max_tokens',
//                     backend: 'maxtokens',
//                     database: 'max_tokens',
//                     db_p: 'p_max_tokens',
//                     pretty: 'Max Tokens'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             capabilities: {
//                 alts: {
//                     frontend: 'capabilities',
//                     backend: 'capabilities',
//                     database: 'capabilities',
//                     db_p: 'p_capabilities',
//                     pretty: 'Capabilities'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             controls: {
//                 alts: {
//                     frontend: 'controls',
//                     backend: 'controls',
//                     database: 'controls',
//                     db_p: 'p_controls',
//                     pretty: 'Controls'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     arg: {
//         name: {
//             frontend: 'arg',
//             backend: 'arg',
//             database: 'arg',
//             pretty: 'Arg'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             required: {
//                 alts: {
//                     frontend: 'required',
//                     backend: 'required',
//                     database: 'required',
//                     db_p: 'p_required',
//                     pretty: 'Required'
//                 },
//                 type: 'boolean',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<boolean>()
//                 }
//             },
//             default: {
//                 alts: {
//                     frontend: 'default',
//                     backend: 'default',
//                     database: 'default',
//                     db_p: 'p_default',
//                     pretty: 'Default'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             data_type: {
//                 alts: {
//                     frontend: 'data_type',
//                     backend: 'datatype',
//                     database: 'data_type',
//                     db_p: 'p_data_type',
//                     pretty: 'Data Type'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             ready: {
//                 alts: {
//                     frontend: 'ready',
//                     backend: 'ready',
//                     database: 'ready',
//                     db_p: 'p_ready',
//                     pretty: 'Ready'
//                 },
//                 type: 'boolean',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<boolean>()
//                 }
//             },
//             registered_function: {
//                 alts: {
//                     frontend: 'registered_function',
//                     backend: 'registeredfunction',
//                     database: 'registered_function',
//                     db_p: 'p_registered_function',
//                     pretty: 'Registered Function'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     automation_boundary_broker: {
//         name: {
//             frontend: 'automation_boundary_broker',
//             backend: 'automationboundarybroker',
//             database: 'automation_boundary_broker',
//             pretty: 'Automation Boundary Broker'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             matrix: {
//                 alts: {
//                     frontend: 'matrix',
//                     backend: 'matrix',
//                     database: 'matrix',
//                     db_p: 'p_matrix',
//                     pretty: 'Matrix'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker: {
//                 alts: {
//                     frontend: 'broker',
//                     backend: 'broker',
//                     database: 'broker',
//                     db_p: 'p_broker',
//                     pretty: 'Broker'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             spark_source: {
//                 alts: {
//                     frontend: 'spark_source',
//                     backend: 'sparksource',
//                     database: 'spark_source',
//                     db_p: 'p_spark_source',
//                     pretty: 'Spark Source'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             beacon_destination: {
//                 alts: {
//                     frontend: 'beacon_destination',
//                     backend: 'beacondestination',
//                     database: 'beacon_destination',
//                     db_p: 'p_beacon_destination',
//                     pretty: 'Beacon Destination'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     automation_matrix: {
//         name: {
//             frontend: 'automation_matrix',
//             backend: 'automationmatrix',
//             database: 'automation_matrix',
//             pretty: 'Automation Matrix'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             description: {
//                 alts: {
//                     frontend: 'description',
//                     backend: 'description',
//                     database: 'description',
//                     db_p: 'p_description',
//                     pretty: 'Description'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             average_seconds: {
//                 alts: {
//                     frontend: 'average_seconds',
//                     backend: 'averageseconds',
//                     database: 'average_seconds',
//                     db_p: 'p_average_seconds',
//                     pretty: 'Average Seconds'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             is_automated: {
//                 alts: {
//                     frontend: 'is_automated',
//                     backend: 'isautomated',
//                     database: 'is_automated',
//                     db_p: 'p_is_automated',
//                     pretty: 'Is Automated'
//                 },
//                 type: 'boolean',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<boolean>()
//                 }
//             },
//             cognition_matrices: {
//                 alts: {
//                     frontend: 'cognition_matrices',
//                     backend: 'cognitionmatrices',
//                     database: 'cognition_matrices',
//                     db_p: 'p_cognition_matrices',
//                     pretty: 'Cognition Matrices'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     broker: {
//         name: {
//             frontend: 'broker',
//             backend: 'broker',
//             database: 'broker',
//             pretty: 'Broker'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             value: {
//                 alts: {
//                     frontend: 'value',
//                     backend: 'value',
//                     database: 'value',
//                     db_p: 'p_value',
//                     pretty: 'Value'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             data_type: {
//                 alts: {
//                     frontend: 'data_type',
//                     backend: 'datatype',
//                     database: 'data_type',
//                     db_p: 'p_data_type',
//                     pretty: 'Data Type'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             ready: {
//                 alts: {
//                     frontend: 'ready',
//                     backend: 'ready',
//                     database: 'ready',
//                     db_p: 'p_ready',
//                     pretty: 'Ready'
//                 },
//                 type: 'boolean',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<boolean>()
//                 }
//             },
//             default_source: {
//                 alts: {
//                     frontend: 'default_source',
//                     backend: 'defaultsource',
//                     database: 'default_source',
//                     db_p: 'p_default_source',
//                     pretty: 'Default Source'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             display_name: {
//                 alts: {
//                     frontend: 'display_name',
//                     backend: 'displayname',
//                     database: 'display_name',
//                     db_p: 'p_display_name',
//                     pretty: 'Display Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             description: {
//                 alts: {
//                     frontend: 'description',
//                     backend: 'description',
//                     database: 'description',
//                     db_p: 'p_description',
//                     pretty: 'Description'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             tooltip: {
//                 alts: {
//                     frontend: 'tooltip',
//                     backend: 'tooltip',
//                     database: 'tooltip',
//                     db_p: 'p_tooltip',
//                     pretty: 'Tooltip'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             validation_rules: {
//                 alts: {
//                     frontend: 'validation_rules',
//                     backend: 'validationrules',
//                     database: 'validation_rules',
//                     db_p: 'p_validation_rules',
//                     pretty: 'Validation Rules'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             sample_entries: {
//                 alts: {
//                     frontend: 'sample_entries',
//                     backend: 'sampleentries',
//                     database: 'sample_entries',
//                     db_p: 'p_sample_entries',
//                     pretty: 'Sample Entries'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             custom_source_component: {
//                 alts: {
//                     frontend: 'custom_source_component',
//                     backend: 'customsourcecomponent',
//                     database: 'custom_source_component',
//                     db_p: 'p_custom_source_component',
//                     pretty: 'Custom Source Component'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             additional_params: {
//                 alts: {
//                     frontend: 'additional_params',
//                     backend: 'additionalparams',
//                     database: 'additional_params',
//                     db_p: 'p_additional_params',
//                     pretty: 'Additional Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             other_source_params: {
//                 alts: {
//                     frontend: 'other_source_params',
//                     backend: 'othersourceparams',
//                     database: 'other_source_params',
//                     db_p: 'p_other_source_params',
//                     pretty: 'Other Source Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             default_destination: {
//                 alts: {
//                     frontend: 'default_destination',
//                     backend: 'defaultdestination',
//                     database: 'default_destination',
//                     db_p: 'p_default_destination',
//                     pretty: 'Default Destination'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             output_component: {
//                 alts: {
//                     frontend: 'output_component',
//                     backend: 'outputcomponent',
//                     database: 'output_component',
//                     db_p: 'p_output_component',
//                     pretty: 'Output Component'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             tags: {
//                 alts: {
//                     frontend: 'tags',
//                     backend: 'tags',
//                     database: 'tags',
//                     db_p: 'p_tags',
//                     pretty: 'Tags'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     data_input_component: {
//         name: {
//             frontend: 'data_input_component',
//             backend: 'datainputcomponent',
//             database: 'data_input_component',
//             pretty: 'Data Input Component'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             options: {
//                 alts: {
//                     frontend: 'options',
//                     backend: 'options',
//                     database: 'options',
//                     db_p: 'p_options',
//                     pretty: 'Options'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             include_other: {
//                 alts: {
//                     frontend: 'include_other',
//                     backend: 'includeother',
//                     database: 'include_other',
//                     db_p: 'p_include_other',
//                     pretty: 'Include Other'
//                 },
//                 type: 'boolean',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<boolean>()
//                 }
//             },
//             min: {
//                 alts: {
//                     frontend: 'min',
//                     backend: 'min',
//                     database: 'min',
//                     db_p: 'p_min',
//                     pretty: 'Min'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             max: {
//                 alts: {
//                     frontend: 'max',
//                     backend: 'max',
//                     database: 'max',
//                     db_p: 'p_max',
//                     pretty: 'Max'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             step: {
//                 alts: {
//                     frontend: 'step',
//                     backend: 'step',
//                     database: 'step',
//                     db_p: 'p_step',
//                     pretty: 'Step'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             min_rows: {
//                 alts: {
//                     frontend: 'min_rows',
//                     backend: 'minrows',
//                     database: 'min_rows',
//                     db_p: 'p_min_rows',
//                     pretty: 'Min Rows'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             max_rows: {
//                 alts: {
//                     frontend: 'max_rows',
//                     backend: 'maxrows',
//                     database: 'max_rows',
//                     db_p: 'p_max_rows',
//                     pretty: 'Max Rows'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             acceptable_filetypes: {
//                 alts: {
//                     frontend: 'acceptable_filetypes',
//                     backend: 'acceptablefiletypes',
//                     database: 'acceptable_filetypes',
//                     db_p: 'p_acceptable_filetypes',
//                     pretty: 'Acceptable Filetypes'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             src: {
//                 alts: {
//                     frontend: 'src',
//                     backend: 'src',
//                     database: 'src',
//                     db_p: 'p_src',
//                     pretty: 'Src'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             classes: {
//                 alts: {
//                     frontend: 'classes',
//                     backend: 'classes',
//                     database: 'classes',
//                     db_p: 'p_classes',
//                     pretty: 'Classes'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             color_overrides: {
//                 alts: {
//                     frontend: 'color_overrides',
//                     backend: 'coloroverrides',
//                     database: 'color_overrides',
//                     db_p: 'p_color_overrides',
//                     pretty: 'Color Overrides'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             additional_params: {
//                 alts: {
//                     frontend: 'additional_params',
//                     backend: 'additionalparams',
//                     database: 'additional_params',
//                     db_p: 'p_additional_params',
//                     pretty: 'Additional Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     data_output_component: {
//         name: {
//             frontend: 'data_output_component',
//             backend: 'dataoutputcomponent',
//             database: 'data_output_component',
//             pretty: 'Data Output Component'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             component_type: {
//                 alts: {
//                     frontend: 'component_type',
//                     backend: 'componenttype',
//                     database: 'component_type',
//                     db_p: 'p_component_type',
//                     pretty: 'Component Type'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             ui_component: {
//                 alts: {
//                     frontend: 'ui_component',
//                     backend: 'uicomponent',
//                     database: 'ui_component',
//                     db_p: 'p_ui_component',
//                     pretty: 'Ui Component'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             props: {
//                 alts: {
//                     frontend: 'props',
//                     backend: 'props',
//                     database: 'props',
//                     db_p: 'p_props',
//                     pretty: 'Props'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             additional_params: {
//                 alts: {
//                     frontend: 'additional_params',
//                     backend: 'additionalparams',
//                     database: 'additional_params',
//                     db_p: 'p_additional_params',
//                     pretty: 'Additional Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     display_option: {
//         name: {
//             frontend: 'display_option',
//             backend: 'displayoption',
//             database: 'display_option',
//             pretty: 'Display Option'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             default_params: {
//                 alts: {
//                     frontend: 'default_params',
//                     backend: 'defaultparams',
//                     database: 'default_params',
//                     db_p: 'p_default_params',
//                     pretty: 'Default Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             customizable_params: {
//                 alts: {
//                     frontend: 'customizable_params',
//                     backend: 'customizableparams',
//                     database: 'customizable_params',
//                     db_p: 'p_customizable_params',
//                     pretty: 'Customizable Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             additional_params: {
//                 alts: {
//                     frontend: 'additional_params',
//                     backend: 'additionalparams',
//                     database: 'additional_params',
//                     db_p: 'p_additional_params',
//                     pretty: 'Additional Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     emails: {
//         name: {
//             frontend: 'emails',
//             backend: 'emails',
//             database: 'emails',
//             pretty: 'Emails'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             sender: {
//                 alts: {
//                     frontend: 'sender',
//                     backend: 'sender',
//                     database: 'sender',
//                     db_p: 'p_sender',
//                     pretty: 'Sender'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             recipient: {
//                 alts: {
//                     frontend: 'recipient',
//                     backend: 'recipient',
//                     database: 'recipient',
//                     db_p: 'p_recipient',
//                     pretty: 'Recipient'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             subject: {
//                 alts: {
//                     frontend: 'subject',
//                     backend: 'subject',
//                     database: 'subject',
//                     db_p: 'p_subject',
//                     pretty: 'Subject'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             body: {
//                 alts: {
//                     frontend: 'body',
//                     backend: 'body',
//                     database: 'body',
//                     db_p: 'p_body',
//                     pretty: 'Body'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             timestamp: {
//                 alts: {
//                     frontend: 'timestamp',
//                     backend: 'timestamp',
//                     database: 'timestamp',
//                     db_p: 'p_timestamp',
//                     pretty: 'Timestamp'
//                 },
//                 type: 'Date',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             is_read: {
//                 alts: {
//                     frontend: 'is_read',
//                     backend: 'isread',
//                     database: 'is_read',
//                     db_p: 'p_is_read',
//                     pretty: 'Is Read'
//                 },
//                 type: 'boolean',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<boolean>()
//                 }
//             }
//         }
//     },
//     extractor: {
//         name: {
//             frontend: 'extractor',
//             backend: 'extractor',
//             database: 'extractor',
//             pretty: 'Extractor'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             output_type: {
//                 alts: {
//                     frontend: 'output_type',
//                     backend: 'outputtype',
//                     database: 'output_type',
//                     db_p: 'p_output_type',
//                     pretty: 'Output Type'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             default_identifier: {
//                 alts: {
//                     frontend: 'default_identifier',
//                     backend: 'defaultidentifier',
//                     database: 'default_identifier',
//                     db_p: 'p_default_identifier',
//                     pretty: 'Default Identifier'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             default_index: {
//                 alts: {
//                     frontend: 'default_index',
//                     backend: 'defaultindex',
//                     database: 'default_index',
//                     db_p: 'p_default_index',
//                     pretty: 'Default Index'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     flashcard_data: {
//         name: {
//             frontend: 'flashcard_data',
//             backend: 'flashcarddata',
//             database: 'flashcard_data',
//             pretty: 'Flashcard Data'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             user_id: {
//                 alts: {
//                     frontend: 'user_id',
//                     backend: 'userid',
//                     database: 'user_id',
//                     db_p: 'p_user_id',
//                     pretty: 'User Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             topic: {
//                 alts: {
//                     frontend: 'topic',
//                     backend: 'topic',
//                     database: 'topic',
//                     db_p: 'p_topic',
//                     pretty: 'Topic'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             lesson: {
//                 alts: {
//                     frontend: 'lesson',
//                     backend: 'lesson',
//                     database: 'lesson',
//                     db_p: 'p_lesson',
//                     pretty: 'Lesson'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             difficulty: {
//                 alts: {
//                     frontend: 'difficulty',
//                     backend: 'difficulty',
//                     database: 'difficulty',
//                     db_p: 'p_difficulty',
//                     pretty: 'Difficulty'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             front: {
//                 alts: {
//                     frontend: 'front',
//                     backend: 'front',
//                     database: 'front',
//                     db_p: 'p_front',
//                     pretty: 'Front'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             back: {
//                 alts: {
//                     frontend: 'back',
//                     backend: 'back',
//                     database: 'back',
//                     db_p: 'p_back',
//                     pretty: 'Back'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             example: {
//                 alts: {
//                     frontend: 'example',
//                     backend: 'example',
//                     database: 'example',
//                     db_p: 'p_example',
//                     pretty: 'Example'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             detailed_explanation: {
//                 alts: {
//                     frontend: 'detailed_explanation',
//                     backend: 'detailedexplanation',
//                     database: 'detailed_explanation',
//                     db_p: 'p_detailed_explanation',
//                     pretty: 'Detailed Explanation'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             audio_explanation: {
//                 alts: {
//                     frontend: 'audio_explanation',
//                     backend: 'audioexplanation',
//                     database: 'audio_explanation',
//                     db_p: 'p_audio_explanation',
//                     pretty: 'Audio Explanation'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             personal_notes: {
//                 alts: {
//                     frontend: 'personal_notes',
//                     backend: 'personalnotes',
//                     database: 'personal_notes',
//                     db_p: 'p_personal_notes',
//                     pretty: 'Personal Notes'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             is_deleted: {
//                 alts: {
//                     frontend: 'is_deleted',
//                     backend: 'isdeleted',
//                     database: 'is_deleted',
//                     db_p: 'p_is_deleted',
//                     pretty: 'Is Deleted'
//                 },
//                 type: 'boolean',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<boolean>()
//                 }
//             },
//             public: {
//                 alts: {
//                     frontend: 'public',
//                     backend: 'public',
//                     database: 'public',
//                     db_p: 'p_public',
//                     pretty: 'Public'
//                 },
//                 type: 'boolean',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<boolean>()
//                 }
//             },
//             shared_with: {
//                 alts: {
//                     frontend: 'shared_with',
//                     backend: 'sharedwith',
//                     database: 'shared_with',
//                     db_p: 'p_shared_with',
//                     pretty: 'Shared With'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             created_at: {
//                 alts: {
//                     frontend: 'created_at',
//                     backend: 'createdat',
//                     database: 'created_at',
//                     db_p: 'p_created_at',
//                     pretty: 'Created At'
//                 },
//                 type: 'Date',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             updated_at: {
//                 alts: {
//                     frontend: 'updated_at',
//                     backend: 'updatedat',
//                     database: 'updated_at',
//                     db_p: 'p_updated_at',
//                     pretty: 'Updated At'
//                 },
//                 type: 'Date',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     flashcard_history: {
//         name: {
//             frontend: 'flashcard_history',
//             backend: 'flashcardhistory',
//             database: 'flashcard_history',
//             pretty: 'Flashcard History'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             flashcard_id: {
//                 alts: {
//                     frontend: 'flashcard_id',
//                     backend: 'flashcardid',
//                     database: 'flashcard_id',
//                     db_p: 'p_flashcard_id',
//                     pretty: 'Flashcard Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             user_id: {
//                 alts: {
//                     frontend: 'user_id',
//                     backend: 'userid',
//                     database: 'user_id',
//                     db_p: 'p_user_id',
//                     pretty: 'User Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             review_count: {
//                 alts: {
//                     frontend: 'review_count',
//                     backend: 'reviewcount',
//                     database: 'review_count',
//                     db_p: 'p_review_count',
//                     pretty: 'Review Count'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             correct_count: {
//                 alts: {
//                     frontend: 'correct_count',
//                     backend: 'correctcount',
//                     database: 'correct_count',
//                     db_p: 'p_correct_count',
//                     pretty: 'Correct Count'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             incorrect_count: {
//                 alts: {
//                     frontend: 'incorrect_count',
//                     backend: 'incorrectcount',
//                     database: 'incorrect_count',
//                     db_p: 'p_incorrect_count',
//                     pretty: 'Incorrect Count'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             created_at: {
//                 alts: {
//                     frontend: 'created_at',
//                     backend: 'createdat',
//                     database: 'created_at',
//                     db_p: 'p_created_at',
//                     pretty: 'Created At'
//                 },
//                 type: 'Date',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             updated_at: {
//                 alts: {
//                     frontend: 'updated_at',
//                     backend: 'updatedat',
//                     database: 'updated_at',
//                     db_p: 'p_updated_at',
//                     pretty: 'Updated At'
//                 },
//                 type: 'Date',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     flashcard_images: {
//         name: {
//             frontend: 'flashcard_images',
//             backend: 'flashcardimages',
//             database: 'flashcard_images',
//             pretty: 'Flashcard Images'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             flashcard_id: {
//                 alts: {
//                     frontend: 'flashcard_id',
//                     backend: 'flashcardid',
//                     database: 'flashcard_id',
//                     db_p: 'p_flashcard_id',
//                     pretty: 'Flashcard Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             file_path: {
//                 alts: {
//                     frontend: 'file_path',
//                     backend: 'filepath',
//                     database: 'file_path',
//                     db_p: 'p_file_path',
//                     pretty: 'File Path'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             file_name: {
//                 alts: {
//                     frontend: 'file_name',
//                     backend: 'filename',
//                     database: 'file_name',
//                     db_p: 'p_file_name',
//                     pretty: 'File Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             mime_type: {
//                 alts: {
//                     frontend: 'mime_type',
//                     backend: 'mimetype',
//                     database: 'mime_type',
//                     db_p: 'p_mime_type',
//                     pretty: 'Mime Type'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             size: {
//                 alts: {
//                     frontend: 'size',
//                     backend: 'size',
//                     database: 'size',
//                     db_p: 'p_size',
//                     pretty: 'Size'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             created_at: {
//                 alts: {
//                     frontend: 'created_at',
//                     backend: 'createdat',
//                     database: 'created_at',
//                     db_p: 'p_created_at',
//                     pretty: 'Created At'
//                 },
//                 type: 'Date',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     flashcard_set_relations: {
//         name: {
//             frontend: 'flashcard_set_relations',
//             backend: 'flashcardsetrelations',
//             database: 'flashcard_set_relations',
//             pretty: 'Flashcard Set Relations'
//         },
//         schemaType: 'table',
//         fields: {
//             flashcard_id: {
//                 alts: {
//                     frontend: 'flashcard_id',
//                     backend: 'flashcardid',
//                     database: 'flashcard_id',
//                     db_p: 'p_flashcard_id',
//                     pretty: 'Flashcard Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             set_id: {
//                 alts: {
//                     frontend: 'set_id',
//                     backend: 'setid',
//                     database: 'set_id',
//                     db_p: 'p_set_id',
//                     pretty: 'Set Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             order: {
//                 alts: {
//                     frontend: 'order',
//                     backend: 'order',
//                     database: 'order',
//                     db_p: 'p_order',
//                     pretty: 'Order'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     flashcard_sets: {
//         name: {
//             frontend: 'flashcard_sets',
//             backend: 'flashcardsets',
//             database: 'flashcard_sets',
//             pretty: 'Flashcard Sets'
//         },
//         schemaType: 'table',
//         fields: {
//             set_id: {
//                 alts: {
//                     frontend: 'set_id',
//                     backend: 'setid',
//                     database: 'set_id',
//                     db_p: 'p_set_id',
//                     pretty: 'Set Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             user_id: {
//                 alts: {
//                     frontend: 'user_id',
//                     backend: 'userid',
//                     database: 'user_id',
//                     db_p: 'p_user_id',
//                     pretty: 'User Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             created_at: {
//                 alts: {
//                     frontend: 'created_at',
//                     backend: 'createdat',
//                     database: 'created_at',
//                     db_p: 'p_created_at',
//                     pretty: 'Created At'
//                 },
//                 type: 'Date',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             updated_at: {
//                 alts: {
//                     frontend: 'updated_at',
//                     backend: 'updatedat',
//                     database: 'updated_at',
//                     db_p: 'p_updated_at',
//                     pretty: 'Updated At'
//                 },
//                 type: 'Date',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             shared_with: {
//                 alts: {
//                     frontend: 'shared_with',
//                     backend: 'sharedwith',
//                     database: 'shared_with',
//                     db_p: 'p_shared_with',
//                     pretty: 'Shared With'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             public: {
//                 alts: {
//                     frontend: 'public',
//                     backend: 'public',
//                     database: 'public',
//                     db_p: 'p_public',
//                     pretty: 'Public'
//                 },
//                 type: 'boolean',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<boolean>()
//                 }
//             },
//             topic: {
//                 alts: {
//                     frontend: 'topic',
//                     backend: 'topic',
//                     database: 'topic',
//                     db_p: 'p_topic',
//                     pretty: 'Topic'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             lesson: {
//                 alts: {
//                     frontend: 'lesson',
//                     backend: 'lesson',
//                     database: 'lesson',
//                     db_p: 'p_lesson',
//                     pretty: 'Lesson'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             difficulty: {
//                 alts: {
//                     frontend: 'difficulty',
//                     backend: 'difficulty',
//                     database: 'difficulty',
//                     db_p: 'p_difficulty',
//                     pretty: 'Difficulty'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             audio_overview: {
//                 alts: {
//                     frontend: 'audio_overview',
//                     backend: 'audiooverview',
//                     database: 'audio_overview',
//                     db_p: 'p_audio_overview',
//                     pretty: 'Audio Overview'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     processor: {
//         name: {
//             frontend: 'processor',
//             backend: 'processor',
//             database: 'processor',
//             pretty: 'Processor'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             depends_default: {
//                 alts: {
//                     frontend: 'depends_default',
//                     backend: 'dependsdefault',
//                     database: 'depends_default',
//                     db_p: 'p_depends_default',
//                     pretty: 'Depends Default'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             default_extractors: {
//                 alts: {
//                     frontend: 'default_extractors',
//                     backend: 'defaultextractors',
//                     database: 'default_extractors',
//                     db_p: 'p_default_extractors',
//                     pretty: 'Default Extractors'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             params: {
//                 alts: {
//                     frontend: 'params',
//                     backend: 'params',
//                     database: 'params',
//                     db_p: 'p_params',
//                     pretty: 'Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     recipe: {
//         name: {
//             frontend: 'recipe',
//             backend: 'recipe',
//             database: 'recipe',
//             pretty: 'Recipe'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             description: {
//                 alts: {
//                     frontend: 'description',
//                     backend: 'description',
//                     database: 'description',
//                     db_p: 'p_description',
//                     pretty: 'Description'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             tags: {
//                 alts: {
//                     frontend: 'tags',
//                     backend: 'tags',
//                     database: 'tags',
//                     db_p: 'p_tags',
//                     pretty: 'Tags'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             sample_output: {
//                 alts: {
//                     frontend: 'sample_output',
//                     backend: 'sampleoutput',
//                     database: 'sample_output',
//                     db_p: 'p_sample_output',
//                     pretty: 'Sample Output'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             is_public: {
//                 alts: {
//                     frontend: 'is_public',
//                     backend: 'ispublic',
//                     database: 'is_public',
//                     db_p: 'p_is_public',
//                     pretty: 'Is Public'
//                 },
//                 type: 'boolean',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<boolean>()
//                 }
//             },
//             status: {
//                 alts: {
//                     frontend: 'status',
//                     backend: 'status',
//                     database: 'status',
//                     db_p: 'p_status',
//                     pretty: 'Status'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             version: {
//                 alts: {
//                     frontend: 'version',
//                     backend: 'version',
//                     database: 'version',
//                     db_p: 'p_version',
//                     pretty: 'Version'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             messages: {
//                 alts: {
//                     frontend: 'messages',
//                     backend: 'messages',
//                     database: 'messages',
//                     db_p: 'p_messages',
//                     pretty: 'Messages'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             post_result_options: {
//                 alts: {
//                     frontend: 'post_result_options',
//                     backend: 'postresultoptions',
//                     database: 'post_result_options',
//                     db_p: 'p_post_result_options',
//                     pretty: 'Post Result Options'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     recipe_broker: {
//         name: {
//             frontend: 'recipe_broker',
//             backend: 'recipebroker',
//             database: 'recipe_broker',
//             pretty: 'Recipe Broker'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             recipe: {
//                 alts: {
//                     frontend: 'recipe',
//                     backend: 'recipe',
//                     database: 'recipe',
//                     db_p: 'p_recipe',
//                     pretty: 'Recipe'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker: {
//                 alts: {
//                     frontend: 'broker',
//                     backend: 'broker',
//                     database: 'broker',
//                     db_p: 'p_broker',
//                     pretty: 'Broker'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_role: {
//                 alts: {
//                     frontend: 'broker_role',
//                     backend: 'brokerrole',
//                     database: 'broker_role',
//                     db_p: 'p_broker_role',
//                     pretty: 'Broker Role'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             required: {
//                 alts: {
//                     frontend: 'required',
//                     backend: 'required',
//                     database: 'required',
//                     db_p: 'p_required',
//                     pretty: 'Required'
//                 },
//                 type: 'boolean',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<boolean>()
//                 }
//             }
//         }
//     },
//     recipe_display: {
//         name: {
//             frontend: 'recipe_display',
//             backend: 'recipedisplay',
//             database: 'recipe_display',
//             pretty: 'Recipe Display'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             recipe: {
//                 alts: {
//                     frontend: 'recipe',
//                     backend: 'recipe',
//                     database: 'recipe',
//                     db_p: 'p_recipe',
//                     pretty: 'Recipe'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             display: {
//                 alts: {
//                     frontend: 'display',
//                     backend: 'display',
//                     database: 'display',
//                     db_p: 'p_display',
//                     pretty: 'Display'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             priority: {
//                 alts: {
//                     frontend: 'priority',
//                     backend: 'priority',
//                     database: 'priority',
//                     db_p: 'p_priority',
//                     pretty: 'Priority'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             display_settings: {
//                 alts: {
//                     frontend: 'display_settings',
//                     backend: 'displaysettings',
//                     database: 'display_settings',
//                     db_p: 'p_display_settings',
//                     pretty: 'Display Settings'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     recipe_function: {
//         name: {
//             frontend: 'recipe_function',
//             backend: 'recipefunction',
//             database: 'recipe_function',
//             pretty: 'Recipe Function'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             recipe: {
//                 alts: {
//                     frontend: 'recipe',
//                     backend: 'recipe',
//                     database: 'recipe',
//                     db_p: 'p_recipe',
//                     pretty: 'Recipe'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             function: {
//                 alts: {
//                     frontend: 'function',
//                     backend: 'function',
//                     database: 'function',
//                     db_p: 'p_function',
//                     pretty: 'Function'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             role: {
//                 alts: {
//                     frontend: 'role',
//                     backend: 'role',
//                     database: 'role',
//                     db_p: 'p_role',
//                     pretty: 'Role'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             params: {
//                 alts: {
//                     frontend: 'params',
//                     backend: 'params',
//                     database: 'params',
//                     db_p: 'p_params',
//                     pretty: 'Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     recipe_model: {
//         name: {
//             frontend: 'recipe_model',
//             backend: 'recipemodel',
//             database: 'recipe_model',
//             pretty: 'Recipe Model'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             recipe: {
//                 alts: {
//                     frontend: 'recipe',
//                     backend: 'recipe',
//                     database: 'recipe',
//                     db_p: 'p_recipe',
//                     pretty: 'Recipe'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             ai_model: {
//                 alts: {
//                     frontend: 'ai_model',
//                     backend: 'aimodel',
//                     database: 'ai_model',
//                     db_p: 'p_ai_model',
//                     pretty: 'Ai Model'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             role: {
//                 alts: {
//                     frontend: 'role',
//                     backend: 'role',
//                     database: 'role',
//                     db_p: 'p_role',
//                     pretty: 'Role'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             priority: {
//                 alts: {
//                     frontend: 'priority',
//                     backend: 'priority',
//                     database: 'priority',
//                     db_p: 'p_priority',
//                     pretty: 'Priority'
//                 },
//                 type: 'number',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     recipe_processor: {
//         name: {
//             frontend: 'recipe_processor',
//             backend: 'recipeprocessor',
//             database: 'recipe_processor',
//             pretty: 'Recipe Processor'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             recipe: {
//                 alts: {
//                     frontend: 'recipe',
//                     backend: 'recipe',
//                     database: 'recipe',
//                     db_p: 'p_recipe',
//                     pretty: 'Recipe'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             processor: {
//                 alts: {
//                     frontend: 'processor',
//                     backend: 'processor',
//                     database: 'processor',
//                     db_p: 'p_processor',
//                     pretty: 'Processor'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             params: {
//                 alts: {
//                     frontend: 'params',
//                     backend: 'params',
//                     database: 'params',
//                     db_p: 'p_params',
//                     pretty: 'Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     recipe_tool: {
//         name: {
//             frontend: 'recipe_tool',
//             backend: 'recipetool',
//             database: 'recipe_tool',
//             pretty: 'Recipe Tool'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             recipe: {
//                 alts: {
//                     frontend: 'recipe',
//                     backend: 'recipe',
//                     database: 'recipe',
//                     db_p: 'p_recipe',
//                     pretty: 'Recipe'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             tool: {
//                 alts: {
//                     frontend: 'tool',
//                     backend: 'tool',
//                     database: 'tool',
//                     db_p: 'p_tool',
//                     pretty: 'Tool'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             params: {
//                 alts: {
//                     frontend: 'params',
//                     backend: 'params',
//                     database: 'params',
//                     db_p: 'p_params',
//                     pretty: 'Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     registered_function: {
//         name: {
//             frontend: 'registered_function',
//             backend: 'registeredfunction',
//             database: 'registered_function',
//             pretty: 'Registered Function'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             module_path: {
//                 alts: {
//                     frontend: 'module_path',
//                     backend: 'modulepath',
//                     database: 'module_path',
//                     db_p: 'p_module_path',
//                     pretty: 'Module Path'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             class_name: {
//                 alts: {
//                     frontend: 'class_name',
//                     backend: 'classname',
//                     database: 'class_name',
//                     db_p: 'p_class_name',
//                     pretty: 'Class Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             description: {
//                 alts: {
//                     frontend: 'description',
//                     backend: 'description',
//                     database: 'description',
//                     db_p: 'p_description',
//                     pretty: 'Description'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             return_broker: {
//                 alts: {
//                     frontend: 'return_broker',
//                     backend: 'returnbroker',
//                     database: 'return_broker',
//                     db_p: 'p_return_broker',
//                     pretty: 'Return Broker'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     system_function: {
//         name: {
//             frontend: 'system_function',
//             backend: 'systemfunction',
//             database: 'system_function',
//             pretty: 'System Function'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             description: {
//                 alts: {
//                     frontend: 'description',
//                     backend: 'description',
//                     database: 'description',
//                     db_p: 'p_description',
//                     pretty: 'Description'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             sample: {
//                 alts: {
//                     frontend: 'sample',
//                     backend: 'sample',
//                     database: 'sample',
//                     db_p: 'p_sample',
//                     pretty: 'Sample'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             input_params: {
//                 alts: {
//                     frontend: 'input_params',
//                     backend: 'inputparams',
//                     database: 'input_params',
//                     db_p: 'p_input_params',
//                     pretty: 'Input Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             output_options: {
//                 alts: {
//                     frontend: 'output_options',
//                     backend: 'outputoptions',
//                     database: 'output_options',
//                     db_p: 'p_output_options',
//                     pretty: 'Output Options'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             rf_id: {
//                 alts: {
//                     frontend: 'rf_id',
//                     backend: 'rfid',
//                     database: 'rf_id',
//                     db_p: 'p_rf_id',
//                     pretty: 'Rf Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     tool: {
//         name: {
//             frontend: 'tool',
//             backend: 'tool',
//             database: 'tool',
//             pretty: 'Tool'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             source: {
//                 alts: {
//                     frontend: 'source',
//                     backend: 'source',
//                     database: 'source',
//                     db_p: 'p_source',
//                     pretty: 'Source'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             description: {
//                 alts: {
//                     frontend: 'description',
//                     backend: 'description',
//                     database: 'description',
//                     db_p: 'p_description',
//                     pretty: 'Description'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             parameters: {
//                 alts: {
//                     frontend: 'parameters',
//                     backend: 'parameters',
//                     database: 'parameters',
//                     db_p: 'p_parameters',
//                     pretty: 'Parameters'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             required_args: {
//                 alts: {
//                     frontend: 'required_args',
//                     backend: 'requiredargs',
//                     database: 'required_args',
//                     db_p: 'p_required_args',
//                     pretty: 'Required Args'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             system_function: {
//                 alts: {
//                     frontend: 'system_function',
//                     backend: 'systemfunction',
//                     database: 'system_function',
//                     db_p: 'p_system_function',
//                     pretty: 'System Function'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             additional_params: {
//                 alts: {
//                     frontend: 'additional_params',
//                     backend: 'additionalparams',
//                     database: 'additional_params',
//                     db_p: 'p_additional_params',
//                     pretty: 'Additional Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     transformer: {
//         name: {
//             frontend: 'transformer',
//             backend: 'transformer',
//             database: 'transformer',
//             pretty: 'Transformer'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             input_params: {
//                 alts: {
//                     frontend: 'input_params',
//                     backend: 'inputparams',
//                     database: 'input_params',
//                     db_p: 'p_input_params',
//                     pretty: 'Input Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             output_params: {
//                 alts: {
//                     frontend: 'output_params',
//                     backend: 'outputparams',
//                     database: 'output_params',
//                     db_p: 'p_output_params',
//                     pretty: 'Output Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     user_preferences: {
//         name: {
//             frontend: 'user_preferences',
//             backend: 'userpreferences',
//             database: 'user_preferences',
//             pretty: 'User Preferences'
//         },
//         schemaType: 'table',
//         fields: {
//             user_id: {
//                 alts: {
//                     frontend: 'user_id',
//                     backend: 'userid',
//                     database: 'user_id',
//                     db_p: 'p_user_id',
//                     pretty: 'User Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             preferences: {
//                 alts: {
//                     frontend: 'preferences',
//                     backend: 'preferences',
//                     database: 'preferences',
//                     db_p: 'p_preferences',
//                     pretty: 'Preferences'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             created_at: {
//                 alts: {
//                     frontend: 'created_at',
//                     backend: 'createdat',
//                     database: 'created_at',
//                     db_p: 'p_created_at',
//                     pretty: 'Created At'
//                 },
//                 type: 'Date',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             updated_at: {
//                 alts: {
//                     frontend: 'updated_at',
//                     backend: 'updatedat',
//                     database: 'updated_at',
//                     db_p: 'p_updated_at',
//                     pretty: 'Updated At'
//                 },
//                 type: 'Date',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     view_registered_function: {
//         name: {
//             frontend: 'view_registered_function',
//             backend: 'viewregisteredfunction',
//             database: 'view_registered_function',
//             pretty: 'View Registered Function'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             module_path: {
//                 alts: {
//                     frontend: 'module_path',
//                     backend: 'modulepath',
//                     database: 'module_path',
//                     db_p: 'p_module_path',
//                     pretty: 'Module Path'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             class_name: {
//                 alts: {
//                     frontend: 'class_name',
//                     backend: 'classname',
//                     database: 'class_name',
//                     db_p: 'p_class_name',
//                     pretty: 'Class Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             description: {
//                 alts: {
//                     frontend: 'description',
//                     backend: 'description',
//                     database: 'description',
//                     db_p: 'p_description',
//                     pretty: 'Description'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             return_broker: {
//                 alts: {
//                     frontend: 'return_broker',
//                     backend: 'returnbroker',
//                     database: 'return_broker',
//                     db_p: 'p_return_broker',
//                     pretty: 'Return Broker'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             return_brokers: {
//                 alts: {
//                     frontend: 'return_brokers',
//                     backend: 'returnbrokers',
//                     database: 'return_brokers',
//                     db_p: 'p_return_brokers',
//                     pretty: 'Return Brokers'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             args: {
//                 alts: {
//                     frontend: 'args',
//                     backend: 'args',
//                     database: 'args',
//                     db_p: 'p_args',
//                     pretty: 'Args'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             system_functions: {
//                 alts: {
//                     frontend: 'system_functions',
//                     backend: 'systemfunctions',
//                     database: 'system_functions',
//                     db_p: 'p_system_functions',
//                     pretty: 'System Functions'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     },
//     view_registered_function_all_rels: {
//         name: {
//             frontend: 'view_registered_function_all_rels',
//             backend: 'viewregisteredfunctionallrels',
//             database: 'view_registered_function_all_rels',
//             pretty: 'View Registered Function All Rels'
//         },
//         schemaType: 'table',
//         fields: {
//             id: {
//                 alts: {
//                     frontend: 'id',
//                     backend: 'id',
//                     database: 'id',
//                     db_p: 'p_id',
//                     pretty: 'Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             name: {
//                 alts: {
//                     frontend: 'name',
//                     backend: 'name',
//                     database: 'name',
//                     db_p: 'p_name',
//                     pretty: 'Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             module_path: {
//                 alts: {
//                     frontend: 'module_path',
//                     backend: 'modulepath',
//                     database: 'module_path',
//                     db_p: 'p_module_path',
//                     pretty: 'Module Path'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             class_name: {
//                 alts: {
//                     frontend: 'class_name',
//                     backend: 'classname',
//                     database: 'class_name',
//                     db_p: 'p_class_name',
//                     pretty: 'Class Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             description: {
//                 alts: {
//                     frontend: 'description',
//                     backend: 'description',
//                     database: 'description',
//                     db_p: 'p_description',
//                     pretty: 'Description'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             return_broker: {
//                 alts: {
//                     frontend: 'return_broker',
//                     backend: 'returnbroker',
//                     database: 'return_broker',
//                     db_p: 'p_return_broker',
//                     pretty: 'Return Broker'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_id: {
//                 alts: {
//                     frontend: 'broker_id',
//                     backend: 'brokerid',
//                     database: 'broker_id',
//                     db_p: 'p_broker_id',
//                     pretty: 'Broker Id'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_additional_params: {
//                 alts: {
//                     frontend: 'broker_additional_params',
//                     backend: 'brokeradditionalparams',
//                     database: 'broker_additional_params',
//                     db_p: 'p_broker_additional_params',
//                     pretty: 'Broker Additional Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_custom_source_component: {
//                 alts: {
//                     frontend: 'broker_custom_source_component',
//                     backend: 'brokercustomsourcecomponent',
//                     database: 'broker_custom_source_component',
//                     db_p: 'p_broker_custom_source_component',
//                     pretty: 'Broker Custom Source Component'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_data_type: {
//                 alts: {
//                     frontend: 'broker_data_type',
//                     backend: 'brokerdatatype',
//                     database: 'broker_data_type',
//                     db_p: 'p_broker_data_type',
//                     pretty: 'Broker Data Type'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_default_destination: {
//                 alts: {
//                     frontend: 'broker_default_destination',
//                     backend: 'brokerdefaultdestination',
//                     database: 'broker_default_destination',
//                     db_p: 'p_broker_default_destination',
//                     pretty: 'Broker Default Destination'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_default_source: {
//                 alts: {
//                     frontend: 'broker_default_source',
//                     backend: 'brokerdefaultsource',
//                     database: 'broker_default_source',
//                     db_p: 'p_broker_default_source',
//                     pretty: 'Broker Default Source'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_description: {
//                 alts: {
//                     frontend: 'broker_description',
//                     backend: 'brokerdescription',
//                     database: 'broker_description',
//                     db_p: 'p_broker_description',
//                     pretty: 'Broker Description'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_display_name: {
//                 alts: {
//                     frontend: 'broker_display_name',
//                     backend: 'brokerdisplayname',
//                     database: 'broker_display_name',
//                     db_p: 'p_broker_display_name',
//                     pretty: 'Broker Display Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_name: {
//                 alts: {
//                     frontend: 'broker_name',
//                     backend: 'brokername',
//                     database: 'broker_name',
//                     db_p: 'p_broker_name',
//                     pretty: 'Broker Name'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_other_source_params: {
//                 alts: {
//                     frontend: 'broker_other_source_params',
//                     backend: 'brokerothersourceparams',
//                     database: 'broker_other_source_params',
//                     db_p: 'p_broker_other_source_params',
//                     pretty: 'Broker Other Source Params'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_output_component: {
//                 alts: {
//                     frontend: 'broker_output_component',
//                     backend: 'brokeroutputcomponent',
//                     database: 'broker_output_component',
//                     db_p: 'p_broker_output_component',
//                     pretty: 'Broker Output Component'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_ready: {
//                 alts: {
//                     frontend: 'broker_ready',
//                     backend: 'brokerready',
//                     database: 'broker_ready',
//                     db_p: 'p_broker_ready',
//                     pretty: 'Broker Ready'
//                 },
//                 type: 'boolean',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<boolean>()
//                 }
//             },
//             broker_sample_entries: {
//                 alts: {
//                     frontend: 'broker_sample_entries',
//                     backend: 'brokersampleentries',
//                     database: 'broker_sample_entries',
//                     db_p: 'p_broker_sample_entries',
//                     pretty: 'Broker Sample Entries'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_tags: {
//                 alts: {
//                     frontend: 'broker_tags',
//                     backend: 'brokertags',
//                     database: 'broker_tags',
//                     db_p: 'p_broker_tags',
//                     pretty: 'Broker Tags'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_tooltip: {
//                 alts: {
//                     frontend: 'broker_tooltip',
//                     backend: 'brokertooltip',
//                     database: 'broker_tooltip',
//                     db_p: 'p_broker_tooltip',
//                     pretty: 'Broker Tooltip'
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_validation_rules: {
//                 alts: {
//                     frontend: 'broker_validation_rules',
//                     backend: 'brokervalidationrules',
//                     database: 'broker_validation_rules',
//                     db_p: 'p_broker_validation_rules',
//                     pretty: 'Broker Validation Rules'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             broker_value: {
//                 alts: {
//                     frontend: 'broker_value',
//                     backend: 'brokervalue',
//                     database: 'broker_value',
//                     db_p: 'p_broker_value',
//                     pretty: 'Broker Value'
//                 },
//                 type: 'object',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             args: {
//                 alts: {
//                     frontend: 'args',
//                     backend: 'args',
//                     database: 'args',
//                     db_p: 'p_args',
//                     pretty: 'Args'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             },
//             system_functions: {
//                 alts: {
//                     frontend: 'system_functions',
//                     backend: 'systemfunctions',
//                     database: 'system_functions',
//                     db_p: 'p_system_functions',
//                     pretty: 'System Functions'
//                 },
//                 type: 'unknown',
//                 format: 'single',
//                 structure: {
//                     structure: 'simple',
//                     typeReference: createTypeReference<any>()
//                 }
//             }
//         }
//     }
// };
//
// export type ActionType = InferSchemaType<typeof initialSchemas.action>;
// export type Ai_endpointType = InferSchemaType<typeof initialSchemas.ai_endpoint>;
// export type Ai_modelType = InferSchemaType<typeof initialSchemas.ai_model>;
// export type ArgType = InferSchemaType<typeof initialSchemas.arg>;
// export type Automation_boundary_brokerType = InferSchemaType<typeof initialSchemas.automation_boundary_broker>;
// export type Automation_matrixType = InferSchemaType<typeof initialSchemas.automation_matrix>;
// export type BrokerType = InferSchemaType<typeof initialSchemas.broker>;
// export type Data_input_componentType = InferSchemaType<typeof initialSchemas.data_input_component>;
// export type Data_output_componentType = InferSchemaType<typeof initialSchemas.data_output_component>;
// export type Display_optionType = InferSchemaType<typeof initialSchemas.display_option>;
// export type EmailsType = InferSchemaType<typeof initialSchemas.emails>;
// export type ExtractorType = InferSchemaType<typeof initialSchemas.extractor>;
// export type Flashcard_dataType = InferSchemaType<typeof initialSchemas.flashcard_data>;
// export type Flashcard_historyType = InferSchemaType<typeof initialSchemas.flashcard_history>;
// export type Flashcard_imagesType = InferSchemaType<typeof initialSchemas.flashcard_images>;
// export type Flashcard_set_relationsType = InferSchemaType<typeof initialSchemas.flashcard_set_relations>;
// export type Flashcard_setsType = InferSchemaType<typeof initialSchemas.flashcard_sets>;
// export type ProcessorType = InferSchemaType<typeof initialSchemas.processor>;
// export type RecipeType = InferSchemaType<typeof initialSchemas.recipe>;
// export type Recipe_brokerType = InferSchemaType<typeof initialSchemas.recipe_broker>;
// export type Recipe_displayType = InferSchemaType<typeof initialSchemas.recipe_display>;
// export type Recipe_functionType = InferSchemaType<typeof initialSchemas.recipe_function>;
// export type Recipe_modelType = InferSchemaType<typeof initialSchemas.recipe_model>;
// export type Recipe_processorType = InferSchemaType<typeof initialSchemas.recipe_processor>;
// export type Recipe_toolType = InferSchemaType<typeof initialSchemas.recipe_tool>;
// export type Registered_functionType = InferSchemaType<typeof initialSchemas.registered_function>;
// export type System_functionType = InferSchemaType<typeof initialSchemas.system_function>;
// export type ToolType = InferSchemaType<typeof initialSchemas.tool>;
// export type TransformerType = InferSchemaType<typeof initialSchemas.transformer>;
// export type User_preferencesType = InferSchemaType<typeof initialSchemas.user_preferences>;
// export type View_registered_functionType = InferSchemaType<typeof initialSchemas.view_registered_function>;
// export type View_registered_function_all_relsType = InferSchemaType<typeof initialSchemas.view_registered_function_all_rels>;
