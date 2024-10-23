// File: types/AutomationSchemaTypes.ts

import {AutomationTableStructure} from "@/types/automationTableTypes";
import {initializeSchema, initializeTableSchema} from "@/utils/schema/precomputeUtil";
import {initialAutomationTableSchema} from "@/utils/schema/initialSchemas";

export type TypeBrand<T> = { _typeBrand: T };

export type FieldDataType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'array'
    | 'object'
    | 'json'
    | 'null'
    | 'undefined'
    | 'any'
    | 'function'
    | 'symbol'
    | 'union'
    | 'bigint'
    | 'date'
    | 'map'
    | 'set'
    | 'tuple'
    | 'enum'
    | 'intersection'
    | 'literal'
    | 'void'
    | 'never';

export type DataStructure =
    | 'single'
    | 'array'
    | 'object'
    | 'foreignKey'
    | 'inverseForeignKey'
    | 'manyToMany';

export type FetchStrategy =
    | 'simple'
    | 'fk'
    | 'ifk'
    | 'm2m'
    | 'fkAndIfk'
    | 'm2mAndFk'
    | 'm2mAndIfk'
    | 'fkIfkAndM2M'
    | 'none';

export type RequiredNameFormats =
    'frontend' |
    'backend' |
    'database' |
    'pretty' |
    'kebab' |
    'sqlFunctionRef' |
    'component';

export type OptionalNameFormats =
    'RestAPI' |
    'GraphQL' |
    'custom';

export type NameFormat = RequiredNameFormats | OptionalNameFormats;

export type AutomationDynamicName =
    | 'dynamicAudio'
    | 'dynamicImage'
    | 'dynamicText'
    | 'dynamicVideo'
    | 'dynamicSocket'
    | 'anthropic'
    | 'openai'
    | 'llama'
    | 'googleAi';

export type AutomationCustomName =
    | 'flashcard'
    | 'mathTutor'
    | 'scraper';

export type AutomationTableName =
    'action'
    | 'aiEndpoint'
    | 'aiModel'
    | 'arg'
    | 'automationBoundaryBroker'
    | 'automationMatrix'
    | 'broker'
    | 'dataInputComponent'
    | 'dataOutputComponent'
    | 'displayOption'
    | 'emails'
    | 'extractor'
    | 'flashcardData'
    | 'flashcardHistory'
    | 'flashcardImages'
    | 'flashcardSetRelations'
    | 'flashcardSets'
    | 'processor'
    | 'recipe'
    | 'recipeBroker'
    | 'recipeDisplay'
    | 'recipeFunction'
    | 'recipeModel'
    | 'recipeProcessor'
    | 'recipeTool'
    | 'registeredFunction'
    | 'systemFunction'
    | 'tool'
    | 'transformer'
    | 'userPreferences';

export type AutomationViewName =
    'viewRegisteredFunction'
    | 'viewRegisteredFunctionAllRels';

export type AutomationEntityName = AutomationTableName | AutomationViewName;


// Create a type from the initial schema
export type InitialSchema = typeof initialAutomationTableSchema;

// Create a type for the processed schema
export type ProcessedSchema = ReturnType<typeof initializeTableSchema>;

// We can now create a type for the unified cache
export type UnifiedSchemaCache = {
    schema: ProcessedSchema;
    tableNameMap: Map<string, string>;
    fieldNameMap: Map<string, Map<string, string>>;
};

// Type helpers that work with the actual schema
export type SchemaEntityKeys = keyof ProcessedSchema;

// Get all fields for a specific entity
export type EntityFields<K extends SchemaEntityKeys> =
    keyof ProcessedSchema[K]['entityFields'];

// Get available name formats for an entity
export type EntityNameFormats<K extends SchemaEntityKeys> =
    keyof ProcessedSchema[K]['entityNameMappings'];

// Get field name formats for a specific field
export type FieldNameFormats<
    K extends SchemaEntityKeys,
    F extends EntityFields<K>
> = keyof ProcessedSchema[K]['entityFields'][F]['fieldNameMappings'][string];

// Type-safe accessor types
export type EntityNameVariation<
    K extends SchemaEntityKeys,
    Format extends EntityNameFormats<K>
> = ProcessedSchema[K]['entityNameMappings'][Format];

export type FieldNameVariation<
    K extends SchemaEntityKeys,
    F extends EntityFields<K>,
    Format extends FieldNameFormats<K, F>
> = ProcessedSchema[K]['entityFields'][F]['fieldNameMappings'][string][Format];

// Helper type to get fields with specific characteristics
export type FieldsWithCharacteristic<
    K extends SchemaEntityKeys,
    C extends keyof ProcessedSchema[K]['entityFields'][string]
