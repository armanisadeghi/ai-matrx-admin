'use client';

import { entityFieldNameGroups } from '@/utils/schema/entityFieldNameGroups';
import { getStandardRelationship, KnownRelDef, SimpleRelDef } from './definitionConversionUtil';

interface PreparePayloadParams {
    knownRelDef: KnownRelDef;
    parentId: unknown;
    childData: Record<string, unknown>;
    joiningData: Record<string, unknown>;
}

function filterDataByFields(data: Record<string, unknown>, fields: string[]): Record<string, unknown> {
    return Object.fromEntries(Object.entries(data).filter(([key]) => fields.includes(key)));
}

export function prepareRelatedPayloadWithParentid({ knownRelDef, parentId, childData, joiningData }: PreparePayloadParams) {
    const relationshipDef = getStandardRelationship(knownRelDef) as SimpleRelDef;
    const childEntity = relationshipDef.child.name;
    const joiningEntity = relationshipDef.join.name;

    const childFields = entityFieldNameGroups[childEntity].nativeFields;
    const joiningFieldsNoPk = entityFieldNameGroups[joiningEntity].nativeFieldsNoPk;

    const matchedChildData = filterDataByFields(childData, childFields);
    const matchedJoiningData = filterDataByFields(joiningData, joiningFieldsNoPk);

    return {
        parentId,
        child: matchedChildData,
        joining: matchedJoiningData,
    };
}

export function prepareRelatedPayloadNoParentId({ knownRelDef, childData, joiningData }: PreparePayloadParams) {
    const relationshipDef = getStandardRelationship(knownRelDef) as SimpleRelDef;
    const childEntity = relationshipDef.child.name;
    const joiningEntity = relationshipDef.join.name;

    const childFields = entityFieldNameGroups[childEntity].nativeFields;
    const joiningFieldsNoPk = entityFieldNameGroups[joiningEntity].nativeFieldsNoPk;

    const matchedChildData = filterDataByFields(childData, childFields);
    const matchedJoiningData = filterDataByFields(joiningData, joiningFieldsNoPk);

    return {
        child: matchedChildData,
        joining: matchedJoiningData,
    };
}
