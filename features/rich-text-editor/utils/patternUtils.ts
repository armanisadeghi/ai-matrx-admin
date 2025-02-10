import { MatrxRecordId } from "@/types";

// Pattern definitions
export const MATRX_PATTERN = /<<<MATRX_START>>>(.*?)<<<MATRX_END>>>/gs;
export const DEFAULT_VALUE_PATTERN = /<DEFAULT_VALUE>(.*?)<DEFAULT_VALUE_END>/gs;
export const MATRX_RECORD_ID_PATTERN = /<MATRX_KEY>(.*?)<MATRX_KEY_END>/gs;
export const MATRX_ID_PATTERN = /<ID>(.*?)<ID_END>/gs;
export const MATRX_NAME_PATTERN = /<NAME>(.*?)<NAME_END>/gs;
export const MATRX_STATUS_PATTERN = /<STATUS>(.*?)<STATUS_END>/gs;
export const MATRX_COLOR_PATTERN = /<COLOR>(.*?)<COLOR_END>/gs;
export const MATRX_DEFAULT_COMPONENT_PATTERN = /<COMPONENT>(.*?)<COMPONENT_END>/gs;
export const MATRX_DATA_TYPE_PATTERN = /<DATA_TYPE>(.*?)<DATA_TYPE>/gs;

// Types
export type MatrxStatus = 'new' | 'active' | 'disconnected' | 'deleted' | string;

export interface MatrxMetadata {
    matrxRecordId?: string;
    name?: string;
    defaultValue?: string;
    color?: string;
    status?: MatrxStatus;
    defaultComponent?: string;
    dataType?: string;
    id?: string;
    [key: string]: string | undefined;
}

export interface Message {
    content: string;
    [key: string]: any;
}

// Display modes enum
export enum DisplayMode {
    ENCODED = 'encoded',
    SIMPLE_ID = 'simple_id',
    RECORD_KEY = 'record_key',
    NAME = 'name',
    DEFAULT_VALUE = 'default_value',
}

// Core parsing function
export const parseMatrxMetadata = (content: string): MatrxMetadata => {
    const metadata: MatrxMetadata = {};

    // Reset lastIndex for all patterns
    const patterns = [
        { pattern: DEFAULT_VALUE_PATTERN, key: 'defaultValue' },
        { pattern: MATRX_RECORD_ID_PATTERN, key: 'matrxRecordId' },
        { pattern: MATRX_ID_PATTERN, key: 'id' },
        { pattern: MATRX_NAME_PATTERN, key: 'name' },
        { pattern: MATRX_STATUS_PATTERN, key: 'status' },
        { pattern: MATRX_COLOR_PATTERN, key: 'color' },
        { pattern: MATRX_DEFAULT_COMPONENT_PATTERN, key: 'defaultComponent' },
        { pattern: MATRX_DATA_TYPE_PATTERN, key: 'dataType' },
    ];

    patterns.forEach(({ pattern, key }) => {
        pattern.lastIndex = 0;
        const match = pattern.exec(content);
        if (match && match[1]) {
            metadata[key] = match[1];
        }
    });

    return metadata;
};

// Core encoding function
export const encodeMatrxMetadata = (metadata: MatrxMetadata): string => {
    const parts: string[] = [];

    if (metadata.matrxRecordId) {
        parts.push(`<MATRX_KEY>${metadata.matrxRecordId}<MATRX_KEY_END>`);
    }
    if (metadata.id) {
        parts.push(`<ID>${metadata.id}<ID_END>`);
    }
    if (metadata.name) {
        parts.push(`<NAME>${metadata.name}<NAME_END>`);
    }
    if (metadata.defaultValue) {
        parts.push(`<DEFAULT_VALUE>${metadata.defaultValue}<DEFAULT_VALUE_END>`);
    }
    if (metadata.color) {
        parts.push(`<COLOR>${metadata.color}<COLOR_END>`);
    }
    if (metadata.status) {
        parts.push(`<STATUS>${metadata.status}<STATUS_END>`);
    }
    if (metadata.defaultComponent) {
        parts.push(`<COMPONENT>${metadata.defaultComponent}<COMPONENT_END>`);
    }
    if (metadata.dataType) {
        parts.push(`<DATA_TYPE>${metadata.dataType}<DATA_TYPE_END>`);
    }

    return `<<<MATRX_START>>>${parts.join('')}<<<MATRX_END>>>`;
};

