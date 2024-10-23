// import {
//     NameFormat,
//     AutomationTableName,
//     AutomationViewName,
//     AutomationDynamicName,
//     AutomationCustomName,
//     DataStructure,
//     FieldDataType,
//     FetchStrategy,
//     RequiredNameFormats,
//     OptionalNameFormats
// } from "@/types/AutomationSchemaTypes";
// import { automationTableSchema } from "@/utils/schema/initialSchemas";
//
// // Core Entity Types
// export type AutomationEntityName =
//     | AutomationTableName
//     | AutomationViewName
//     | AutomationDynamicName
//     | AutomationCustomName;
//
// // Utility Types
// export type TypeBrand<DataType> = { _typeBrand: DataType };
// export type UnwrapTypeBrand<DataType> = DataType extends TypeBrand<infer Value> ? Value : DataType;
// type Merge<Base, Extension> = Omit<Base, keyof Extension> & Extension;
//
// // Name Variations
// export type NameVariations = {
//     [Format in RequiredNameFormats]: string;
// } & {
//     [Format in OptionalNameFormats]?: string;
// } & {
//     [key: string]: string;
// };
//
// export type TableNameVariations = {
//     [TableName in AutomationTableName]: NameVariations;
// };
//
// export type AnyTableNameVariation<TableName extends AutomationTableName> =
//     TableNameVariations[TableName][NameFormat];
//
// // Base Field Definition
// export type BaseField<EntityName extends AutomationEntityName> = {
//     fieldNameVariations: NameVariations;
//     dataType: FieldDataType;
//     isArray: boolean;
//     structure: DataStructure;
//     isNative: boolean;
//     typeReference: TypeBrand<EntityName>;
//     defaultComponent?: string;
//     componentProps?: Record<string, unknown>;
// };
//
// // Specific Field Types
// export type TableField<TableName extends AutomationTableName> = BaseField<TableName> & {
//     isRequired: boolean;
//     maxLength: number | null;
//     defaultValue: TableName;
//     isPrimaryKey: boolean;
//     defaultGeneratorFunction: string | null;
//     validationFunctions: readonly string[];
//     exclusionRules: readonly string[];
//     databaseTable: AnyTableNameVariation<AutomationTableName>;
// };
//
// export type ViewField<ViewName extends AutomationViewName> = BaseField<ViewName> & {
//     excludeFromFetch?: boolean;
//     hideFromUser?: boolean;
//     databaseTable?: AnyTableNameVariation<AutomationTableName>;
// };
//
// export type DynamicField<DynamicName extends AutomationDynamicName> = BaseField<DynamicName> & {
//     description?: string;
// };
//
// export type CustomField<CustomName extends AutomationCustomName> = BaseField<CustomName> & {
//     description?: string;
// };
//
// // Relationship Type
// export type Relationship = {
//     relationshipType: 'foreignKey' | 'inverseForeignKey' | 'manyToMany';
//     column: string;
//     relatedTable: string;
//     relatedColumn: string;
//     junctionTable: string | null;
// };
//
// // Base Schema Definition
// export type BaseEntitySchema<
//     EntityName extends AutomationEntityName,
//     Fields extends Record<string, BaseField<EntityName>>
// > = {
//     schemaType: EntityName extends AutomationTableName ? 'table'
//         : EntityName extends AutomationViewName ? 'view'
//         : EntityName extends AutomationDynamicName ? 'dynamic'
//         : EntityName extends AutomationCustomName ? 'custom'
//         : never;
//     entityFields: Fields;
//     defaultFetchStrategy: FetchStrategy;
//     entityNameVariations: NameVariations;
//     fieldNameMappings: Record<string, Partial<Record<NameFormat, string>>>;
//     precomputedFormats?: Partial<Record<NameFormat, TableSchema<AutomationTableName>>>;
//     componentProps?: Record<string, unknown>;
// };
//
// // Specific Schema Types
// export type TableSchema<TableName extends AutomationTableName> =
//     BaseEntitySchema<TableName, Record<string, TableField<TableName>>> & {
//     schemaType: 'table';
//     relationships: Array<Relationship>;
// };
//
// export type ViewSchema<ViewName extends AutomationViewName> =
//     BaseEntitySchema<ViewName, Record<string, ViewField<ViewName>>> & {
//     schemaType: 'view';
//     defaultFetchStrategy: 'simple';
// };
//
// export type DynamicSchema<DynamicName extends AutomationDynamicName> =
//     BaseEntitySchema<DynamicName, Record<string, DynamicField<DynamicName>>> & {
//     schemaType: 'dynamic';
//     defaultFetchStrategy: 'none';
// };
//
// export type CustomSchema<CustomName extends AutomationCustomName> =
//     BaseEntitySchema<CustomName, Record<string, CustomField<CustomName>>> & {
//     schemaType: 'custom';
//     defaultFetchStrategy: 'none';
// };
//
// export type AnySchema =
//     | TableSchema<AutomationTableName>
//     | ViewSchema<AutomationViewName>
//     | DynamicSchema<AutomationDynamicName>
//     | CustomSchema<AutomationCustomName>;
//
// // Complete Schema Type
// export type AutomationSchema = {
//     [TableName in AutomationTableName]: TableSchema<TableName>;
// } & {
//     [ViewName in AutomationViewName]: ViewSchema<ViewName>;
// } & {
//     [DynamicName in AutomationDynamicName]: DynamicSchema<DynamicName>;
// } & {
//     [CustomName in AutomationCustomName]: CustomSchema<CustomName>;
// };
