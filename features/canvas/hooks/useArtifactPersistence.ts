/**
 * useArtifactPersistence — persist artifact blocks to canvas_items after streaming.
 *
 * Call `persistArtifacts()` from onStreamComplete (or after loadConversationHistory)
 * to extract <artifact> tags from the accumulated content and save them via
 * cx_canvas_upsert RPC.
 *
 * This hook also handles version detection: if an artifact_index already
 * exists in the conversation from a previous message, it creates a new
 * version instead of upserting.
 */

import { useCallback, useRef } from "react";
import { canvasArtifactService } from "@/features/canvas/services/canvasArtifactService";
import { extractArtifacts, hasArtifacts } from "@/features/canvas/utils/extractArtifacts";
import type { ExtractedArtifact } from "@/features/canvas/utils/extractArtifacts";
import type { CanvasArtifactRow } from "@/features/canvas/services/canvasArtifactService";

interface PersistArtifactsParams {
    /** Full accumulated content from the assistant message */
    content: string;
    /** The cx_message.id of the assistant message (real DB ID, not optimistic) */
    messageId: string;
    /** The conversation ID */
    conversationId: string;
}

interface PersistResult {
    persisted: CanvasArtifactRow[];
    errors: Array<{ artifact: ExtractedArtifact; error: string }>;
}

export function useArtifactPersistence() {
    // Cache existing conversation artifacts to detect version updates
    const conversationArtifactsCache = useRef<Map<string, CanvasArtifactRow[]>>(new Map());

    /**
     * Persist all artifact blocks found in the content.
     * Handles both new artifacts and version updates.
     */
    const persistArtifacts = useCallback(async (params: PersistArtifactsParams): Promise<PersistResult> => {
        const { content, messageId, conversationId } = params;
        const result: PersistResult = { persisted: [], errors: [] };

        // Fast bail if no artifacts
        if (!hasArtifacts(content)) {
            return result;
        }

        const artifacts = extractArtifacts(content);
        if (artifacts.length === 0) {
            return result;
        }

        // Load existing artifacts for this conversation (for version detection)
        let existingArtifacts: CanvasArtifactRow[] = [];
        const cached = conversationArtifactsCache.current.get(conversationId);
        if (cached) {
            existingArtifacts = cached;
        } else {
            existingArtifacts = await canvasArtifactService.getConversationLatest(conversationId);
            conversationArtifactsCache.current.set(conversationId, existingArtifacts);
        }

        for (const artifact of artifacts) {
            try {
                // Check if this artifact_index already exists from a DIFFERENT message
                const existingVersion = existingArtifacts.find(
                    (existing) =>
                        existing.artifact_index === artifact.artifactIndex &&
                        existing.source_message_id !== messageId
                );

                let saved: CanvasArtifactRow | null;

                if (existingVersion) {
                    // Create a new version — this artifact is an update to an existing one
                    saved = await canvasArtifactService.createVersion({
                        originalCanvasId: existingVersion.id,
                        newMessageId: messageId,
                        artifactIndex: artifact.artifactIndex,
                        type: artifact.artifactType,
                        title: artifact.title,
                        content: artifact.content,
                    });
                } else {
                    // New artifact or same-message re-upsert
                    saved = await canvasArtifactService.upsert({
                        messageId,
                        artifactIndex: artifact.artifactIndex,
                        type: artifact.artifactType,
                        title: artifact.title,
                        content: artifact.content,
                        conversationId,
                        sourceType: "model_direct",
                    });
                }

                if (saved) {
                    result.persisted.push(saved);
                } else {
                    result.errors.push({ artifact, error: "RPC returned null" });
                }
            } catch (err) {
                result.errors.push({
                    artifact,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        // Update cache with newly persisted artifacts
        if (result.persisted.length > 0) {
            const refreshed = await canvasArtifactService.getConversationLatest(conversationId);
            conversationArtifactsCache.current.set(conversationId, refreshed);
        }

        return result;
    }, []);

    /**
     * Clear the conversation cache (e.g., when switching conversations).
     */
    const clearCache = useCallback(() => {
        conversationArtifactsCache.current.clear();
    }, []);

    return { persistArtifacts, clearCache };
}

/**
 * Standalone function for use outside React components (e.g., in thunks).
 * Does not handle version detection — always upserts.
 */
export async function persistArtifactsFromContent(
    content: string,
    messageId: string,
    conversationId: string,
): Promise<CanvasArtifactRow[]> {
    if (!hasArtifacts(content)) return [];

    const artifacts = extractArtifacts(content);
    const results: CanvasArtifactRow[] = [];

    for (const artifact of artifacts) {
        const saved = await canvasArtifactService.upsert({
            messageId,
            artifactIndex: artifact.artifactIndex,
            type: artifact.artifactType,
            title: artifact.title,
            content: artifact.content,
            conversationId,
            sourceType: "model_direct",
        });

        if (saved) {
            results.push(saved);
        }
    }

    return results;
}
