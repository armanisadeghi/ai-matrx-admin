/**
 * extractArtifacts — parses raw message content to extract artifact metadata.
 *
 * Used after streaming completes to find all <artifact> blocks in the
 * accumulated content and extract their id, index, type, title, and body.
 *
 * This is a lightweight extraction — NOT a full block splitter. It only
 * looks for <artifact> tags and pulls out the metadata + inner content
 * needed for database persistence via cx_canvas_upsert.
 */

export interface ExtractedArtifact {
    artifactId: string;
    artifactIndex: number;
    artifactType: string;
    title: string;
    content: string;
}

const ARTIFACT_REGEX = /<artifact\s+([^>]*)>([\s\S]*?)<\/artifact>/g;

function parseAttributes(attrString: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    // Use a local regex (no /g flag stale-lastIndex issue)
    const attrRegex = /(\w+)\s*=\s*"([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(attrString)) !== null) {
        attrs[match[1]] = match[2];
    }
    return attrs;
}

/**
 * Extract all artifact blocks from raw message content.
 *
 * @param content - The full accumulated message content (may contain <artifact> tags)
 * @returns Array of extracted artifacts, ordered by their position in the content
 */
export function extractArtifacts(content: string): ExtractedArtifact[] {
    const artifacts: ExtractedArtifact[] = [];

    let match: RegExpExecArray | null;
    // Reset lastIndex for global regex
    ARTIFACT_REGEX.lastIndex = 0;

    while ((match = ARTIFACT_REGEX.exec(content)) !== null) {
        const attrString = match[1];
        const innerContent = match[2].trim();
        const attrs = parseAttributes(attrString);

        const artifactId = attrs.id || `artifact-${artifacts.length}`;
        let artifactIndex = artifacts.length + 1;

        // Extract numeric index from "artifact_1" format
        if (artifactId.includes("_")) {
            const parts = artifactId.split("_");
            const num = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(num)) {
                artifactIndex = num;
            }
        }

        artifacts.push({
            artifactId,
            artifactIndex,
            artifactType: attrs.type || "text",
            title: attrs.title || `Artifact ${artifactIndex}`,
            content: innerContent,
        });
    }

    return artifacts;
}

/**
 * Check if content contains any artifact tags.
 * Fast check without full parsing — use before calling extractArtifacts.
 */
export function hasArtifacts(content: string): boolean {
    return content.includes("<artifact ");
}
