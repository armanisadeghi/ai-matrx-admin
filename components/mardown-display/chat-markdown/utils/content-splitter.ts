import { ContentBlock } from "../EnhancedChatMarkdown";

export const splitContentIntoBlocks = (mdContent: string): ContentBlock[] => {
    const blocks: ContentBlock[] = [];
    let currentText = "";
    const lines = mdContent.split(/\r?\n/);
    let insideMarkdownBlock = false;

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Handle ```markdown opening marker
        if (trimmedLine === "```markdown") {
            insideMarkdownBlock = true;
            i++; // Skip the marker
            continue;
        }

        // Handle closing ``` when inside a markdown block
        if (trimmedLine === "```" && insideMarkdownBlock) {
            insideMarkdownBlock = false;
            i++; // Skip the marker
            continue;
        }

        // Only process as code block if not inside markdown block
        if (trimmedLine.startsWith("```") && !insideMarkdownBlock) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            const languageMatch = trimmedLine.match(/^```(\w*)/);
            const language = languageMatch && languageMatch[1] ? languageMatch[1] : undefined;
            const codeContent: string[] = [];
            i++; // Move past opening ```
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                codeContent.push(lines[i]);
                i++;
            }
            blocks.push({
                type: "code",
                content: codeContent.join("\n"),
                language,
            });
            i++; // Move past closing ```
            continue;
        }

        // Detect image markdown syntax (e.g., ![alt](url))
        const imageMatch = trimmedLine.match(/^!$$ (.*?) $$$$ (https?:\/\/[^\s)]+) $$$/);
        if (imageMatch) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            const [, alt, src] = imageMatch;
            blocks.push({
                type: "image",
                content: trimmedLine,
                src,
                alt: alt || "Image",
            });
            i++;
            continue;
        }

        // Detect thinking blocks (<thinking> or <think>)
        // Detect thinking blocks (<thinking> or <think>)
        if (trimmedLine === "<thinking>" || trimmedLine === "<think>") {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            const thinkingContent: string[] = [];
            i++;
            let foundMarker = false;
            let foundClosingTag = false;

            // First pass: collect thinking content and check for marker/closing tag
            const startIndex = i;
            while (i < lines.length) {
                const currentTrimmedLine = lines[i].trim();
                // Check for normal closing tag
                if (currentTrimmedLine === "</thinking>" || currentTrimmedLine === "</think>") {
                    foundClosingTag = true;
                    break;
                }
                // Check for our special marker
                if (currentTrimmedLine.startsWith("### I have everything")) {
                    foundMarker = true;
                    thinkingContent.push(lines[i]);
                    i++;
                    break; // Exit immediately after marker
                }
                thinkingContent.push(lines[i]);
                i++;
            }

            blocks.push({
                type: "thinking",
                content: thinkingContent.join("\n"),
            });

            // Handle different scenarios
            if (foundClosingTag) {
                // If we found a closing tag, use standard processing
                i++; // Skip the closing tag
            } else if (foundMarker) {
                // Only use special marker handling if no closing tag was found
                let hasSkippedEmptyLine = false;
                while (i < lines.length) {
                    const remainingLine = lines[i].trim();
                    // Skip closing tag if present (redundant check, but keeps code safer)
                    if (remainingLine === "</thinking>" || remainingLine === "</think>") {
                        i++;
                        break;
                    }
                    // Skip first empty line after marker if present
                    if (!hasSkippedEmptyLine && remainingLine === "") {
                        hasSkippedEmptyLine = true;
                        i++;
                        continue;
                    }
                    break; // Exit and let the main loop process the rest normally
                }
            }
            continue;
        }

        if (
            trimmedLine.startsWith("|") &&
            trimmedLine.endsWith("|") &&
            trimmedLine.includes("|", 1) &&
            i + 1 < lines.length &&
            lines[i + 1].trim().match(/^\|[-:\s|]+$/m) // Separator row with pipes
        ) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }
            const tableContent: string[] = [];
            tableContent.push(lines[i]); // Header row
            i++;
            tableContent.push(lines[i]); // Separator row
            i++;
            // Continue while the line maintains table structure (starts and ends with |)
            while (
                i < lines.length &&
                lines[i].trim().startsWith("|") &&
                lines[i].trim().endsWith("|") &&
                lines[i].trim().includes("|", 1) // At least one internal pipe
            ) {
                tableContent.push(lines[i]);
                i++;
            }
            blocks.push({
                type: "table",
                content: tableContent.join("\n"),
            });
            continue;
        }

        // Accumulate text content
        currentText += line + "\n";
        i++;
    }

    if (currentText.trim()) {
        blocks.push({ type: "text", content: currentText.trimEnd() });
    }

    return blocks;
};
