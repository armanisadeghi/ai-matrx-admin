/**
 * Dynamic Context Types
 * 
 * Type definitions for the dynamic context versioning system.
 * Contexts are versioned content that can be iteratively updated during
 * prompt execution, with only the latest version included in the message
 * content and previous versions archived in metadata.
 * 
 * Key features:
 * - Multiple contexts per execution (identified by contextId)
 * - Version history tracking
 * - Token optimization (current in content, history in metadata)
 * - Full serialization for Redux and DB persistence
 */

/**
 * Single version of a context
 */
export interface ContextVersion {
  /** Version number (increments with each update) */
  version: number;
  
  /** Content of this version */
  content: string;
  
  /** ISO timestamp when this version was created */
  timestamp: string;
  
  /** Optional summary of changes from previous version */
  changesSummary?: string;
}

/**
 * Metadata about a context (type, language, etc.)
 */
export interface ContextMetadata {
  /** Type of content in the context */
  type: 'code' | 'text' | 'json' | 'markdown' | 'other';
  
  /** Programming language (for code contexts) */
  language?: string;
  
  /** Filename or identifier */
  filename?: string;
  
  /** Human-readable label for display */
  label?: string;
  
  /** Allow additional metadata fields */
  [key: string]: any;
}

/**
 * Complete state for a single dynamic context
 * 
 * This is stored in Redux and serialized to the database.
 * All fields are plain objects/primitives for Redux compatibility.
 */
export interface DynamicContextState {
  /** Unique identifier for this context within the run */
  contextId: string;
  
  /** Current version number */
  currentVersion: number;
  
  /** Content of the current version */
  currentContent: string;
  
  /** Complete version history (including current) */
  versions: ContextVersion[];
  
  /** Metadata about the context */
  metadata: ContextMetadata;
  
  /** ISO timestamp when context was created */
  createdAt: string;
  
  /** ISO timestamp of last update */
  updatedAt: string;
}

/**
 * Map of contexts for a single execution run
 * Key: contextId
 * Value: DynamicContextState
 */
export interface DynamicContextsMap {
  [contextId: string]: DynamicContextState;
}

/**
 * Archived context metadata (stored in message.metadata for non-current messages)
 * This allows us to track which contexts existed at a given point in conversation
 * without including their full content.
 */
export interface ArchivedContext {
  /** Version number that was current at the time */
  version: number;
  
  /** Optional summary of that version */
  summary?: string;
  
  /** Context metadata (type, language, etc.) */
  metadata?: ContextMetadata;
}

/**
 * Map of archived contexts for a message
 * Key: contextId
 * Value: ArchivedContext
 */
export interface ArchivedContextsMap {
  [contextId: string]: ArchivedContext;
}

/**
 * Parsed context extracted from XML in a message or AI response
 */
export interface ParsedContext {
  /** Context ID from XML attribute */
  contextId: string;
  
  /** Version number from XML attribute (if present) */
  version?: number;
  
  /** Type from XML attribute (if present) */
  type?: string;
  
  /** Language from XML attribute (if present) */
  language?: string;
  
  /** Filename from XML attribute (if present) */
  filename?: string;
  
  /** Label from XML attribute (if present) */
  label?: string;
  
  /** All XML attributes as key-value pairs */
  attributes: Record<string, string>;
  
  /** Content extracted from within the XML tags */
  content: string;
  
  /** Original raw XML string */
  rawXml: string;
  
  /** Start position in the source string */
  startIndex: number;
  
  /** End position in the source string */
  endIndex: number;
}

/**
 * Payload for initializing a new dynamic context
 */
export interface InitializeDynamicContextPayload {
  runId: string;
  contextId: string;
  content: string;
  metadata: ContextMetadata;
}

/**
 * Payload for updating a dynamic context with a new version
 */
export interface UpdateDynamicContextPayload {
  runId: string;
  contextId: string;
  content: string;
  summary?: string;
}

/**
 * Payload for bulk setting contexts (e.g., when loading from DB)
 */
export interface SetDynamicContextsPayload {
  runId: string;
  contexts: DynamicContextsMap;
}

/**
 * Payload for removing a dynamic context
 */
export interface RemoveDynamicContextPayload {
  runId: string;
  contextId: string;
}

/**
 * Payload for clearing all dynamic contexts for a run
 */
export interface ClearDynamicContextsPayload {
  runId: string;
}

/**
 * Initial context data for starting a new execution with contexts
 */
export interface InitialContextData {
  contextId: string;
  content: string;
  metadata: ContextMetadata;
}

