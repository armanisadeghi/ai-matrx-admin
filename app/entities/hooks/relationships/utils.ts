import { EntityKeys, EntityAnyFieldKey, MatrxRecordId, EntityDataWithKey, ProcessedEntityData } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';
import { SimpleRelDef } from './definitionConversionUtil';

export function createRelationshipData(relationshipDefinition: SimpleRelDef, parentRecordId: MatrxRecordId, childId: string = 'uuid') {
    const childEntityId = childId === 'uuid' ? uuidv4() : childId;

    return {
        parentEntity: {
            ...relationshipDefinition.parent,
            recordId: parentRecordId,
        },
        childEntity: {
            ...relationshipDefinition.child,
            value: childEntityId,
        },
        joiningEntity: {
            ...relationshipDefinition.join,
        },
    };
}

type OrderedRecordsOptions = {
    childRecords: EntityDataWithKey<EntityKeys>[];
    joiningRecords: EntityDataWithKey<EntityKeys>[];
    orderField: string;
    childField: string;
};

export function getOrderedRecords({ childRecords, joiningRecords, orderField, childField }: OrderedRecordsOptions): EntityDataWithKey<EntityKeys>[] {
    // Create a map of childField values to their respective orders
    const orderMap = _.reduce(
        joiningRecords,
        (acc, joinRecord) => {
            const childValue = joinRecord[childField];
            const orderValue = joinRecord[orderField];

            if (childValue != null && orderValue != null) {
                acc[childValue] = orderValue;
            }
            return acc;
        },
        {} as Record<string, number>
    );

    // Sort the child records based on their corresponding order values
    return _.sortBy(childRecords, (record) => {
        const recordId = record[childField];
        return recordId != null ? orderMap[recordId] : Infinity;
    });
}

// Define common status values while keeping system extensible
export type CommonRelationshipStatus = 'active' | 'inactive' | 'deleted' | 'isDeleted' | 'pending' | 'complete' | 'canceled' | 'archived';

// Allow for custom status values while preserving type safety
export type RelationshipStatus = CommonRelationshipStatus | string;

type StatusFilterOptions = {
    records: EntityDataWithKey<EntityKeys>[];
    statusField: EntityAnyFieldKey<EntityKeys>;
    status: RelationshipStatus | RelationshipStatus[];
    not?: boolean;
    includeNull?: boolean;
};

export function filterRecordsByStatus({
    records,
    statusField,
    status,
    not = false,
    includeNull = false,
}: StatusFilterOptions): EntityDataWithKey<EntityKeys>[] {
    return _.filter(records, (record) => {
        const recordStatus = record[statusField];

        if (recordStatus == null) {
            return includeNull;
        }

        const matches = Array.isArray(status) ? status.includes(recordStatus) : recordStatus === status;

        return not ? !matches : matches;
    });
}

// Common status-specific convenience functions
type StatusRecordsOptions = {
    records: EntityDataWithKey<EntityKeys>[];
    statusField: EntityAnyFieldKey<EntityKeys>;
};

export function getActiveRecords(options: StatusRecordsOptions): EntityDataWithKey<EntityKeys>[] {
    return filterRecordsByStatus({
        ...options,
        status: 'active',
    });
}

export function getNonDeletedRecords(options: StatusRecordsOptions): EntityDataWithKey<EntityKeys>[] {
    return filterRecordsByStatus({
        ...options,
        status: ['active', 'inactive', 'pending', 'complete'],
    });
}

// For status transitions
type StatusTransitionOptions = {
    records: EntityDataWithKey<EntityKeys>[];
    statusField: EntityAnyFieldKey<EntityKeys>;
    fromStatus: RelationshipStatus | RelationshipStatus[];
    toStatus: RelationshipStatus;
};

export function canTransitionStatus({ records, statusField, fromStatus, toStatus }: StatusTransitionOptions): boolean {
    const validTransitions: Partial<Record<RelationshipStatus, RelationshipStatus[]>> = {
        pending: ['active', 'canceled'],
        active: ['inactive', 'complete', 'archived'],
        inactive: ['active', 'archived'],
        complete: ['archived'],
        // Add more transitions as needed
    };

    const currentStatus = records[0]?.[statusField];
    if (!currentStatus) return false;

    const allowedTransitions = validTransitions[currentStatus];
    return allowedTransitions ? allowedTransitions.includes(toStatus) : false;
}

