// // Expansion Utilities
// import {
//     AnySchema,
//     AutomationEntityName,
//     BaseField, CustomSchema, DynamicSchema,
//     NameVariations,
//     TableSchema,
//     UnwrapTypeBrand,
//     ViewSchema
// } from "@/types/AutomationTypes";
// import {
//     AutomationCustomName,
//     AutomationDynamicName,
//     AutomationTableName,
//     AutomationViewName,
//     FetchStrategy,
//     NameFormat, OptionalNameFormats, RequiredNameFormats
// } from "@/types/AutomationSchemaTypes";
//
// type ExpandFetchStrategy<Strategy> = Strategy extends FetchStrategy ? Strategy : never;
//
// type ExpandNameVariations<Names> = Names extends NameVariations ? Names : never;
//
// type ExpandFieldNameMappings<Mappings> =
//     Mappings extends Record<string, Partial<Record<NameFormat, string>>> ? Mappings : never;
//
// type ExpandFields<Fields extends Record<string, BaseField<AutomationEntityName>>> = {
//     [FieldName in keyof Fields]: UnwrapTypeBrand<Fields[FieldName]['typeReference']>
// };
//
// type ExpandField<F> = F extends BaseField<AutomationEntityName> ? {
//     [K in keyof F]: K extends 'typeReference' ? UnwrapTypeBrand<F[K]> : F[K]
// } : never;
//
// type ExpandEntityFields<Fields extends Record<string, BaseField<AutomationEntityName>>> = {
//     [FieldName in keyof Fields]: ExpandField<Fields[FieldName]>
// };
//
// // Schema Expansion
// type ExpandSchema<Schema extends AnySchema> = {
//     [Key in keyof Schema]: Key extends 'entityFields'
//         ? ExpandEntityFields<Schema[Key]>
//         : Key extends 'relationships'
//             ? Schema[Key] extends Array<infer R>
//                 ? Array<{[P in keyof R]: R[P]}>
//                 : Schema[Key]
//             : Key extends 'defaultFetchStrategy'
//                 ? ExpandFetchStrategy<Schema[Key]>
//                 : Key extends 'entityNameVariations'
//                     ? ExpandNameVariations<Schema[Key]>
//                     : Key extends 'fieldNameMappings'
//                         ? ExpandFieldNameMappings<Schema[Key]>
//                         : Schema[Key]
// };
//
// // Expanded Schema Types
// export type ExpandedTableSchema<TableName extends AutomationTableName> =
//     ExpandSchema<TableSchema<TableName>>;
//
// export type ExpandedViewSchema<ViewName extends AutomationViewName> =
//     ExpandSchema<ViewSchema<ViewName>>;
//
// export type ExpandedDynamicSchema<DynamicName extends AutomationDynamicName> =
//     ExpandSchema<DynamicSchema<DynamicName>>;
//
// export type ExpandedCustomSchema<CustomName extends AutomationCustomName> =
//     ExpandSchema<CustomSchema<CustomName>>;
//
// // Full Expanded Schema
// export type FullAutomationSchema = {
//     [TableName in AutomationTableName]: ExpandedTableSchema<TableName>;
// } & {
//     [ViewName in AutomationViewName]: ExpandedViewSchema<ViewName>;
// } & {
//     [DynamicName in AutomationDynamicName]: ExpandedDynamicSchema<DynamicName>;
// } & {
//     [CustomName in AutomationCustomName]: ExpandedCustomSchema<CustomName>;
// };
//
// // Helper Types
// export type AutomationType<EntityName extends keyof FullAutomationSchema> =
//     FullAutomationSchema[EntityName];
//
// export type TableNameVariation<TableName extends AutomationTableName> =
//     FullAutomationSchema[TableName]['entityNameVariations'][NameFormat];
//
// export type FieldNameVariation<
//     EntityName extends keyof FullAutomationSchema,
//     FieldName extends keyof FullAutomationSchema[EntityName]['entityFields']
// > = FullAutomationSchema[EntityName]['entityFields'][FieldName]['fieldNameVariations'][RequiredNameFormats] |
//     (FullAutomationSchema[EntityName]['entityFields'][FieldName]['fieldNameVariations'][OptionalNameFormats] extends string
//         ? FullAutomationSchema[EntityName]['entityFields'][FieldName]['fieldNameVariations'][OptionalNameFormats]
//         : never);
//
// // Structure Types
// export type TableSchemaStructure = {
//     [TableName in AutomationTableName]: AutomationType<TableName>;
// };
//
// export type ViewSchemaStructure = {
//     [ViewName in AutomationViewName]: AutomationType<ViewName>;
// };
//
// export type DynamicSchemaStructure = {
//     [DynamicName in AutomationDynamicName]: AutomationType<DynamicName>;
// };
//
// export type CustomSchemaStructure = {
//     [CustomName in AutomationCustomName]: AutomationType<CustomName>;
// };
//
// export type FullSchemaStructure =
//     TableSchemaStructure &
//     ViewSchemaStructure &
//     DynamicSchemaStructure &
//     CustomSchemaStructure;
