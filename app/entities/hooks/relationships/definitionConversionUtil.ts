'use client';

import { EntityAnyFieldKey, EntityKeys } from '@/types';
import { RELATIONSHIP_DEFINITIONS } from './relationshipData';



export type SimpleRelDef = {
    parent: {
        name: EntityKeys;
        referenceField: EntityAnyFieldKey<EntityKeys>;
    };
    child: {
        name: EntityKeys;
        referenceField: EntityAnyFieldKey<EntityKeys>;
    };
    join: {
        name: EntityKeys;
        primaryKeys: EntityAnyFieldKey<EntityKeys>[];
        parentField: EntityAnyFieldKey<EntityKeys>;
        childField: EntityAnyFieldKey<EntityKeys>;
        additionalFields: EntityAnyFieldKey<EntityKeys>[];
        nameField?: EntityAnyFieldKey<EntityKeys> | null;
        orderPositionField?: EntityAnyFieldKey<EntityKeys> | null;
        defaultValueField?: EntityAnyFieldKey<EntityKeys> | null;
        roleTypeField?: EntityAnyFieldKey<EntityKeys> | null;
        priorityField?: EntityAnyFieldKey<EntityKeys> | null;
        paramsField?: EntityAnyFieldKey<EntityKeys> | null;
        statusField?: EntityAnyFieldKey<EntityKeys> | null;
        commentsField?: EntityAnyFieldKey<EntityKeys> | null;
    };
};

export interface RelationshipDefinitionInput {
    relationshipKey: keyof typeof RELATIONSHIP_DEFINITIONS;
    parent: EntityKeys;
    child: EntityKeys;
    orderField?: EntityAnyFieldKey<EntityKeys>;
}

export function createRelationshipDefinition({
    relationshipKey,
    parent,
    child,
    orderField,
}: RelationshipDefinitionInput): SimpleRelDef {
    const fullRel = RELATIONSHIP_DEFINITIONS[relationshipKey];

    const entityPairs = [
        {
            entity: fullRel.entityOne,
            entityField: fullRel.entityOneField,
            joiningTableField: fullRel.ReferenceFieldOne,
        },
        {
            entity: fullRel.entityTwo,
            entityField: fullRel.entityTwoField,
            joiningTableField: fullRel.ReferenceFieldTwo,
        },
        {
            entity: fullRel.entityThree,
            entityField: fullRel.entityThreeField,
            joiningTableField: fullRel.ReferenceFieldThree,
        },
        {
            entity: fullRel.entityFour,
            entityField: fullRel.entityFourField,
            joiningTableField: fullRel.ReferenceFieldFour,
        },
    ].filter((pair) => pair.entity);

    const parentInfo = entityPairs.find((e) => e.entity === parent);
    const childInfo = entityPairs.find((e) => e.entity === child);

    if (!parentInfo || !childInfo) {
        throw new Error(`Could not find ${parent} or ${child} in relationship definition`);
    }

    return {
        parent: {
            name: parent,
            referenceField: parentInfo.entityField,
        },
        child: {
            name: child,
            referenceField: childInfo.entityField,
        },
        join: {
            name: fullRel.joiningTable,
            primaryKeys: fullRel.joiningTablePks,
            parentField: parentInfo.joiningTableField,
            childField: childInfo.joiningTableField,
            additionalFields: fullRel.additionalFields,
            orderPositionField: orderField || null,
        },
    };
}


export const recipeMessageDef = createRelationshipDefinition({
    relationshipKey: 'recipeMessage',
    parent: 'recipe',
    child: 'messageTemplate',
    orderField: 'order',
});

export const RELATIONSHIP_INPUTS: Record<string, RelationshipDefinitionInput> = {
    recipeMessage: {
        relationshipKey: 'recipeMessage',
        parent: 'recipe',
        child: 'messageTemplate',
        orderField: 'order',
    },
    messageBroker: {
        relationshipKey: 'messageBroker',
        parent: 'messageTemplate',
        child: 'dataBroker',
    },
    aiAgent: {
        relationshipKey: 'aiAgent',
        parent: 'recipe',
        child: 'aiSettings',
    },
} as const;

export type KnownRelDef = keyof typeof RELATIONSHIP_INPUTS;

export const getStandardRelationship = (key: KnownRelDef) =>
    createRelationshipDefinition(RELATIONSHIP_INPUTS[key]);


