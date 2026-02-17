// lib/redux/socket-io/socket.types.ts

export interface SocketConfig {
    url: string;
    namespace?: string;
    auth?: Record<string, any>;
    transports?: ("polling" | "websocket")[];
}

export interface PredefinedConnection {
    name: string;
    url: string;
    namespace: string;
}

export type socketConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface SocketConnection {
    connectionId: string;
    socket: any | null;
    url: string;
    namespace: string;
    connectionStatus: socketConnectionStatus;
    isAuthenticated: boolean;
}

export interface SocketState {
    connections: Record<string, SocketConnection>;
    primaryConnectionId: string;
    authToken: string | null;
    isAdmin: boolean;
    predefinedConnections: PredefinedConnection[];
    connectionForm: ConnectionForm;
    testMode: boolean;
}

export interface ConnectionForm {
    url: string;
    namespace: string;
    selectedPredefined: string;
}

export type TaskStatus = "building" | "ready" | "submitted" | "completed" | "error";

export interface SocketTask {
    taskId: string;
    service: string;
    taskName: string;
    taskData: Record<string, any>;
    isValid: boolean;
    validationErrors: string[];
    status: TaskStatus;
    listenerIds: string[];
    connectionId: string;
    isStreaming: boolean;
  }

export interface SocketErrorObject {
    message?: string;
    type?: string;
    user_message?: string;
    /** @deprecated Use user_message. Kept for backward compatibility. */
    user_visible_message?: string;
    code?: string;
    details?: any;
}

export type SocketInfoObject = {
    status: "confirm" | "processing";
    system_message: string;
    user_message?: string;
    /** @deprecated Use user_message. Kept for backward compatibility. */
    user_visible_message?: string;
    metadata?: Record<string, unknown> | null;
};

export interface SocketBrokerObject {
    broker_id: string;
    value: any; // Preserve original data type
    source?: string; // Defaults to "socket-response" if not provided
    source_id?: string; // Defaults to listenerId if not provided
}

export interface McpInputObject {
    name: string;
    arguments?: Record<string, unknown>;
}

export interface StepDataObject {
    type: string;
    content: Record<string, unknown>;
}

export interface ToolCallObject {
    id?: string;
    type: "mcp_input" | "mcp_output" | "mcp_error" | "step_data" | "user_message" | "user_visible_message";
    mcp_input?: McpInputObject;
    mcp_output?: Record<string, unknown>;
    mcp_error?: string;
    step_data?: StepDataObject;
    user_message?: string;
    /** @deprecated Use user_message. Kept for backward compatibility. */
    user_visible_message?: string;
}

export interface ResponseState {
    text: string;
    textChunks: string[]; // New: for performance optimization
    data: any[];
    info: SocketInfoObject[];
    errors: SocketErrorObject[];
    toolUpdates: ToolCallObject[]; // New: for tool_update events (MCP tool calls)
    ended: boolean;
    taskId: string;
}

export interface ResponsesState {
    [listenerId: string]: ResponseState;
}
