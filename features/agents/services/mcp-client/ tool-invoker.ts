/**
 * MCP Tool Invocation
 *
 * Routes tool calls to the correct MCP server and returns results.
 * Handles the tools/call JSON-RPC method.
 */

import { sendJsonRpc, type HttpTransportOptions } from "./http-transport";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface McpToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface McpContentBlock {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: {
    uri: string;
    text?: string;
    blob?: string;
    mimeType?: string;
  };
}

export interface McpToolResult {
  content: McpContentBlock[];
  isError?: boolean;
}

// ─── Invocation ──────────────────────────────────────────────────────────────

/**
 * Invoke a tool on an MCP server.
 * Returns the tool result with content blocks.
 */
export async function invokeTool(
  options: HttpTransportOptions,
  params: McpToolCallParams,
): Promise<McpToolResult> {
  const response = await sendJsonRpc<McpToolResult>(options, "tools/call", {
    name: params.name,
    arguments: params.arguments ?? {},
  });

  if (!response.result) {
    return {
      content: [{ type: "text", text: "No result returned from tool" }],
      isError: true,
    };
  }

  return response.result;
}

/**
 * Read a resource from an MCP server.
 */
export async function readResource(
  options: HttpTransportOptions,
  uri: string,
): Promise<McpResourceContent[]> {
  const response = await sendJsonRpc<ResourceReadResult>(
    options,
    "resources/read",
    { uri },
  );

  return response.result?.contents ?? [];
}

/**
 * Execute a prompt template on an MCP server.
 */
export async function executePrompt(
  options: HttpTransportOptions,
  name: string,
  args?: Record<string, string>,
): Promise<McpPromptMessage[]> {
  const response = await sendJsonRpc<PromptGetResult>(options, "prompts/get", {
    name,
    arguments: args ?? {},
  });

  return response.result?.messages ?? [];
}

// ─── Supporting Types ────────────────────────────────────────────────────────

export interface McpResourceContent {
  uri: string;
  text?: string;
  blob?: string;
  mimeType?: string;
}

interface ResourceReadResult {
  contents: McpResourceContent[];
}

export interface McpPromptMessage {
  role: "user" | "assistant";
  content: McpContentBlock;
}

interface PromptGetResult {
  description?: string;
  messages: McpPromptMessage[];
}
