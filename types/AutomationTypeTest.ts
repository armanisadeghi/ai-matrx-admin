// Type Tests for userPreferences table

// 1. Testing table name variations
import {
    AnyTableName,
    AutomationTableStructure,
    FieldNameResolver,
    TableFields,
    TableNameResolver
} from "@/types/automationTableTypes";
import {AutomationTableName} from "@/types/AutomationSchemaTypes";
import {getGlobalCache} from "@/utils/schema/precomputeUtil";

type UserPreferencesNames = {
    // Get all name variations for the table
    frontend: TableNameResolver<'userPreferences', 'frontend'>;     // e.g., "User Preferences"
    backend: TableNameResolver<'userPreferences', 'backend'>;       // e.g., "userPreferences"
    database: TableNameResolver<'userPreferences', 'database'>;     // e.g., "user_preferences"
    pretty: TableNameResolver<'userPreferences', 'pretty'>;         // e.g., "User Preferences"
    component: TableNameResolver<'userPreferences', 'component'>;   // e.g., "UserPreferences"
};

// 2. Get any valid variation of the table name (including the key name)
type AnyUserPreferencesName = AnyTableName<'userPreferences'>;
// This type will be the union of all possible names:
// 'userPreferences' | 'User Preferences' | 'user_preferences' | etc.

// 3. Get all field keys for userPreferences
type UserPreferencesFieldKeys = keyof TableFields<'userPreferences'>;

// 4. Get primary key field
type PrimaryKeyField<T extends AutomationTableName> = {
    [K in keyof TableFields<T>]: AutomationTableStructure[T]['entityFields'][K & string]['isPrimaryKey'] extends true
        ? K
        : never
}[keyof TableFields<T>];

type UserPreferencesPrimaryKey = PrimaryKeyField<'userPreferences'>;

// 5. Field name variations for a specific field
type FieldNameVariations<
    T extends AutomationTableName,
    F extends keyof TableFields<T>
> = {
    frontend: FieldNameResolver<T, F, 'frontend'>;
    backend: FieldNameResolver<T, F, 'backend'>;
    database: FieldNameResolver<T, F, 'database'>;
    pretty: FieldNameResolver<T, F, 'pretty'>;
    component: FieldNameResolver<T, F, 'component'>;
};

// Example usage:
const example = () => {
    // Type-safe table name usage
    const tableName: AnyUserPreferencesName = 'user_preferences';

    // Type-safe field access
    type Fields = UserPreferencesFieldKeys;

    // Get primary key
    type PrimaryKey = UserPreferencesPrimaryKey;

    // Get field variations for a specific field (replace 'someField' with actual field name)
    type SomeFieldNames = FieldNameVariations<'userPreferences', 'someField'>;
};

// Runtime helper functions
export function getUserPreferencesFieldNames(): UserPreferencesFieldKeys[] {
    const cache = getGlobalCache(['getUserPreferencesFieldNames']);
    if (!cache) return [];
    return Object.keys(cache.schema.userPreferences.entityFields) as UserPreferencesFieldKeys[];
}

export function getPrimaryKeyField(): UserPreferencesPrimaryKey | null {
    const cache = getGlobalCache(['getPrimaryKeyField']);
    if (!cache) return null;

    const fields = cache.schema.userPreferences.entityFields;
    for (const [fieldName, field] of Object.entries(fields)) {
        if (field.isPrimaryKey) {
            return fieldName as UserPreferencesPrimaryKey;
        }
    }
    return null;
}

// Example usage with actual data
function example2() {
    // Get all field names
    const fieldNames = getUserPreferencesFieldNames();
    console.log('Field names:', fieldNames);

    // Get primary key field
    const primaryKey = getPrimaryKeyField();
    console.log('Primary key field:', primaryKey);

    // Get name variations from cache
    const cache = getGlobalCache(['example2']);
    if (cache) {
        const frontendName = cache.schema.userPreferences.entityNameMappings.frontend;
        const databaseName = cache.schema.userPreferences.entityNameMappings.database;
        console.log('Frontend name:', frontendName);
        console.log('Database name:', databaseName);
    }
}