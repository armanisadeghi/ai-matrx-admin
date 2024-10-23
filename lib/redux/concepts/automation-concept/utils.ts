import {AutomationTableName, NameFormat} from "@/types/AutomationSchemaTypes";
import {fieldNameLookup, tableNameLookup} from "@/utils/schema/lookupSchema";
import {initialAutomationTableSchema} from "@/utils/schema/initialSchemas";




function isAutomationTableName(name: string): name is AutomationTableName {
    return name in initialAutomationTableSchema;
}

function resolveTableName(requestedName: string): string | undefined {
    if (isAutomationTableName(requestedName)) {
        return requestedName;
    }
    return tableNameLookup[requestedName] || undefined;
}

function resolveFieldName(tableName: string, requestedField: string): string | undefined {
    if (isAutomationTableName(tableName)) {
        const schema = initialAutomationTableSchema[tableName];
        if (schema?.entityFields[requestedField]) {
            return requestedField;
        }
    }
    return fieldNameLookup[tableName as AutomationTableName]?.[requestedField] || undefined;
}

function translateTableName(tableName: string, sourceFormat: NameFormat, destinationFormat: NameFormat): string | undefined {
    const resolvedTableName = resolveTableName(tableName);
    if (!resolvedTableName) return undefined;

    return resolvedTableName;
}

function translateFieldName(tableName: string, fieldName: string, sourceFormat: NameFormat, destinationFormat: NameFormat): string | undefined {
    const resolvedTableName = resolveTableName(tableName);
    if (!resolvedTableName) return undefined;

    const resolvedFieldName = resolveFieldName(resolvedTableName, fieldName);
    if (!resolvedFieldName) return undefined;

    return resolvedFieldName;
}

function handleRequest(request: { tableName: string; fieldName: string; sourceFormat?: NameFormat; destinationFormat?: NameFormat }) {
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


