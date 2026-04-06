/**
 * MCP Tool Discovery
 *
 * Calls tools/list on a connected MCP server and returns normalized tool schemas.
 * Handles pagination via the MCP cursor protocol.
 */

import { sendJsonRpc, type HttpTransportOptions } from "./http-transport";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface McpToolSchema {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
}

interface ToolsListResult {
  tools: McpToolSchema[];
  nextCursor?: string;
}

// ─── Discovery ───────────────────────────────────────────────────────────────

/**
 * Fetch all tools from an MCP server, handling pagination.
 * Returns the complete list of tool schemas.
 */
export async function discoverTools(
  options: HttpTransportOptions,
): Promise<McpToolSchema[]> {
  const allTools: McpToolSchema[] = [];
  let cursor: string | undefined;

  do {
    const params: Record<string, unknown> = {};
    if (cursor) params.cursor = cursor;

    const response = await sendJsonRpc<ToolsListResult>(
      options,
      "tools/list",
      Object.keys(params).length > 0 ? params : undefined,
    );

    if (!response.result) break;

    allTools.push(...response.result.tools);
    cursor = response.result.nextCursor;
  } while (cursor);

  return allTools;
}

/**
 * Fetch resources list from an MCP server.
 * Returns available resources (documents, data sources, etc.).
 */
export async function discoverResources(
  options: HttpTransportOptions,
): Promise<McpResource[]> {
  const allResources: McpResource[] = [];
  let cursor: string | undefined;

  do {
    const params: Record<string, unknown> = {};
    if (cursor) params.cursor = cursor;

    const response = await sendJsonRpc<ResourcesListResult>(
      options,
      "resources/list",
      Object.keys(params).length > 0 ? params : undefined,
    );

    if (!response.result) break;

    allResources.push(...response.result.resources);
    cursor = response.result.nextCursor;
  } while (cursor);

  return allResources;
}

/**
 * Fetch prompts list from an MCP server.
 */
export async function discoverPrompts(
  options: HttpTransportOptions,
): Promise<McpPrompt[]> {
  const allPrompts: McpPrompt[] = [];
  let cursor: string | undefined;

  do {
    const params: Record<string, unknown> = {};
    if (cursor) params.cursor = cursor;

    const response = await sendJsonRpc<PromptsListResult>(
      options,
      "prompts/list",
      Object.keys(params).length > 0 ? params : undefined,
    );

    if (!response.result) break;

    allPrompts.push(...response.result.prompts);
    cursor = response.result.nextCursor;
  } while (cursor);

  return allPrompts;
}

// ─── Supporting Types ────────────────────────────────────────────────────────

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface ResourcesListResult {
  resources: McpResource[];
  nextCursor?: string;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

interface PromptsListResult {
  prompts: McpPrompt[];
  nextCursor?: string;
}
