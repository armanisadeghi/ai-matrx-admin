/**
 * features/admin/converters/types.ts
 *
 * The converter catalog (aidream `GET /admin/converters`). Derived from the generated contract.
 */
import type { components } from "@ai-matrx/api/types";

export type ConverterCatalog =
  components["schemas"]["ConverterCatalogResponse"];
export type ConverterEntry = components["schemas"]["ConverterEntry"];
export type ConverterLastRun = components["schemas"]["ConverterLastRun"];
