import type { EntityKeys } from "@/types/entityTypes";
import type { FieldOverrideName, AllEntityFieldOverrides } from "./overrideTypes";

export function isEmptyOverride(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && Object.keys(value as object).length === 0)
    return true;
  return false;
}

export function getFieldOverride(
  entityName: EntityKeys,
  fieldName: string,
  overrideName: FieldOverrideName,
  fieldOverrides: AllEntityFieldOverrides,
): unknown | null {
  const entityOverrides = fieldOverrides[entityName];
  if (!entityOverrides) return null;

  const fieldOverride = entityOverrides[fieldName];
  if (!fieldOverride) return null;

  const override = fieldOverride[overrideName];
  if (isEmptyOverride(override)) return null;

  return override;
}
