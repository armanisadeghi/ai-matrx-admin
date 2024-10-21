// type DataStructure = 'single' | 'array' | 'object';
//
// type DataType =
//     | 'string'
//     | 'number'
//     | 'boolean'
//     | 'date'
//     | 'time'
//     | 'datetime'
//     | 'uuid'
//     | 'json'
//     | 'binary'
//     | 'object'
//     | 'array'
//     | { enum: string[] };
//
// type NameVariations = {
//     frontendName: string;
//     backendName: string;
//     databaseName: string;
//     prettyName: string;
//     componentName: string;
//     [key: string]: string;
// };
//
// type DefaultValue<T extends DataType> =
//     T extends 'string' ? string :
//     T extends 'number' ? number :
//     T extends 'boolean' ? boolean :
//     T extends 'date' | 'time' | 'datetime' ? Date :
//     T extends 'uuid' ? string :
//     T extends 'object' ? Record<string, unknown> :
//     T extends 'array' ? Array<string> :
//     T extends 'json' ? object :
//     T extends { enum: string[] } ? T['enum'][number] :
//     any;
//
// type FieldDefinition<T extends DataType = DataType> = {
//     fieldNameVariations: NameVariations;
//     dataType: T;
//     isNullable: boolean;
//     structure: DataStructure;
//     maxLength?: T extends 'string' ? number : never;
//     isPrimaryKey?: boolean;
//     defaultValue?: DefaultValue<T>;
//     exclusionRules?: string[];
//     defaultGeneratorFunction?: string | null;
//     defaultComponent?: string;
//     validationFunction?: string;
//     isNative?: boolean;
// };
//
//
//
// // New ==========================================
// type EntityType = 'table' | 'view';
//
// type RelationshipType = 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
//
// type Relationship = {
//     type: RelationshipType;
//     column: string;
//     relatedTable: string;
//     relatedColumn: string;
//     junctionTable?: string;
// };
//
//
// type EntityDefinition = {
//     tableNameVariations: NameVariations;
//     type: EntityType;
//     fields: {
//         [fieldName: string]: FieldDefinition<DataType>;
//     };
//     fetchStrategy: FetchStrategy;
//     relationships: Relationship[];
// };
//
// type AutomationSchema = {
//     [entityName: string]: EntityDefinition;
// };
//
// // New ==========================================
//
//
//
//
// // Refined utility types
//
// type TableName<S extends AutomationSchema> = keyof S & string;
//
// type TableNameOrVariation<S extends AutomationSchema> =
//     | TableName<S>
//     | S[TableName<S>]['tableNameVariations'][keyof NameVariations];
//
// type TableFrontendName<S extends AutomationSchema, T extends TableName<S>> =
//     S[T]['tableNameVariations']['frontendName'];
//
// type TableDatabaseName<S extends AutomationSchema, T extends TableName<S>> =
//     S[T]['tableNameVariations']['databaseName'];
//
// type FieldName<S extends AutomationSchema, T extends TableName<S>> =
//     keyof S[T]['fields'] & string;
//
// type FieldNameOrVariation<S extends AutomationSchema, T extends TableName<S>> =
//     | FieldName<S, T>
//     | S[T]['fields'][FieldName<S, T>]['fieldNameVariations'][keyof NameVariations];
//
// type FieldFrontendName<
//     S extends AutomationSchema,
//     T extends TableName<S>,
//     F extends FieldName<S, T>
// > = S[T]['fields'][F]['fieldNameVariations']['frontendName'];
//
// type FieldDatabaseName<
//     S extends AutomationSchema,
//     T extends TableName<S>,
//     F extends FieldName<S, T>
// > = S[T]['fields'][F]['fieldNameVariations']['databaseName'];
//
// type FieldType<
//     S extends AutomationSchema,
//     T extends TableName<S>,
//     F extends FieldName<S, T>
// > = S[T]['fields'][F]['dataType'] extends 'string' ? string
//     : S[T]['fields'][F]['dataType'] extends 'number' ? number
//     : S[T]['fields'][F]['dataType'] extends 'boolean' ? boolean
//     : S[T]['fields'][F]['dataType'] extends 'date' | 'time' | 'datetime' ? Date
//     : S[T]['fields'][F]['dataType'] extends 'uuid' ? string
//     : S[T]['fields'][F]['dataType'] extends 'object' ? Record<string, unknown>
//     : S[T]['fields'][F]['dataType'] extends 'array' ? Array<unknown>
//     : S[T]['fields'][F]['dataType'] extends 'json' ? object
//     : S[T]['fields'][F]['dataType'] extends { enum: string[] } ? S[T]['fields'][F]['dataType']['enum'][number]
//     : unknown;
//
// type TableShape<S extends AutomationSchema, T extends TableName<S>> = {
//     [K in FieldName<S, T>]: FieldType<S, T, K>;
// };
//
//
//
//
//
//
// // Concrete schema example (same as before)
// const schema: AutomationSchema = {
//     users: {
//         tableNameVariations: {
//             frontendName: "User",
//             backendName: "User",
//             databaseName: "users",
//             prettyName: "User",
//             componentName: "UserComponent",
//         },
//         type: "table",
//         fields: {
//             id: {
//                 fieldNameVariations: {
//                     frontendName: "id",
//                     backendName: "id",
//                     databaseName: "id",
//                     prettyName: "ID",
//                     componentName: "IdField",
//                 },
//                 dataType: "uuid",
//                 isNullable: false,
//                 structure: "single",
//                 isPrimaryKey: true,
//             },
//             username: {
//                 fieldNameVariations: {
//                     frontendName: "username",
//                     backendName: "username",
//                     databaseName: "username",
//                     prettyName: "Username",
//                     componentName: "UsernameInput",
//                 },
//                 dataType: "string",
//                 isNullable: false,
//                 structure: "single",
//                 maxLength: 50,
//             },
//             email: {
//                 fieldNameVariations: {
//                     frontendName: "email",
//                     backendName: "email",
//                     databaseName: "email",
//                     prettyName: "Email",
//                     componentName: "EmailInput",
//                 },
//                 dataType: "string",
//                 isNullable: false,
//                 structure: "single",
//             },
//             age: {
//                 fieldNameVariations: {
//                     frontendName: "age",
//                     backendName: "age",
//                     databaseName: "age",
//                     prettyName: "Age",
//                     componentName: "AgeInput",
//                 },
//                 dataType: "number",
//                 isNullable: true,
//                 structure: "single",
//             },
//         },
//         fetchStrategy: "lazy",
//         relationships: [],
//     },
// };
//
//
// type AllTables = TableName<typeof schema>;  // "users"
//
// type UserShape = TableShape<typeof schema, "users">;
// // { id: string; username: string; email: string; age: number | null; }
//
// type UserFields = FieldName<typeof schema, "users">;  // "id" | "username" | "email" | "age"
//
// type EmailType = FieldType<typeof schema, "users", "email">;  // string
//
// function getTableFrontendName<T extends TableName<typeof schema>>(tableName: T): TableFrontendName<typeof schema, T> {
//     return schema[tableName].tableNameVariations.frontendName as TableFrontendName<typeof schema, T>;
// }
//
// function getFieldDatabaseName<
//     T extends TableName<typeof schema>,
//     F extends FieldName<typeof schema, T>
// >(tableName: T, fieldName: F): FieldDatabaseName<typeof schema, T, F> {
//     return schema[tableName].fields[fieldName].fieldNameVariations.databaseName;
// }
//
// const userFrontendName = getTableFrontendName("users");  // Type: string, Value: "User"
// const emailDatabaseName = getFieldDatabaseName("users", "email");  // Type: string, Value: "email"
//
//
// function processUser(user: TableShape<typeof schema, "users">) {
//     console.log(user.username);
//     if (user.age !== null) {
//         console.log(`User is ${user.age} years old`);
//     }
// }
//
