// Leaf types for primary/display field metadata (breaks entityTypes <-> stateTypes cycles).
// Slightly widened from AllEntityFieldKeys / AllEntityNameVariations: values remain valid strings at runtime.

export type PrimaryKeyType = 'single' | 'composite' | 'none';

export interface PrimaryKeyMetadata {
  type: PrimaryKeyType;
  fields: readonly string[];
  database_fields: string[];
  where_template: Record<string, null>;
}

export interface DisplayFieldMetadata {
  fieldName: string | null;
  databaseFieldName: string | null;
}
