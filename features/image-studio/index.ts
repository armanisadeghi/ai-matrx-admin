// Data
export {
    ALL_PRESETS,
    PRESET_CATEGORIES,
    RECOMMENDED_BUNDLES,
    getCategoryForPreset,
    getPresetById,
} from "./presets";
export type {
    OutputFormat,
    PresetCategory,
    StudioPreset,
} from "./presets";

// Types
export type {
    ImageFit,
    ImagePosition,
    ProcessStudioRequestBody,
    ProcessStudioResponse,
    ProcessStudioResponseVariant,
    ProcessVariantSpec,
    ProcessedVariant,
    SaveStudioResult,
    StudioFileStatus,
    StudioSourceFile,
} from "./types";

// Hook
export { useImageStudio } from "./hooks/useImageStudio";
export type { UseImageStudioOptions, UseImageStudioResult } from "./hooks/useImageStudio";

// Components
export { ImageStudioShell } from "./components/ImageStudioShell";
export { PresetCatalog, PresetCatalogReadOnly, PresetCategoryLegend } from "./components/PresetCatalog";
export { StudioDropZone } from "./components/StudioDropZone";
export { StudioFileCard } from "./components/StudioFileCard";
export { StudioLandingHero } from "./components/StudioLandingHero";
export {
    StudioVariantTile,
    StudioVariantTilePending,
    StudioVariantTileError,
    VariantTileGrid,
} from "./components/StudioVariantTile";
export { ExportPanel } from "./components/ExportPanel";

// Utils
export {
    downloadSingleVariant,
    downloadVariantsAsZip,
    type BundleEntry,
} from "./utils/download-bundle";
export { formatBytes, formatDimensions } from "./utils/format-bytes";
export { slugifyFilename } from "./utils/slugify-filename";