> = {
    [F in EntityFields<K>]: ProcessedSchema[K]['entityFields'][F][C] extends true ? F : never
}[EntityFields<K>];

// Specific characteristic helpers
export type PrimaryKeyFields<K extends SchemaEntityKeys> =
    FieldsWithCharacteristic<K, 'isPrimaryKey'>;

export type RequiredFields<K extends SchemaEntityKeys> =
    FieldsWithCharacteristic<K, 'isRequired'>;

// Type guard for the global cache
export function isSchemaInitialized(
    cache: UnifiedSchemaCache | null
): cache is UnifiedSchemaCache {
    return cache !== null;
}



// Helper type to extract available name formats for a specific entity
export type AvailableEntityFormats<T extends AutomationTableStructure, K extends keyof T> =
    keyof T[K]['entityNameMappings'];

// Helper type to extract field names from an entity
export type EntityFieldNames<T extends AutomationTableStructure, K extends keyof T> =
    keyof T[K]['entityFields'];

// Helper type to get available formats for a specific field
export type AvailableFieldFormats<
    T extends AutomationTableStructure,
    EntityKey extends keyof T,
    FieldKey extends EntityFieldNames<T, EntityKey>
> = keyof T[EntityKey]['entityFields'][FieldKey]['fieldNameMappings'][string];

// Type-safe accessor for entity name variations
export type EntityNameVariationAccessor<
    T extends AutomationTableStructure,
    EntityKey extends keyof T,
    Format extends AvailableEntityFormats<T, EntityKey>
> = T[EntityKey]['entityNameMappings'][Format];

// Type-safe accessor for field name variations
export type FieldNameVariationAccessor<
    T extends AutomationTableStructure,
    EntityKey extends keyof T,
    FieldKey extends EntityFieldNames<T, EntityKey>,
    Format extends keyof T[EntityKey]['entityFields'][FieldKey]['fieldNameMappings'][string]
> = T[EntityKey]['entityFields'][FieldKey]['fieldNameMappings'][string][Format];

// Known field characteristics from AutomationTable type
type FieldCharacteristic =
  | 'isPrimaryKey'
  | 'isDisplayField'
  | 'isRequired'
  | 'isNative'
  | 'isArray';


// Type guard to validate if a format exists in the required or optional formats
export function isStandardNameFormat(format: string): format is RequiredNameFormats | OptionalNameFormats {
    const standardFormats = new Set<string>([
        // Required formats
        'frontend',
        'backend',
        'database',
        'pretty',
        'kebab',
        'sqlFunctionRef',
        'component',
        // Optional formats
        'RestAPI',
        'GraphQL',
        'custom'
    ]);
    return standardFormats.has(format);
}

// Type guard for custom formats
export function isCustomFormat(format: string): boolean {
    return !isStandardNameFormat(format);
}

// Helper type for extracting relationships
export type TableRelationships<
    T extends AutomationTableStructure,
    EntityKey extends keyof T
> = T[EntityKey]['relationships'];

// Helper type for getting related tables
export type RelatedTables<
    T extends AutomationTableStructure,
    EntityKey extends keyof T
> = T[EntityKey]['relationships'][number]['relatedTable'];



// Get formats available for an entity
type EntityFormats = AvailableEntityFormats<AutomationTableStructure, 'action'>;

// Get field names for an entity
type ActionFields = EntityFieldNames<AutomationTableStructure, 'action'>;



// Type-safe name variation access
function getEntityName<
    EntityKey extends keyof AutomationTableStructure,
    Format extends AvailableEntityFormats<AutomationTableStructure, EntityKey>
>(
    entityKey: EntityKey,
    format: Format
): EntityNameVariationAccessor<AutomationTableStructure, EntityKey, Format> {
    if (!globalSchemaCache) throw new Error('Schema not initialized');
    return globalSchemaCache[entityKey].entityNameMappings[format];
}

// Type-safe field name variation access
function getFieldName<
    EntityKey extends keyof AutomationTableStructure,
    FieldKey extends EntityFieldNames<AutomationTableStructure, EntityKey>,
    Format extends AvailableFieldFormats<AutomationTableStructure, EntityKey, FieldKey>
>(
    entityKey: EntityKey,
    fieldKey: FieldKey,
    format: Format
): FieldNameVariationAccessor<AutomationTableStructure, EntityKey, FieldKey, Format> {
    if (!globalSchemaCache) throw new Error('Schema not initialized');
    return globalSchemaCache[entityKey].entityFields[fieldKey].fieldNameMappings[fieldKey][format];
}





