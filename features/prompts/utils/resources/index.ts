/**
 * Resource Utilities - Unified Export
 * 
 * Central export point for all resource-related utilities.
 * Import from here for convenient access to all resource functions.
 */

// Formatting
export {
    formatResourceToXml,
    formatResourcesToXml,
    extractSettingsAttachments,
    extractFileReferences,
    extractResourceReferences,
    extractMessageMetadata,
    processResourcesForMessage,
    appendResourcesToMessage,
    RESOURCE_FORMAT_CONFIG
} from '../resource-formatting';

// Parsing
export {
    parseResourcesFromMessage,
    messageContainsResources,
    extractMessageWithoutResources,
    splitMessageIntoSegments,
    extractResourceIds,
    messageHasResource,
    getResourceCountByType
} from '../resource-parsing';

// Data Fetching
export {
    fetchResourceData,
    fetchResourcesData,
    resourceNeedsDataFetch,
    getResourcesFetchCount
} from '../resource-data-fetcher';

// Re-export types
export type {
    Resource,
    ProcessedResources,
    ParsedResource,
    MessageFileReference,
    MessageResourceReference,
    MessageMetadata,
    NoteResourceData,
    TaskResourceData,
    ProjectResourceData,
    TableResourceData,
    FileResourceData,
    WebpageResourceData,
    YouTubeResourceData,
    ImageUrlResourceData,
    FileUrlResourceData,
    AudioResourceData,
    ResourceFormatConfig
} from '../../types/resources';

