import { EntityKeys, EntityAnyFieldKey } from ".";

export type RelationshipDefinition = {
    joiningTable: EntityKeys;
    relationshipCount: number;
    additionalFields: EntityAnyFieldKey<EntityKeys>[];
    joiningTablePks: EntityAnyFieldKey<EntityKeys>[];
    ReferenceFieldOne: EntityAnyFieldKey<EntityKeys>;
    entityOne: EntityKeys;
    entityOneField: EntityAnyFieldKey<EntityKeys>;
    entityOnePks: EntityAnyFieldKey<EntityKeys>[];
    ReferenceFieldTwo?: EntityAnyFieldKey<EntityKeys>;
    entityTwo?: EntityKeys;
    entityTwoField?: EntityAnyFieldKey<EntityKeys>;
    entityTwoPks?: EntityAnyFieldKey<EntityKeys>[];
    ReferenceFieldThree?: EntityAnyFieldKey<EntityKeys>;
    entityThree?: EntityKeys;
    entityThreeField?: EntityAnyFieldKey<EntityKeys>;
    entityThreePks?: EntityAnyFieldKey<EntityKeys>[];
    ReferenceFieldFour?: EntityAnyFieldKey<EntityKeys>;
    entityFour?: EntityKeys;
    entityFourField?: EntityAnyFieldKey<EntityKeys>;
    entityFourPks?: EntityAnyFieldKey<EntityKeys>[];
};
