import { EntityAnyFieldKey, EntityKeys } from "./entityTypes";


export type EntityKeyWithUsers = EntityKeys | "users";

export type RelationshipDefinition = {
    joiningTable: EntityKeyWithUsers;
    relationshipCount: number;
    additionalFields: EntityAnyFieldKey<EntityKeys>[];
    joiningTablePks: EntityAnyFieldKey<EntityKeys>[];
    ReferenceFieldOne: EntityAnyFieldKey<EntityKeys>;
    entityOne: EntityKeyWithUsers;
    entityOneField: EntityAnyFieldKey<EntityKeys>;
    entityOnePks: EntityAnyFieldKey<EntityKeys>[];
    ReferenceFieldTwo?: EntityAnyFieldKey<EntityKeys>;
    entityTwo?: EntityKeyWithUsers;
    entityTwoField?: EntityAnyFieldKey<EntityKeys>;
    entityTwoPks?: EntityAnyFieldKey<EntityKeys>[];
    ReferenceFieldThree?: EntityAnyFieldKey<EntityKeys>;
    entityThree?: EntityKeyWithUsers;
    entityThreeField?: EntityAnyFieldKey<EntityKeys>;
    entityThreePks?: EntityAnyFieldKey<EntityKeys>[];
    ReferenceFieldFour?: EntityAnyFieldKey<EntityKeys>;
    entityFour?: EntityKeyWithUsers;
    entityFourField?: EntityAnyFieldKey<EntityKeys>;
    entityFourPks?: EntityAnyFieldKey<EntityKeys>[];
    ReferenceFieldFive?: EntityAnyFieldKey<EntityKeys>;
    entityFive?: EntityKeyWithUsers;
    entityFiveField?: EntityAnyFieldKey<EntityKeys>;
    entityFivePks?: EntityAnyFieldKey<EntityKeys>[];

    [key: `ReferenceField${number}`]: EntityAnyFieldKey<EntityKeys>;
    [key: `entity${number}`]: EntityKeyWithUsers;
    [key: `entity${number}Field`]: EntityAnyFieldKey<EntityKeys>;
    [key: `entity${number}Pks`]: EntityAnyFieldKey<EntityKeys>[];
  
};
