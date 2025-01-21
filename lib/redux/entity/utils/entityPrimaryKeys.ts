import { EntityKeys, MatrxRecordId } from '@/types';

export const primaryKeys = {
    action: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    aiAgent: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    aiEndpoint: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    aiModel: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    aiModelEndpoint: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    aiProvider: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    aiSettings: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    arg: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    automationBoundaryBroker: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    automationMatrix: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    broker: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    bucketStructures: {
        frontendFields: ['bucket_id'],
        databaseColumns: ['bucketId'],
    },
    bucketTreeStructures: {
        frontendFields: ['bucket_id'],
        databaseColumns: ['bucketId'],
    },
    dataBroker: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    dataInputComponent: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    dataOutputComponent: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    displayOption: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    emails: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    extractor: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    fileStructure: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    flashcardData: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    flashcardHistory: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    flashcardImages: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    flashcardSetRelations: {
        frontendFields: ['flashcard_id', 'set_id'],
        databaseColumns: ['flashcardId', 'setId'],
    },
    flashcardSets: {
        frontendFields: ['set_id'],
        databaseColumns: ['setId'],
    },
    messageBroker: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    messageTemplate: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    processor: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    recipe: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    recipeBroker: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    recipeDisplay: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    recipeFunction: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    recipeMessage: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    recipeModel: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    recipeProcessor: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    recipeTool: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    registeredFunction: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    systemFunction: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    tool: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    transformer: {
        frontendFields: ['id'],
        databaseColumns: ['id'],
    },
    userPreferences: {
        frontendFields: ['user_id'],
        databaseColumns: ['userId'],
    },
};

export const toMatrxId = (entityName: EntityKeys, record: Record<string, unknown>): MatrxRecordId => {
    if (!record || !entityName) return null;
    const fields = primaryKeys[entityName].databaseColumns
        .map((field, index) => {
            const frontendField = primaryKeys[entityName].frontendFields[index];
            const value = record[frontendField];
            
            if (value === undefined || value === null) {
                return null;
            }
            return `${field}:${value}`;
        })
        .join('::');

    return fields || null;
};

export const toMatrxIdBatch = (entityName: EntityKeys, records: Record<string, unknown>[]): MatrxRecordId[] => {
    if (!records?.length || !entityName) return null;
    const results = records.map((record) => toMatrxId(entityName, record));
    return results.every(Boolean) ? results : null;
};


export const toMatrxIdFromValue = (entityName: EntityKeys, value: unknown): MatrxRecordId => {
    if (!value || !entityName) return null;
    
    const pkColumns = primaryKeys[entityName].databaseColumns;
    
    if (pkColumns.length > 1) {
        throw new Error(`Cannot use toMatrxIdFromValue for entity "${entityName}" - it has multiple primary keys. Use toMatrxId instead.`);
    }
    
    return `${pkColumns[0]}:${value}`;
};


export const toMatrxIdFromValueBatch = (entityName: EntityKeys, values: unknown[]): MatrxRecordId[] => {
    if (!values?.length || !entityName) return null;
    const results = values.map((value) => toMatrxIdFromValue(entityName, value));
    return results.every(Boolean) ? results : null;
};



export const toPkId = (matrxId: MatrxRecordId): Record<string, string> => {
    if (!matrxId) return null;
    if (matrxId.toString().startsWith('new-record-')) return null;
    
    try {
        const result = matrxId.split('::').reduce((acc, pair) => {
            const [field, value] = pair.split(':');
            if (!field || !value) return null;
            acc[field] = value;
            return acc;
        }, {} as Record<string, string>);

        return Object.keys(result).length ? result : null;
    } catch {
        return null;
    }
};

export const toPkIdBatch = (matrxIds: MatrxRecordId[]): Record<string, string>[] => {
    if (!matrxIds?.length) return null;
    const results = matrxIds.map((matrxId) => toPkId(matrxId));
    return results.every(Boolean) ? results : null;
};

export const toPkValues = (matrxId: MatrxRecordId): string[] => {
    const result = toPkId(matrxId);
    return result ? Object.values(result) : null;
};

export const toPkValuesBatch = (matrxIds: MatrxRecordId[]): string[][] => {
    if (!matrxIds?.length) return null;
    const results = matrxIds.map((matrxId) => toPkValues(matrxId));
    return results.every(Boolean) ? results : null;
};

export const toPkValue = (matrxId: MatrxRecordId): string => {
    const values = toPkValues(matrxId);
    return values?.[0] || null;
};



export function parseId(entityName: EntityKeys, id: string | number): { matrxRecordId: string; simpleId: string } {
    if (!id || !entityName) {
        throw new Error('Invalid arguments: entityName and id are required.');
    }

    const isMatrxRecordId = typeof id === 'string' && id.includes(':');

    if (isMatrxRecordId) {
        const simpleId = toPkValue(id);
        if (!simpleId) {
            throw new Error(`Unable to extract simpleId from matrxRecordId: ${id}`);
        }
        return { matrxRecordId: id, simpleId };
    } else {
        // Use toMatrxIdFromValue to generate matrxRecordId from simpleId
        const matrxRecordId = toMatrxIdFromValue(entityName, id);
        if (!matrxRecordId) {
            throw new Error(`Unable to generate matrxRecordId for entity "${entityName}" with value: ${id}`);
        }
        return { matrxRecordId, simpleId: id.toString() };
    }
}



type IdInput = string | number | Record<string, string>;

export function parseIdAdvanced(
    entityName: EntityKeys,
    id: IdInput
): { matrxRecordId: string; simpleId: string | null; primaryKeyRecord: Record<string, string> } {
    if (!id || !entityName) {
        throw new Error('Invalid arguments: entityName and id are required.');
    }

    // Check if input is a primary key record
    if (typeof id === 'object' && !Array.isArray(id)) {
        // Generate matrxRecordId from primary key record
        const matrxRecordId = Object.entries(id)
            .map(([key, value]) => `${key}:${value}`)
            .join('::');
        return {
            matrxRecordId,
            simpleId: null,
            primaryKeyRecord: id,
        };
    }

    // Check if input is matrxRecordId
    if (typeof id === 'string' && id.includes('::')) {
        const primaryKeyRecord = toPkId(id);
        if (!primaryKeyRecord) {
            throw new Error(`Invalid matrxRecordId: ${id}`);
        }
        const simpleId = Object.values(primaryKeyRecord).length === 1 ? Object.values(primaryKeyRecord)[0] : null;
        return {
            matrxRecordId: id,
            simpleId,
            primaryKeyRecord,
        };
    }

    // Otherwise, assume input is simpleId
    if (typeof id === 'string' || typeof id === 'number') {
        const pkColumns = primaryKeys[entityName].databaseColumns;
        if (pkColumns.length > 1) {
            throw new Error(`Entity "${entityName}" has multiple primary keys. Provide a primary key record instead.`);
        }
        const matrxRecordId = `${pkColumns[0]}:${id}`;
        return {
            matrxRecordId,
            simpleId: id.toString(),
            primaryKeyRecord: { [pkColumns[0]]: id.toString() },
        };
    }

    throw new Error('Unsupported id format.');
}
