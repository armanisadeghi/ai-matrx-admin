// Re-exports and field-id helpers. Core types live in entityTypes to avoid circular imports.
import type {
  EntityKeys,
  EntityNameOfficial,
  Relationship,
  SchemaEntity,
} from "@/types/entityTypes";

export type { EntityNameOfficial, EntityKeys, SchemaEntity };
// Alias: legacy imports use `relationships` from this module (same as Relationship in entityTypes).
export type relationships = Relationship;

export const createFieldId = (
  entityName: EntityNameOfficial,
  fieldName: string,
) => `${entityName}__${fieldName}`;

export const parseFieldId = (fieldId: string): [EntityNameOfficial, string] => {
  const [entityName, fieldName] = fieldId.split("__") as [
    EntityNameOfficial,
    string,
  ];
  return [entityName, fieldName];
};
