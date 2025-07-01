// =================== SOURCE TYPES ===================

/**
 * Types of data sources
 */
export enum SourceType {
    DATABASE = "database",
    API = "api",
    FILE = "file",
    COMPUTED = "computed",
    STATE = "state",
    FUNCTION = "function"
  }
  
  export enum ScopeType {
    SYSTEM = "system",
    ORGANIZATION = "organization",
    USER = "user",
    CLIENT = "client",
    PROJECT = "project",
    SESSION = "session",
    TASK = "task",
    WORKFLOW = "workflow",
    ACTION = "action",
    TEMPORARY = "temporary"
  }
  
  /**
   * Configuration for state/cache sources
   */
  export interface StateSourceConfig {
    scope: string;
    iterations?: boolean;
  }
  
  // =================== BASE SOURCE CONFIG ===================
  
  /**
   * Base configuration for all broker sources
   */
  export interface BrokerSourceBase {
    broker_id: string;
    source_type: SourceType;
    cache_policy?: ScopeType;
    required?: boolean;
    default_value?: any;
    validation_rules?: Record<string, any> | null;
  }
  
  // =================== SPECIFIC SOURCE CONFIGURATIONS ===================
  
  /**
   * Configuration for database sources
   */
  export interface DatabaseSourceConfig {
    table: string;
    query: Record<string, any>;
    field?: string | null;
    joins?: any[] | null;
    connection_pool?: string | null;
    timeout_seconds?: number;
  }
  
  /**
   * Configuration for API sources
   */
  export interface APISourceConfig {
    endpoint: string;
    method?: string;
    params?: Record<string, any> | null;
    headers?: Record<string, any> | null;
    auth_config?: Record<string, any> | null;
    timeout_seconds?: number;
    retry_attempts?: number;
    cache_duration_seconds?: number;
  }
  
  /**
   * Configuration for file sources
   */
  export interface FileSourceConfig {
    file_path: string;
    file_type: string; // "csv", "json", "xml", "txt", etc.
    encoding?: string;
    parse_options?: Record<string, any> | null;
    watch_for_changes?: boolean;
  }
  
  /**
   * Configuration for computed/derived sources
   */
  export interface ComputedSourceConfig {
    computation_function: string;
    input_sources?: string[] | null; // List of broker_ids this computation depends on
    computation_args?: Record<string, any> | null;
    cache_result?: boolean;
    recompute_on_dependency_change?: boolean;
  }
  
  /**
   * Configuration for function-based sources
   */
  export interface FunctionSourceConfig {
    function_id: string;
    function_name: string;
    args?: Record<string, any> | null;
    execution_context?: Record<string, any> | null;
    async_execution?: boolean;
  }
  
  // =================== COMPLETE SOURCE CONFIGURATION ===================
  
  /**
   * Complete source configuration with all possible source types
   */
  export interface BrokerSourceConfig extends BrokerSourceBase {
    database_config?: DatabaseSourceConfig | null;
    api_config?: APISourceConfig | null;
    file_config?: FileSourceConfig | null;
    state_config?: StateSourceConfig | null;
    computed_config?: ComputedSourceConfig | null;
    function_config?: FunctionSourceConfig | null;
  }
  
  // =================== UTILITY TYPES AND HELPERS ===================
  
  /**
   * Helper type to ensure proper config based on source type
   */
  export type TypedBrokerSourceConfig<T extends SourceType> = 
    T extends SourceType.DATABASE ? BrokerSourceConfig & { database_config: DatabaseSourceConfig } :
    T extends SourceType.API ? BrokerSourceConfig & { api_config: APISourceConfig } :
    T extends SourceType.FILE ? BrokerSourceConfig & { file_config: FileSourceConfig } :
    T extends SourceType.STATE ? BrokerSourceConfig & { state_config: StateSourceConfig } :
    T extends SourceType.COMPUTED ? BrokerSourceConfig & { computed_config: ComputedSourceConfig } :
    T extends SourceType.FUNCTION ? BrokerSourceConfig & { function_config: FunctionSourceConfig } :
    never;
  
  /**
   * Type guard to check if a config has the required configuration for its source type
   */
  export function isValidBrokerSourceConfig(config: BrokerSourceConfig): boolean {
    switch (config.source_type) {
      case SourceType.DATABASE:
        return config.database_config != null;
      case SourceType.API:
        return config.api_config != null;
      case SourceType.FILE:
        return config.file_config != null;
      case SourceType.STATE:
        return config.state_config != null;
      case SourceType.COMPUTED:
        return config.computed_config != null;
      case SourceType.FUNCTION:
        return config.function_config != null;
      default:
        return false;
    }
  }
  
  // =================== SERIALIZATION HELPERS ===================
  
  /**
   * Convert StateSourceConfig to dictionary equivalent
   */
  export function stateSourceConfigToDict(config: StateSourceConfig): Record<string, any> {
    return {
      scope: config.scope,
      iterations: config.iterations ?? false,
    };
  }
  
  /**
   * Create StateSourceConfig from dictionary
   */
  export function stateSourceConfigFromDict(data: Record<string, any>): StateSourceConfig {
    return {
      scope: data.scope,
      iterations: data.iterations ?? false,
    };
  }
  
  /**
   * Convert BrokerSourceBase to dictionary equivalent
   */
  export function brokerSourceBaseToDict(config: BrokerSourceBase): Record<string, any> {
    return {
      broker_id: config.broker_id,
      source_type: config.source_type,
      cache_policy: config.cache_policy ?? ScopeType.SESSION,
      required: config.required ?? true,
      default_value: config.default_value,
      validation_rules: config.validation_rules,
    };
  }
  
  /**
   * Create BrokerSourceBase from dictionary
   */
  export function brokerSourceBaseFromDict(data: Record<string, any>): BrokerSourceBase {
    return {
      broker_id: data.broker_id,
      source_type: typeof data.source_type === 'string' ? data.source_type as SourceType : data.source_type,
      cache_policy: typeof data.cache_policy === 'string' ? data.cache_policy as ScopeType : (data.cache_policy ?? ScopeType.SESSION),
      required: data.required ?? true,
      default_value: data.default_value,
      validation_rules: data.validation_rules,
    };
  }