type StatusGroupOptions = {
    records: EntityDataWithKey<EntityKeys>[];
    statusField: EntityAnyFieldKey<EntityKeys>;
};

export function groupRecordsByStatus({ records, statusField }: StatusGroupOptions): Record<RelationshipStatus, EntityDataWithKey<EntityKeys>[]> {
    return _.groupBy(records, (record) => record[statusField] || 'null');
}

type StatusCountOptions = {
    records: EntityDataWithKey<EntityKeys>[];
    statusField: EntityAnyFieldKey<EntityKeys>;
};

export function getStatusCounts({ records, statusField }: StatusCountOptions): Record<RelationshipStatus, number> {
    const grouped = groupRecordsByStatus({ records, statusField });
    return _.mapValues(grouped, (group) => group.length);
}

interface EntityDataWithValue extends EntityDataWithKey<EntityKeys> {
    value: any;
}

type ApplyDefaultValueOptions = {
    childRecord: EntityDataWithKey<EntityKeys>;
    joiningRecord: EntityDataWithKey<EntityKeys>;
    defaultValueField: EntityAnyFieldKey<EntityKeys>;
};

export function applyDefaultValue({ childRecord, joiningRecord, defaultValueField }: ApplyDefaultValueOptions): EntityDataWithKey<EntityKeys> {
    // If we don't have valid inputs, return the original record unchanged
    if (!childRecord || !joiningRecord || !defaultValueField) {
        return childRecord;
    }

    // Safely get the current value and default value
    const currentValue = childRecord['value'];
    const defaultValue = joiningRecord[defaultValueField];

    // If there's no default value field in the joining record, return unchanged
    if (defaultValue === undefined) {
        return childRecord;
    }

    // Check if current value is null-like
    const isNullLike = currentValue === null || currentValue === undefined || currentValue === '' || (typeof currentValue === 'number' && isNaN(currentValue));

    // If current value is null-like, apply the default
    if (isNullLike) {
        return {
            ...childRecord,
            value: defaultValue,
        } as EntityDataWithValue;
    }

    // If we have a non-null-like value, return unchanged
    return childRecord;
}

// Batch version for handling multiple records
type ApplyDefaultValuesOptions = {
    childRecords: EntityDataWithKey<EntityKeys>[];
    joiningRecords: EntityDataWithKey<EntityKeys>[];
    defaultValueField: EntityAnyFieldKey<EntityKeys>;
    childField: EntityAnyFieldKey<EntityKeys>;
};

export function applyDefaultValues({
    childRecords,
    joiningRecords,
    defaultValueField,
    childField,
}: ApplyDefaultValuesOptions): EntityDataWithKey<EntityKeys>[] {
    // Create a map of joining records by child field for efficient lookup
    const joiningMap = _.keyBy(joiningRecords, childField);

    // Process each child record
    return childRecords.map((childRecord) => {
        const childId = childRecord[childField];
        const joiningRecord = childId ? joiningMap[childId] : undefined;

        if (!joiningRecord) {
            return childRecord;
        }

        return applyDefaultValue({
            childRecord,
            joiningRecord,
            defaultValueField,
        });
    });
}

type MergeJoinFieldsOptions = {
    childRecords: EntityDataWithKey<EntityKeys>[];
    joiningRecords: EntityDataWithKey<EntityKeys>[];
    relationshipDefinition: SimpleRelDef;
};

export function mergeJoinFields({ childRecords, joiningRecords, relationshipDefinition }: MergeJoinFieldsOptions): EntityDataWithKey<EntityKeys>[] {
    // Exit early if we don't have valid inputs
    if (!childRecords?.length || !joiningRecords?.length) {
        return childRecords;
    }

    const {
        join: { parentField, childField, orderPositionField },
    } = relationshipDefinition;

    // Fields to exclude from merging (relationship fields)
    const excludeFields = [parentField, childField];

    // Create an efficient lookup of joining records
    const joiningMap = _.keyBy(joiningRecords, childField);

    // Process records
    let processedRecords = childRecords.map((childRecord) => {
        const childId = childRecord[childField];
        const joiningRecord = childId ? joiningMap[childId] : undefined;

        if (!joiningRecord) {
            return childRecord;
        }

        // Create a filtered joining record without the excluded fields
        const filteredJoiningRecord = _.omit(joiningRecord, excludeFields);

        // Merge the filtered joining record with the child record
        return {
            ...childRecord,
            ...filteredJoiningRecord,
        };
    });

    // Apply ordering if orderPositionField is provided
    if (orderPositionField) {
        processedRecords = _.sortBy(processedRecords, orderPositionField);
    }

    return processedRecords;
}


