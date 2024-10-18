// import {createTypeReference, DataType, FieldConverter, TableRelationship, TypeBrand} from "@/types/tableSchemaTypes";
//
//
// export const initialSchemasFake = {
//     action: {
//         name: {
//             frontend: 'action',
//             backend: 'action',
//             database: 'action',
//             pretty: 'Action',
//             component: 'Action',
//         },
//         schemaType: 'table' as const,
//         fields: {
//             id: {},
//             name: {},
//             matrix: {},
//             transformer: {},
//             nodeType: {
//                 alts: {
//                     frontend: 'nodeType',
//                     backend: 'node_type',
//                     database: 'node_type',
//                     db_p: 'p_node_type',
//                     pretty: 'Node Type',
//                     component: 'NodeType',
//                     kebab: 'node-type',
//                 },
//                 type: 'string',
//                 format: "single",
//                 structure: {
//                     structure: "simple",
//                     typeReference: createTypeReference<string>(),
//                 }
//             },
//             referenceId: {},
//             automationMatrixReference: {},
//             transformerReference: {
//                 alts: {
//                     frontend: 'transformerReference',
//                     backend: 'transformer_reference',
//                     database: 'ref_transformer',
//                     db_p: 'p_ref_transformer',
//                     pretty: 'Transformer Reference',
//                     component: 'TransformerReference',
//                     kebab: 'transformerReference',
//                 },
//                 type: 'string',
//                 format: 'single',
//                 structure: {
//                     structure: 'foreignKey',
//                     typeReference: createTypeReference<TransformerType>(),
//                 }
//             },
//         },
//         relationships: {
//             fetchStrategy: "m2mAndFk",
//             foreignKeys: [
//                 {column: 'matrix', relatedTable: 'automation_matrix', relatedColumn: 'id'},
//                 {column: 'transformer', relatedTable: 'transformer', relatedColumn: 'id'}
//             ],
//             inverseForeignKeys: [],
//             manyToMany: [],
//
//         }
//     },
//     aiEndpoint: {
//         name: {},
//         schemaType: {},
//         fields: {},
//         relationships: {},
//     },
//     transformer: {
//         name: {},
//         schemaType: {},
//         fields: {},
//         relationships: {},
//     },
//     aiModel: {
//         name: {},
//         schemaType: {},
//         fields: {},
//         relationships: {},
//     },
//     arg: {
//         name: {},
//         schemaType: {},
//         fields: {},
//         relationships: {},
//     },
// };
//
//
//
//
// export type TableSchemaFull = {
//     name: {
//         frontend: string;
//         backend: string;
//         database: string;
//         pretty: string;
//         [key: string]: string;
//     };
//     schemaType: 'table' | 'view' | 'function' | 'procedure';
//     fields: Record<string, {
//         alts: {
//             frontend: string;
//             backend: string;
//             database: string;
//             [key: string]: string;
//         };
//         type: DataType;
//         format: 'single' | 'array' | 'object';
//         structure: {
//             structure: 'simple' | 'foreignKey' | 'inverseForeignKey';
//             typeReference: TypeBrand<any>;
//             databaseTable?: TableSchemaFull['name']['database'];
//         };
//     }>;
//     relationships: {
//         fetchStrategy: string;
//         foreignKeys: Array<TableRelationship['foreignKeys']>;
//         inverseForeignKeys: Array<TableRelationship['inverseForeignKeys']>;
//         manyToMany: Array<TableRelationship['manyToMany']>;
//     };
// };
//
//
//
// type InferFieldTypeOld<T extends FieldConverter<any>> =
//     T['type'] extends 'string' ? string :
//     T['type'] extends 'number' ? number :
//     T['type'] extends 'boolean' ? boolean :
//     T['type'] extends 'date' ? Date :
//     // T['type'] extends 'array' ? Array<InferFieldType<T['structure']['typeReference']>> :
//     T['type'] extends 'object' ? object :
//     T['type'] extends 'null' ? null :
//     T['type'] extends 'undefined' ? undefined :
//     T['type'] extends 'function' ? (...args: any[]) => any :
//     T['type'] extends 'symbol' ? symbol :
//     T['type'] extends 'bigint' ? bigint :
//     T['type'] extends 'map' ? Map<any, any> :
//     T['type'] extends 'set' ? Set<any> :
//     T['type'] extends 'tuple' ? any[] :   // For simplicity, assuming tuple as array for now
//     T['type'] extends 'enum' ? any :      // Handle enum appropriately if you have more specific requirements
//     T['type'] extends 'union' ? any :     // Handle union types
//     T['type'] extends 'intersection' ? any : // Handle intersection types
//     T['type'] extends 'literal' ? any :   // Handle literal types
//     T['type'] extends 'void' ? void :
//     T['type'] extends 'never' ? never :
//     T['type'] extends 'any' ? any :
//     unknown;
