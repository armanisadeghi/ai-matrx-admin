// lib/api/tool-call.types.ts
// Renderer contract for tool call visualization.
//
// These types define the shape that UI renderers consume. They bridge
// the wire-protocol ToolEventPayload into a shape suitable for the
// collapsible tool-call cards, inline previews, and overlay renderers.
//
// Previously lived in lib/redux/socket-io/socket.types.ts — extracted
// here because they have nothing to do with socket.io.

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
    type: 'mcp_input' | 'mcp_output' | 'mcp_error' | 'step_data' | 'user_message' | 'user_visible_message';
    mcp_input?: McpInputObject;
    mcp_output?: Record<string, unknown>;
    mcp_error?: string;
    step_data?: StepDataObject;
    user_message?: string;
    /** @deprecated Use user_message. Kept for backward compatibility with authenticated chat. */
    user_visible_message?: string;
}
