/**
 * Types for broker resolution and context-aware value retrieval
 */

/**
 * Context information used to resolve broker values
 * Follows the hierarchy: AI Task > AI Run > Task > Project > Workspace > Org > User > Global
 */
export interface BrokerResolutionContext {
  /** Current user ID (always required) */
  userId?: string;
  
  /** Organization ID */
  organizationId?: string;
  
  /** Workspace ID */
  workspaceId?: string;
  
  /** Project ID */
  projectId?: string;
  
  /** Task ID */
  taskId?: string;
  
  /** AI Run ID (conversation/execution context) */
  aiRunId?: string;
  
  /** AI Task ID (specific API call context) */
  aiTaskId?: string;
}

/**
 * A single resolved broker value with metadata
 */
export interface ResolvedBrokerValue {
  /** The broker ID that was resolved */
  brokerId: string;
  
  /** The resolved value */
  value: any;
  
  /** The scope level where the value was found (e.g., 'project', 'workspace', 'global') */
  scopeLevel: string;
  
  /** The specific scope ID (e.g., project UUID, or null for global) */
  scopeId: string | null;
}

/**
 * Complete result of broker resolution including all values and metadata
 */
export interface BrokerResolutionResult {
  /** Map of broker ID to resolved value */
  values: Record<string, any>;
  
  /** Metadata about the resolution */
  metadata: {
    /** When the resolution occurred */
    resolvedAt: string;
    
    /** The context used for resolution */
    context: BrokerResolutionContext;
    
    /** Map of broker ID to the scope level where it was found */
    scopeLevels: Record<string, string>;
  };
}

/**
 * Options for broker resolution
 */
export interface BrokerResolutionOptions {
  /** If true, throw error on missing brokers. If false, return empty for missing. */
  throwOnMissing?: boolean;
  
  /** If true, include debug information in result */
  includeDebugInfo?: boolean;
  
  /** Maximum age (ms) for cached values. Default: no cache validation */
  maxCacheAge?: number;
}

