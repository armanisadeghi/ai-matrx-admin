/**
 * Context Formatter Utility
 * 
 * Handles conversion between dynamic context state and XML representation.
 * 
 * Key features:
 * - Format contexts to XML for message content
 * - Parse contexts from AI responses
 * - Create archived context metadata
 * - Extract contexts from message content
 */

import type {
  DynamicContextState,
  DynamicContextsMap,
  ArchivedContextsMap,
  ParsedContext,
} from '../types/dynamic-context';

/**
 * Format a single context to XML
 * 
 * Example output:
 * ```xml
 * <context id="file_1" version="3" type="code" language="typescript" filename="app.ts">
 * // Content here
 * </context>
 * ```
 */
export function formatContextToXml(context: DynamicContextState): string {
  const { contextId, currentVersion, currentContent, metadata } = context;
  
  // Build XML attributes
  const attributes: string[] = [
    `id="${escapeXmlAttribute(contextId)}"`,
    `version="${currentVersion}"`,
  ];
  
  // Add optional metadata attributes
  if (metadata.type) {
    attributes.push(`type="${escapeXmlAttribute(metadata.type)}"`);
  }
  if (metadata.language) {
    attributes.push(`language="${escapeXmlAttribute(metadata.language)}"`);
  }
  if (metadata.filename) {
    attributes.push(`filename="${escapeXmlAttribute(metadata.filename)}"`);
  }
  if (metadata.label) {
    attributes.push(`label="${escapeXmlAttribute(metadata.label)}"`);
  }
  
  const attributesStr = attributes.join(' ');
  
  return `<context ${attributesStr}>\n${currentContent}\n</context>`;
}

/**
 * Format multiple contexts to XML with separators
 * 
 * Returns a formatted string with all contexts, ready to inject into messages
 */
export function formatContextsToXml(contexts: DynamicContextsMap): string {
  const contextIds = Object.keys(contexts);
  
  if (contextIds.length === 0) {
    return '';
  }
  
  const xmlBlocks = contextIds.map(id => formatContextToXml(contexts[id]));
  
  // Add clear delimiter for multiple contexts
  if (xmlBlocks.length === 1) {
    return xmlBlocks[0];
  }
  
  return xmlBlocks.join('\n\n');
}

/**
 * Extract contexts from XML string
 * 
 * Parses XML context blocks from message content or AI responses.
 * Returns array of parsed contexts with their positions.
 */
export function extractContextsFromXml(xmlString: string): ParsedContext[] {
  const contexts: ParsedContext[] = [];
  
  // Regex to match context blocks
  // Matches: <context ...attributes...>content</context>
  const contextRegex = /<context\s+([^>]+)>([\s\S]*?)<\/context>/gi;
  
  let match;
  while ((match = contextRegex.exec(xmlString)) !== null) {
    const attributesStr = match[1];
    const content = match[2].trim();
    const rawXml = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + rawXml.length;
    
    // Parse attributes
    const attributes = parseXmlAttributes(attributesStr);
    
    contexts.push({
      contextId: attributes.id || '',
      version: attributes.version ? parseInt(attributes.version, 10) : undefined,
      type: attributes.type,
      language: attributes.language,
      filename: attributes.filename,
      label: attributes.label,
      attributes,
      content,
      rawXml,
      startIndex,
      endIndex,
    });
  }
  
  return contexts;
}

/**
 * Create archived context metadata from current contexts
 * 
 * Used when moving contexts from message content to metadata
 * for non-current messages (token optimization).
 */
export function createContextArchiveMetadata(
  contexts: DynamicContextsMap
): ArchivedContextsMap {
  const archived: ArchivedContextsMap = {};
  
  Object.keys(contexts).forEach(contextId => {
    const context = contexts[contextId];
    const currentVersion = context.versions.find(
      v => v.version === context.currentVersion
    );
    
    archived[contextId] = {
      version: context.currentVersion,
      summary: currentVersion?.changesSummary,
      metadata: context.metadata,
    };
  });
  
  return archived;
}

/**
 * Remove context XML blocks from a string
 * 
 * Returns the string with all context blocks removed.
 * Useful for cleaning up message content after archiving contexts.
 */
export function removeContextsFromContent(content: string): string {
  // Remove all context blocks
  return content.replace(/<context\s+[^>]+>[\s\S]*?<\/context>/gi, '').trim();
}

/**
 * Check if a string contains context XML blocks
 */
export function hasContextXml(content: string): boolean {
  return /<context\s+[^>]+>[\s\S]*?<\/context>/i.test(content);
}

/**
 * Extract context IDs from XML string
 * 
 * Quick way to get just the IDs without full parsing
 */
export function extractContextIds(xmlString: string): string[] {
  const contexts = extractContextsFromXml(xmlString);
  return contexts.map(c => c.contextId).filter(Boolean);
}

/**
 * Build context section for message injection
 * 
 * Creates a properly formatted section to inject into messages,
 * including header/footer comments for clarity.
 */
export function buildContextSection(contexts: DynamicContextsMap): string {
  if (Object.keys(contexts).length === 0) {
    return '';
  }
  
  const contextsXml = formatContextsToXml(contexts);
  
  return `\n\n<!-- Dynamic Contexts (Latest Versions) -->\n${contextsXml}\n<!-- End Dynamic Contexts -->\n`;
}

// ========== HELPER FUNCTIONS ==========

/**
 * Escape XML attribute values
 */
function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Parse XML attributes from string
 * 
 * Example: 'id="file_1" version="3" type="code"'
 * Returns: { id: 'file_1', version: '3', type: 'code' }
 */
function parseXmlAttributes(attributesStr: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  
  // Regex to match attribute="value" pairs
  const attrRegex = /(\w+)=["']([^"']*)["']/g;
  
  let match;
  while ((match = attrRegex.exec(attributesStr)) !== null) {
    const [, key, value] = match;
    attributes[key] = unescapeXmlAttribute(value);
  }
  
  return attributes;
}

/**
 * Unescape XML attribute values
 */
function unescapeXmlAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Get context stats from contexts map
 * 
 * Useful for debugging and logging
 */
export function getContextStats(contexts: DynamicContextsMap): {
  count: number;
  totalVersions: number;
  totalContentLength: number;
  contextIds: string[];
} {
  const contextIds = Object.keys(contexts);
  
  let totalVersions = 0;
  let totalContentLength = 0;
  
  contextIds.forEach(id => {
    const context = contexts[id];
    totalVersions += context.versions.length;
    totalContentLength += context.currentContent.length;
  });
  
  return {
    count: contextIds.length,
    totalVersions,
    totalContentLength,
    contextIds,
  };
}

