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
    connectionId?: string;
}

export interface SocketErrorObject {
    message?: string;
    type?: string;
    user_visible_message?: string;
    code?: string;
    details?: any;
}

export type SocketInfoObject = {
    status: "confirm" | "processing";
    system_message: string;
    user_visible_message?: string;
    metadata?: Record<string, unknown> | null;
};

export interface ResponseState {
    text: string;
    data: any[];
    info: SocketInfoObject[];
    errors: SocketErrorObject[];
    ended: boolean;
    taskId: string;
}

export interface ResponsesState {
    [listenerId: string]: ResponseState;
}
