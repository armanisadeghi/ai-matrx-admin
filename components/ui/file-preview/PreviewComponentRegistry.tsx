// PreviewComponentRegistry.tsx
import React, { lazy, Suspense } from "react";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";
import { adaptFileToNodeStructure } from "./FilePreviewAdapter";
import { FileImage } from "lucide-react";

// Fallback/loading component
const PreviewLoading = () => (
    <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
    </div>
);

// Legacy components (dynamically imported)
const AudioPreviewLazy = lazy(() =>
    import("@/components/FileManager/FilePreview/AudioPreview").then((module) => ({ default: module.AudioPreview }))
);
const SpreadsheetPreviewLazy = lazy(() =>
    import("@/components/FileManager/FilePreview/SpreadsheetPreview").then((module) => ({ default: module.SpreadsheetPreview }))
);
// ... import other legacy components as needed

// Our custom components (dynamically imported)
const ImagePreviewLazy = lazy(() => import("./previews/ImagePreview"));
const VideoPreviewLazy = lazy(() => import("./previews/VideoPreview"));
const PDFPreviewLazy = lazy(() => import("./previews/PDFPreview"));
const TextPreviewLazy = lazy(() => import("./previews/TextPreview"));
const CodePreviewLazy = lazy(() => import("./previews/CodePreview"));
const DataPreviewLazy = lazy(() => import("./previews/DataPreview"));
const GenericPreviewLazy = lazy(() => import("./previews/GenericPreview"));

// Registry of components mapped to preview types
const PREVIEW_COMPONENTS = {
    // Legacy components
    AudioPreview: AudioPreviewLazy,
    SpreadsheetPreview: SpreadsheetPreviewLazy,
    ImagePreview: ImagePreviewLazy,
    VideoPreview: VideoPreviewLazy,
    PDFPreview: PDFPreviewLazy,
    TextPreview: TextPreviewLazy,
    CodePreview: CodePreviewLazy,
    DataPreview: DataPreviewLazy,
    CSVPreview: DataPreviewLazy,
    JSONPreview: DataPreviewLazy,
    GenericPreview: GenericPreviewLazy,
};

// Type of the registry
type PreviewComponentType = keyof typeof PREVIEW_COMPONENTS;

// Props for the PreviewComponent
interface PreviewComponentProps {
    previewType: string;
    file: {
        url: string;
        type: string;
        details?: EnhancedFileDetails;
        blob?: Blob | null;
    };
    isLoading: boolean;
}

/**
 * Dynamic preview component that renders the appropriate preview based on file type
 */
export const PreviewComponent: React.FC<PreviewComponentProps> = ({ previewType, file, isLoading }) => {
    // Get component from registry or fallback to generic
    const Component = PREVIEW_COMPONENTS[previewType as PreviewComponentType] || PREVIEW_COMPONENTS.GenericPreview;

    // Determine if we need to use the legacy format
    const usesLegacyFormat = ["AudioPreview", "SpreadsheetPreview"].includes(previewType);

    // Prepare props based on component type
    const componentProps = usesLegacyFormat
        ? { file: { ...adaptFileToNodeStructure(file), url: file.url }, isLoading: false }
        : {
              file: {
                  ...file,
                  path: file.url,
                  bucketName: "",
                  name: file.details?.filename || "",
                  contentType: "FILE" as const,
                  extension: file.details?.extension || "",
                  isEmpty: false,
                  details: {
                      ...file.details,
                      icon: file.details?.icon || FileImage,
                  },
              },
              isLoading,
          };

    return (
        <Suspense fallback={<PreviewLoading />}>
            <Component {...componentProps} />
        </Suspense>
    );
};

/**
 * Get a list of all supported preview types
 */
export const getSupportedPreviewTypes = (): string[] => {
    return Object.keys(PREVIEW_COMPONENTS);
};

/**
 * Check if a specific preview type is supported
 */
export const isPreviewTypeSupported = (previewType: string): boolean => {
    return previewType in PREVIEW_COMPONENTS;
};