// Utility functions
export const findMatrxMatches = (content: string): string[] => {
    MATRX_PATTERN.lastIndex = 0;
    return Array.from(content.matchAll(MATRX_PATTERN), (match) => match[1]);
};

export const transformMatrxText = (text: string, mode: DisplayMode): string => {
    MATRX_PATTERN.lastIndex = 0;

    return text.replace(MATRX_PATTERN, (fullMatch, content) => {
        const metadata = parseMatrxMetadata(content);

        switch (mode) {
            case DisplayMode.ENCODED:
                return fullMatch;
            case DisplayMode.SIMPLE_ID:
                return metadata.id || fullMatch;
            case DisplayMode.RECORD_KEY:
                return metadata.matrxRecordId || fullMatch;
            case DisplayMode.NAME:
                return metadata.name || fullMatch;
            case DisplayMode.DEFAULT_VALUE:
                return metadata.defaultValue || fullMatch;
            default:
                return fullMatch;
        }
    });
};

export const transformEncodedToSimpleIdNotEncoded = (text: string): string => {
    return transformMatrxText(text, DisplayMode.SIMPLE_ID);
};

export const transformEncodedToSimpleIdPattern = (text: string): string => {
    MATRX_PATTERN.lastIndex = 0;

    return text.replace(MATRX_PATTERN, (fullMatch, content) => {
        const metadata = parseMatrxMetadata(content);
        return metadata.id ? `<<<MATRX_START>>><ID>${metadata.id}<ID_END><<<MATRX_END>>>` : fullMatch;
    });
};

export const getMetadataFromText = (text: string): MatrxMetadata[] => {
    MATRX_PATTERN.lastIndex = 0;
    const matches = Array.from(text.matchAll(MATRX_PATTERN), (match) => match[1]);
    return matches.map(parseMatrxMetadata);
};

export const getAllMetadata = (text?: string): MatrxMetadata[] => {
    if (!text) {
        return [];
    }

    const rawMetadata = getMetadataFromText(text);
    const defaultMetadataKeys: MatrxMetadata = {
        matrxRecordId: '',
        id: '',
        name: '',
        defaultValue: '',
        color: '',
        status: '',
        defaultComponent: '',
        dataType: '',
    };

    return rawMetadata.map((metadata) => ({
        ...defaultMetadataKeys,
        ...metadata,
    }));
};

export const getAllMatrxRecordIds = (text: string): string[] =>
    getAllMetadata(text)
        .map((metadata) => metadata.matrxRecordId)
        .filter((id): id is string => Boolean(id));

export const getAllSimpleIds = (text: string): string[] =>
    getAllMetadata(text)
        .map((metadata) => metadata.id)
        .filter((id): id is string => Boolean(id));


export const getAllMatrxRecordIdsFromMessages = (messages: Message[]): string[] => {
    return messages
        .map((message) => message.content || '')
        .flatMap((content) => getAllMatrxRecordIds(content))
        .filter((id, index, self) => id && self.indexOf(id) === index);
};

export const getNewMatrxRecordIdsFromMessages = (messages: Message[], currentIds: string[]): string[] => {
    const allIdsFromMessages = getAllMatrxRecordIdsFromMessages(messages);
    return allIdsFromMessages.filter((id) => !currentIds.includes(id));
};

export const getMetadataFromAllMessages = (messages: Message[]): MatrxMetadata[] => {
    return messages.map((message) => message.content || '').flatMap(getAllMetadata);
};

export const getUniqueMetadataFromAllMessages = (messages: Message[]): MatrxMetadata[] => {
    const allMetadata = getMetadataFromAllMessages(messages);
    const uniqueMetadataMap = new Map(allMetadata.map((metadata) => [metadata.id, metadata]));
    return Array.from(uniqueMetadataMap.values());
};

export const getUniqueBrokerRecordIds = (messages: Message[]) => {
    return getUniqueMetadataFromAllMessages(messages)
        .filter((metadata) => metadata.matrxRecordId)
        .map((metadata) => metadata.matrxRecordId);
};

export const encodeMatrxMetadataArray = (metadataArray: MatrxMetadata[]): string => {
    return metadataArray.map(encodeMatrxMetadata).join(' ');
};

export const insertMatrxPatterns = (text: string, patterns: MatrxMetadata[]): string => {
    let result = text;
    patterns.forEach((pattern, index) => {
        const placeholder = `[MATRX_PATTERN_${index}]`;
        result = result.replace(placeholder, encodeMatrxMetadata(pattern));
    });
    return result;
};
