import {AutomationTableName, DataFormat, TypeBrand} from "@/types/AutomationTypes";
import {tableSchemas} from "@/utils/schema/initialSchemas";

export const tableNameLookup: Record<string, string> = {
    action: 'action',
    backend_action: 'action',
    tbl_action: 'action',
    'action-component': 'action',
    Action: 'action',
    // Other tables and their variations...
};


export const fieldNameLookup: Record<string, Record<string, string>> = {
    action: {
        id: 'id',
        backend_id: 'id',
        db_id: 'id',
        'id-component': 'id',
        Id: 'id',
        // Other field variations...
    },
    // Other tables...
};

function isAutomationTableName(name: string): name is AutomationTableName {
    return name in tableSchemas;
}

function resolveTableName(requestedName: string): string | undefined {
    if (isAutomationTableName(requestedName)) {
        return requestedName;
    }
    return tableNameLookup[requestedName] || undefined;
}

function resolveFieldName(tableName: string, requestedField: string): string | undefined {
    if (isAutomationTableName(tableName)) {
        const schema = tableSchemas[tableName];
        if (schema?.entityFields[requestedField]) {
            return requestedField;
        }
    }
    return fieldNameLookup[tableName as AutomationTableName]?.[requestedField] || undefined;
}

function translateTableName(tableName: string, sourceFormat: DataFormat, destinationFormat: DataFormat): string | undefined {
    const resolvedTableName = resolveTableName(tableName);
    if (!resolvedTableName) return undefined;

    return resolvedTableName;
}

function translateFieldName(tableName: string, fieldName: string, sourceFormat: DataFormat, destinationFormat: DataFormat): string | undefined {
    const resolvedTableName = resolveTableName(tableName);
    if (!resolvedTableName) return undefined;

    const resolvedFieldName = resolveFieldName(resolvedTableName, fieldName);
    if (!resolvedFieldName) return undefined;

    return resolvedFieldName; // All translations handled via lookups
}

function handleRequest(request: { tableName: string; fieldName: string; sourceFormat?: DataFormat; destinationFormat?: DataFormat }) {
    const sourceFormat = request.sourceFormat || 'frontend';
    const destinationFormat = request.destinationFormat || 'frontend';

    const resolvedTableName = resolveTableName(request.tableName);
    if (!resolvedTableName) {
        console.error(`Table '${request.tableName}' could not be found.`);
        return;
    }

    const resolvedFieldName = resolveFieldName(resolvedTableName, request.fieldName);
    if (!resolvedFieldName) {
        console.error(`Field '${request.fieldName}' could not be found in table '${resolvedTableName}'.`);
        return;
    }

    const translatedFieldName = translateFieldName(resolvedTableName, resolvedFieldName, sourceFormat, destinationFormat);
    console.log(`Request resolved: Table '${resolvedTableName}', Field '${translatedFieldName}'`);
}
