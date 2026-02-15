/**
 * Client-side incident reporter for dynamic tool component errors.
 *
 * Reports are sent fire-and-forget to avoid blocking the UI when a
 * dynamic component fails. Failed reports are silently dropped — the
 * fallback GenericRenderer will still display.
 */

import type { IncidentPayload } from "./types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REPORT_ENDPOINT = "/api/admin/tool-ui-incidents";
const MAX_SNAPSHOT_SIZE = 50_000; // 50 KB max for tool_update_snapshot
const DEBOUNCE_WINDOW_MS = 5_000; // Don't report same tool+type more than once per 5s

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

const recentReports = new Map<string, number>();

function dedupeKey(toolName: string, componentType: string): string {
    return `${toolName}:${componentType}`;
}

function shouldReport(toolName: string, componentType: string): boolean {
    const key = dedupeKey(toolName, componentType);
    const lastReport = recentReports.get(key);
    if (lastReport && Date.now() - lastReport < DEBOUNCE_WINDOW_MS) {
        return false;
    }
    recentReports.set(key, Date.now());
    return true;
}

// ---------------------------------------------------------------------------
// Snapshot truncation
// ---------------------------------------------------------------------------

function truncateSnapshot(snapshot: unknown): unknown {
    if (snapshot === undefined || snapshot === null) return null;
    try {
        const json = JSON.stringify(snapshot);
        if (json.length <= MAX_SNAPSHOT_SIZE) return snapshot;
        // Truncate and mark
        return {
            _truncated: true,
            _originalSize: json.length,
            _preview: json.slice(0, 2000),
        };
    } catch {
        return { _error: "Could not serialize snapshot" };
    }
}

// ---------------------------------------------------------------------------
// Browser info
// ---------------------------------------------------------------------------

function getBrowserInfo(): string {
    if (typeof navigator === "undefined") return "unknown";
    const ua = navigator.userAgent;
    // Extract browser name and version
    const match =
        ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/(\d+)/) ||
        ua.match(/(MSIE|Trident)\s*\/?(\d+)/);
    if (match) return `${match[1]}/${match[2]}`;
    return ua.slice(0, 100);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Report a dynamic tool component incident.
 * Fire-and-forget — does not throw or return useful data.
 */
export function reportIncident(payload: IncidentPayload): void {
    // Dedup check
    if (!shouldReport(payload.tool_name, payload.component_type)) {
        return;
    }

    const body: IncidentPayload & { browser_info: string } = {
        ...payload,
        browser_info: getBrowserInfo(),
        tool_update_snapshot: truncateSnapshot(payload.tool_update_snapshot),
        error_stack: payload.error_stack?.slice(0, 10_000),
        error_message: payload.error_message?.slice(0, 5_000),
    };

    // Fire-and-forget
    fetch(REPORT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }).catch(() => {
        // Silently drop — incident reporting should never block the UI
    });
}

/**
 * Convenience: report a compilation error.
 */
export function reportCompilationError(
    toolName: string,
    componentType: IncidentPayload["component_type"],
    error: unknown,
    componentId?: string,
    componentVersion?: string
): void {
    const err =
        error instanceof Error ? error : new Error(String(error));

    reportIncident({
        tool_name: toolName,
        component_id: componentId,
        component_type: componentType,
        error_type: "compilation",
        error_message: err.message,
        error_stack: err.stack,
        component_version: componentVersion,
    });
}

/**
 * Convenience: report a runtime render error.
 */
export function reportRuntimeError(
    toolName: string,
    componentType: IncidentPayload["component_type"],
    error: unknown,
    toolUpdates?: unknown[],
    componentId?: string,
    componentVersion?: string
): void {
    const err =
        error instanceof Error ? error : new Error(String(error));

    reportIncident({
        tool_name: toolName,
        component_id: componentId,
        component_type: componentType,
        error_type: "runtime",
        error_message: err.message,
        error_stack: err.stack,
        tool_update_snapshot: toolUpdates,
        component_version: componentVersion,
    });
}

/**
 * Convenience: report a fetch error.
 */
export function reportFetchError(
    toolName: string,
    error: unknown
): void {
    const err =
        error instanceof Error ? error : new Error(String(error));

    reportIncident({
        tool_name: toolName,
        component_type: "fetch",
        error_type: "fetch",
        error_message: err.message,
        error_stack: err.stack,
    });
}
