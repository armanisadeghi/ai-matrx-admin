import { EntityAnyFieldKey, EntityKeys } from "@/types";
import { RELATIONSHIP_DEFINITIONS } from "./relationshipDefinitions";

export type simpleRelDef = {
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

export function createRelationshipDefinition(
    relationshipKey: keyof typeof RELATIONSHIP_DEFINITIONS,
    parentEntityKey: EntityKeys,
    childEntityKey: EntityKeys,
    orderPositionField?: EntityAnyFieldKey<EntityKeys>
): simpleRelDef {
    const fullRel = RELATIONSHIP_DEFINITIONS[relationshipKey];
    
    // Create pairs of entity info including both the entity's field and the joining table's reference field
    const entityPairs = [
        { 
            entity: fullRel.entityOne, 
            entityField: fullRel.entityOneField,
            joiningTableField: fullRel.ReferenceFieldOne 
        },
        { 
            entity: fullRel.entityTwo, 
            entityField: fullRel.entityTwoField,
            joiningTableField: fullRel.ReferenceFieldTwo
        },
        { 
            entity: fullRel.entityThree, 
            entityField: fullRel.entityThreeField,
            joiningTableField: fullRel.ReferenceFieldThree 
        },
        { 
            entity: fullRel.entityFour, 
            entityField: fullRel.entityFourField,
            joiningTableField: fullRel.ReferenceFieldFour
        }
    ].filter(pair => pair.entity); // Filter out any undefined entities

    const parentInfo = entityPairs.find(e => e.entity === parentEntityKey);
    const childInfo = entityPairs.find(e => e.entity === childEntityKey);

    if (!parentInfo || !childInfo) {
        throw new Error(`Could not find ${parentEntityKey} or ${childEntityKey} in relationship definition`);
    }

    return {
        parent: {
            name: parentEntityKey,
            referenceField: parentInfo.entityField
        },
        child: {
            name: childEntityKey,
            referenceField: childInfo.entityField
        },
        join: {
            name: fullRel.joiningTable,
            primaryKeys: fullRel.joiningTablePks,
            parentField: parentInfo.joiningTableField,
            childField: childInfo.joiningTableField,
            additionalFields: fullRel.additionalFields,
            orderPositionField: orderPositionField || null
        }
    };
}

// Example usage:
export const recipeMessageDef = createRelationshipDefinition(
    'recipeMessage',
    'recipe', 
    'messageTemplate',
    'order'
);