export type ProcessJoinedDataOptions = {
    childRecords: EntityDataWithKey<EntityKeys>[];
    joiningRecords: EntityDataWithKey<EntityKeys>[];
    relationshipDefinition: SimpleRelDef;
    parentMatrxId?: MatrxRecordId;
    filterStatus?: {
        value: RelationshipStatus | RelationshipStatus[];
        not?: boolean;
    };
};

export function processJoinedData({ 
    childRecords, 
    joiningRecords, 
    relationshipDefinition, 
    filterStatus, 
    parentMatrxId 
}: ProcessJoinedDataOptions): ProcessedEntityData<EntityKeys>[] {
    if (!childRecords?.length || !joiningRecords?.length) {
        return childRecords;
    }
    // console.log('Processing', childRecords?.length, 'record(s) for', relationshipDefinition.child.name, );
    const {
        parent: { referenceField: parentReferenceField },
        child: { referenceField: childReferenceField },
        join: { 
            statusField, 
            orderPositionField, 
            childField, 
            parentField,
            primaryKeys
        },
    } = relationshipDefinition;

    // Step 1: Apply status filtering to joining records first if needed
    let filteredJoiningRecords = joiningRecords;
    if (filterStatus && statusField) {
        filteredJoiningRecords = filterRecordsByStatus({
            records: joiningRecords,
            statusField,
            status: filterStatus.value,
            not: filterStatus.not,
        });
    }

    // Step 2: Create an efficient lookup of joining records
    const joiningMap = _.keyBy(filteredJoiningRecords, childField);

    // Step 3: Merge fields and collect primary keys into joinPksValues
    let processedRecords = childRecords.map((childRecord) => {
        const childId = childRecord[childReferenceField];
        const joiningRecord = childId ? joiningMap[childId] : undefined;

        if (!joiningRecord) {
            return parentMatrxId ? {
                ...childRecord,
                parentMatrxId
            } : childRecord;
        }

        // Collect primary key values
        const joinPksValues = primaryKeys.reduce((acc, pkField) => {
            if (pkField in joiningRecord) {
                acc[pkField] = joiningRecord[pkField];
            }
            return acc;
        }, {});

        // Exclude the child field reference from joining record
        const filteredJoiningRecord = _.omit(joiningRecord, [childField]);

        // Create a new object for joining fields, handling name collisions
        const processedJoiningFields = Object.entries(filteredJoiningRecord).reduce((acc, [key, value]) => {
            // If the field exists in childRecord, append 'Join' to the key
            const newKey = key in childRecord ? `${key}Join` : key;
            acc[newKey] = value;
            return acc;
        }, {});

        // Merge all fields
        const finalRecord = {
            ...childRecord,
            ...processedJoiningFields,
            joinPksValues,
            ...(parentMatrxId ? { parentMatrxId } : {})
        };

        return finalRecord;
    });

    // Step 4: Apply ordering if orderPositionField is provided
    if (orderPositionField) {
        processedRecords = processedRecords.map((record) => {
            const orderValue = record[orderPositionField];
            return {
                ...record,
                [orderPositionField]: orderValue,
            };
        });
        processedRecords = _.sortBy(processedRecords, orderPositionField);
    }

    return processedRecords;
}


// Accepts a list of all joining records and filters them by a specific child ID
export function filterJoinForChild(
    allJoiningRecords: Record<string, any>[],
    childIdValue: string | number,
    relationshipDefinition: SimpleRelDef
): Record<string, any>[] {
    const childField = relationshipDefinition.join.childField;

    return allJoiningRecords.filter((record) => record[childField] === childIdValue);
}
