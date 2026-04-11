/**
 * Re-export from canonical location.
 * All JSON extraction now lives in `@/utils/json`.
 *
 * @deprecated Import from `@/utils/json` or `@/features/agents/utils/json-extraction`
 */
export {
  extractJsonFromText,
  extractJsonBlock,
  extractNonJsonContent,
  type JsonExtractionResult,
} from "@/features/agents/utils/json-extraction";
