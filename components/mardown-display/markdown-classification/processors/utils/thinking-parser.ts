// thinking-parser.ts
export interface ContentSegment {
    isThinking: boolean;
    isQuestionnaire: boolean;
    content: string;
}

export const parseTaggedContent = (content: string): ContentSegment[] => {
    const openingTags = ['<thinking>', '<think>', '<questionnaire>'];
    const closingTags = ['</thinking>', '</think>', '<thinking>', '<think>', '</questionnaire>'];
    const segments: ContentSegment[] = [];
    let currentIndex = 0;

    while (currentIndex < content.length) {
        // Find next opening tag
        let nextOpeningIndex = -1;
        let openingTagUsed = '';
        
        for (const tag of openingTags) {
            const index = content.indexOf(tag, currentIndex);
            if (index !== -1 && (nextOpeningIndex === -1 || index < nextOpeningIndex)) {
                nextOpeningIndex = index;
                openingTagUsed = tag;
            }
        }

        // If no more opening tags, add remaining content as normal
        if (nextOpeningIndex === -1) {
            if (currentIndex < content.length) {
                segments.push({
                    isThinking: false,
                    isQuestionnaire: false,
                    content: content.substring(currentIndex)
                });
            }
            break;
        }

        // Add content before opening tag as normal content
        if (nextOpeningIndex > currentIndex) {
            segments.push({
                isThinking: false,
                isQuestionnaire: false,
                content: content.substring(currentIndex, nextOpeningIndex)
            });
        }

        // Find closing tag
        let closingIndex = -1;
        for (const tag of closingTags) {
            const index = content.indexOf(tag, nextOpeningIndex + openingTagUsed.length);
            if (index !== -1 && (closingIndex === -1 || index < closingIndex)) {
                closingIndex = index;
            }
        }

        // If no closing tag found, treat rest as thinking or questionnaire content
        if (closingIndex === -1) {
            const isQuestionnaire = openingTagUsed === '<questionnaire>';
            segments.push({
                isThinking: !isQuestionnaire,
                isQuestionnaire: isQuestionnaire,
                content: content.substring(nextOpeningIndex + openingTagUsed.length)
            });
            break;
        }

        // Add thinking or questionnaire content
        const isQuestionnaire = openingTagUsed === '<questionnaire>';
        segments.push({
            isThinking: !isQuestionnaire,
            isQuestionnaire: isQuestionnaire,
            content: content.substring(
                nextOpeningIndex + openingTagUsed.length,
                closingIndex
            )
        });

        currentIndex = closingIndex + content.substring(closingIndex).indexOf('>') + 1;
    }

    return segments;
};