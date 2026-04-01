/**
 * ID Generation
 *
 * Client-generated IDs for ephemeral entities (instances, resources, requests).
 * Uses crypto.randomUUID() with prefixes for debuggability.
 */

export const generateInstanceId = (): string =>
    `inst_${crypto.randomUUID()}`;

export const generateResourceId = (): string =>
    `res_${crypto.randomUUID()}`;

export const generateRequestId = (): string =>
    `req_${crypto.randomUUID()}`;

export const generateScopeId = (): string =>
    `scope_${crypto.randomUUID()}`;
