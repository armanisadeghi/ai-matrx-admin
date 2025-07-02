import {
    ScopeType,
    SourceType,
    BrokerSourceConfig,
    TypedBrokerSourceConfig,
    DatabaseSourceConfig,
    APISourceConfig,
    FileSourceConfig,
    StateSourceConfig,
    ComputedSourceConfig,
    FunctionSourceConfig,
} from "./types";

// Option 1: Function overloads for precise return types
export function createEmptyConfig(sourceType: SourceType.DATABASE): TypedBrokerSourceConfig<SourceType.DATABASE>;
export function createEmptyConfig(sourceType: SourceType.API): TypedBrokerSourceConfig<SourceType.API>;
export function createEmptyConfig(sourceType: SourceType.FILE): TypedBrokerSourceConfig<SourceType.FILE>;
export function createEmptyConfig(sourceType: SourceType.STATE): TypedBrokerSourceConfig<SourceType.STATE>;
export function createEmptyConfig(sourceType: SourceType.COMPUTED): TypedBrokerSourceConfig<SourceType.COMPUTED>;
export function createEmptyConfig(sourceType: SourceType.FUNCTION): TypedBrokerSourceConfig<SourceType.FUNCTION>;

export function createEmptyConfig(sourceType: SourceType): BrokerSourceConfig {
    const baseConfig = {
        broker_id: "",
        source_type: sourceType,
        cache_policy: ScopeType.SESSION,
        required: true,
        default_value: null,
        validation_rules: null,
    };

    switch (sourceType) {
        case SourceType.DATABASE:
            return {
                ...baseConfig,
                database_config: {
                    table: "",
                    query: {},
                    field: null,
                    joins: [],
                    connection_pool: null,
                    timeout_seconds: 30,
                },
            };
        case SourceType.API:
            return {
                ...baseConfig,
                api_config: {
                    endpoint: "",
                    method: "GET",
                    params: {},
                    headers: {},
                    auth_config: null,
                    timeout_seconds: 30,
                    retry_attempts: 3,
                    cache_duration_seconds: 300,
                },
            };
        case SourceType.FILE:
            return {
                ...baseConfig,
                file_config: {
                    file_path: "",
                    file_type: "json",
                    encoding: "utf-8",
                    parse_options: {},
                    watch_for_changes: false,
                },
            };
        case SourceType.STATE:
            return {
                ...baseConfig,
                state_config: {
                    scope: "",
                    iterations: false,
                },
            };
        case SourceType.COMPUTED:
            return {
                ...baseConfig,
                computed_config: {
                    computation_function: "",
                    input_sources: [],
                    computation_args: {},
                    cache_result: true,
                    recompute_on_dependency_change: true,
                },
            };
        case SourceType.FUNCTION:
            return {
                ...baseConfig,
                function_config: {
                    function_id: "",
                    function_name: "",
                    args: {},
                    execution_context: {},
                    async_execution: false,
                },
            };
        default:
            // This should never happen with proper typing, but provides a fallback
            const _exhaustiveCheck: never = sourceType;
            throw new Error(`Unsupported source type: ${sourceType}`);
    }
}

// Option 2: Generic approach (alternative implementation)
export function createEmptyConfigGeneric<T extends SourceType>(sourceType: T): TypedBrokerSourceConfig<T> {
    // Use the non-generic overload and cast the result
    const config = createEmptyConfig(sourceType as any);
    return config as TypedBrokerSourceConfig<T>;
}
