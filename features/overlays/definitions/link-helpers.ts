import { OVERLAY_ID_INDEX } from "./overlay-ids";
import { isUuidShape } from "@ai-matrx/kit/uuid";

export function getRestorableResourceId(
  id: string | null | undefined,
  ...singletonIds: string[]
): string | null {
  if (!id || id === "default" || singletonIds.includes(id)) return null;
  if (Object.prototype.hasOwnProperty.call(OVERLAY_ID_INDEX, id)) return null;
  return id;
}

export function getRestorableUuid(
  id: string | null | undefined,
  ...singletonIds: string[]
): string | null {
  const resource = getRestorableResourceId(id, ...singletonIds);
  return resource && isUuidShape(resource) ? resource : null;
}
