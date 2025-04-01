import { ContentBlock } from "../EnhancedChatMarkdown";


export     const splitContentIntoBlocks = (mdContent: string): ContentBlock[] => {
    const blocks: ContentBlock[] = [];
    let currentText = "";
    const lines = mdContent.split(/\r?\n/);

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Detect image markdown syntax (e.g., ![alt](url))
        const imageMatch = trimmedLine.match(/^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
        if (imageMatch) {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }

            const [, alt, src] = imageMatch;
            blocks.push({
                type: "image",
                content: trimmedLine, // Keep original for reference
                src,
                alt: alt || "Image",
            });
            i++;
            continue;
        }

        // Detect thinking blocks (<thinking> or <think>)
        if (trimmedLine === "<thinking>" || trimmedLine === "<think>") {
            if (currentText.trim()) {
                blocks.push({ type: "text", content: currentText.trimEnd() });
                currentText = "";
            }

            const thinkingContent: string[] = [];
            i++; // Move past opening tag
            while (i < lines.length && lines[i].trim() !== "</thinking>" && lines[i].trim() !== "</think>") {
                thinkingContent.push(lines[i]);
                i++;
            }

            blocks.push({
                type: "thinking",
                content: thinkingContent.join("\n"),
            });
            i++; // Move past closing tag
            continue;
        }

        // Detect code blocks (```lang or ```)
        if (trimmedLine.startsWith("```")) {
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

        // Detect table blocks
        if (
            trimmedLine.startsWith("|") &&
            trimmedLine.includes("|", 1) &&
            i + 1 < lines.length &&
            lines[i + 1].trim().match(/^\|[-:\s|]+$/)
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
            while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().includes("|", 1)) {
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
