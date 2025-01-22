// EditorContentService.ts
import { useAppDispatch, useEntityTools } from "@/lib/redux";
import { MATRX_PATTERN } from "../utils/patternUtils";
import { ChipData, ContentMetadata, EditorState } from "../types/editor.types";

export interface ContentWithMetadata {
    content: string;
    metadata: ContentMetadata;
}


export interface BrokerChip {
    id: string;
    name: string;
    dataType?: "str" | "bool" | "dict" | "float" | "int" | "list" | "url";
    defaultValue?: string;
    defaultComponent?: string;
    color?: string;
}



const CONTENT_DELIMITERS = {
    START: '---CONTENT_START---',
    END: '---CONTENT_END---',
    META_START: '---METADATA_START---',
    META_END: '---METADATA_END---'
} as const;

export const DEFAULT_METADATA: ContentMetadata = {
    chips: [],
    brokers: [],
    version: '1.0'
};

export const getEmptyState = (): EditorState => ({
    plainTextContent: '',
    chipData: [],
    metadata: { ...DEFAULT_METADATA }
});

export const createEditorContentService = (
    messageTools: ReturnType<typeof useEntityTools>,
    brokerTools: ReturnType<typeof useEntityTools>
) => {
    const dispatch = useAppDispatch();
    const { actions: messageActions } = messageTools;
    const { actions: brokerActions } = brokerTools;

    const extractChipsFromContent = (content: string): Map<string, ChipData> => {
        const chipMap = new Map<string, ChipData>();
        const chipPattern = MATRX_PATTERN;
        let match;

        while ((match = chipPattern.exec(content)) !== null) {
            const id = match[1];
            chipMap.set(id, {
                id,
                label: `Chip ${id.slice(0, 8)}`, // Default label if no metadata
                stringValue: match[0] // Use full match as default value
            });
        }

        return chipMap;
    };

    const decodeFromStorage = (stored: string): ContentWithMetadata => {
        try {
            const contentMatch = stored.match(
                new RegExp(`${CONTENT_DELIMITERS.START}\n([\\s\\S]*?)\n${CONTENT_DELIMITERS.END}`)
            );
            const metadataMatch = stored.match(
                new RegExp(`${CONTENT_DELIMITERS.META_START}\n([\\s\\S]*?)\n${CONTENT_DELIMITERS.META_END}`)
            );

            if (!contentMatch || !metadataMatch) {
                const content = stored;
                const chipMap = extractChipsFromContent(content);
                
                return {
                    content,
                    metadata: {
                        ...DEFAULT_METADATA,
                        chips: Array.from(chipMap.values())
                    }
                };
            }

            const content = contentMatch[1];
            const metadata = JSON.parse(metadataMatch[1]) as ContentMetadata;

            return {
                content,
                metadata: {
                    ...DEFAULT_METADATA,
                    ...metadata,
                }
            };
        } catch (e) {
            console.error('Error decoding stored content:', e);
            return {
                content: stored,
                metadata: { ...DEFAULT_METADATA }
            };
        }
    };

    const encodeForStorage = (data: ContentWithMetadata): string => {
        return [
            CONTENT_DELIMITERS.START,
            data.content,
            CONTENT_DELIMITERS.END,
            CONTENT_DELIMITERS.META_START,
            JSON.stringify(data.metadata),
            CONTENT_DELIMITERS.META_END
        ].join('\n');
    };

    const prepareContentWithMetadata = (state: EditorState): ContentWithMetadata => {
        const chipMap = new Map(
            state.chipData?.map(chip => [chip.id, chip]) ?? []
        );

        return {
            content: state.plainTextContent,
            metadata: {
                ...state.metadata,
                chips: Array.from(chipMap.values())
            }
        };
    };

    const getContentForStorage = (state: EditorState): string => {
        const contentWithMetadata = prepareContentWithMetadata(state);
        return encodeForStorage(contentWithMetadata);
    };

    const parseStoredContent = (richContent: string): EditorState => {
        try {
            const decoded = decodeFromStorage(richContent);
            
            return {
                plainTextContent: decoded.content,
                chipData: decoded.metadata.chips || [],
                metadata: decoded.metadata
            };
        } catch (e) {
            console.error('Error parsing stored content:', e);
            return getEmptyState();
        }
    };

    const replaceChipsWithValues = (
        content: string,
        chipData: ChipData[],
        showTokenIds = false
    ): string => {
        const chipMap = new Map(chipData.map(chip => [chip.id, chip]));
        
        return content.replace(
            MATRX_PATTERN,
            (match, tokenId) => {
                if (showTokenIds) return match;
                return chipMap.get(tokenId)?.stringValue ?? match;
            }
        );
    };

    const setInitialContent = async (
        editorId: string,
        content: string,
        updateEditorState: (id: string, state: Partial<EditorState>) => void
    ): Promise<EditorState> => {
        const parsedState = parseStoredContent(content);
        updateEditorState(editorId, parsedState);
        return parsedState;
    };

    const saveContent = async (editorId: string, state: EditorState) => {
        const storedContent = getContentForStorage(state);
        
        // Update message content
        dispatch(
            messageActions.updateUnsavedField({
                recordId: editorId,
                field: 'content',
                value: storedContent,
            })
        );

        // Update broker relationships if needed
        if (state.chipData?.length) {
            // Future broker relationship logic here
        }

        return storedContent;
    };

    return {
        getContentForStorage,
        parseStoredContent,
        setInitialContent,
        saveContent,
        replaceChipsWithValues
    };
};

export type EditorContentService = ReturnType<typeof createEditorContentService>;