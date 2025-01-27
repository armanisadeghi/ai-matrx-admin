import { MessageTemplateProcessed, MessageTemplateRecordWithKey } from '@/types';

export const MATRX_PATTERN = /\{([^}]+)}!/g;
export const MATRX_BARE_UUID = /{([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})}!/g;
export const MATRX_ID_PATTERN = /{([a-zA-Z_][a-zA-Z0-9_]*:[^:}]+(?:::(?:[a-zA-Z_][a-zA-Z0-9_]*:[^:}]+))*)}!/g;

export const PATTERN_OPTIONS = {
    all: MATRX_PATTERN,
    UUID: MATRX_BARE_UUID,
    recordkey: MATRX_ID_PATTERN,
};

export const findMatrxMatches = (content: string): string[] => {
    MATRX_PATTERN.lastIndex = 0;

    return Array.from(content.matchAll(MATRX_PATTERN), (match) => match[1]);
};

export const findPatterns = (pattern: RegExp, content: string): string[] => {
    MATRX_PATTERN.lastIndex = 0;

    return Array.from(content.matchAll(pattern), (match) => match[1]);
};

export const findPatternsByname = (patternName: string, content: string): string[] => {
    const pattern = PATTERN_OPTIONS[patternName];
    MATRX_PATTERN.lastIndex = 0;

    return Array.from(content.matchAll(pattern), (match) => match[1]);
};

interface PatternResults {
    all: string[];
    uuids: string[];
    ids: string[];
}

export const findAllPatterns = (content: string): PatternResults => {
    return {
        all: findPatterns(MATRX_PATTERN, content),
        uuids: findPatterns(MATRX_BARE_UUID, content),
        ids: findPatterns(MATRX_ID_PATTERN, content),
    };
};

export const findAllPatternsOrdered = (content: string): PatternResults => {
    const idMatches = new Set(findPatterns(MATRX_ID_PATTERN, content));

    const uuidMatches = new Set(findPatterns(MATRX_BARE_UUID, content).filter((match) => !idMatches.has(match)));

    const basicMatches = new Set(findPatterns(MATRX_PATTERN, content).filter((match) => !idMatches.has(match) && !uuidMatches.has(match)));

    return {
        ids: Array.from(idMatches),
        uuids: Array.from(uuidMatches),
        all: Array.from(basicMatches),
    };
};

// Add valid status types
export type MatrxStatus = 'new' | 'active' | 'disconnected' | 'deleted' | string;

interface MatrxMetadata {
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

// Define display options as an enum
export enum DisplayMode {
    ENCODED = 'encoded',
    SIMPLE_ID = 'simple_id',
    RECORD_KEY = 'record_key',
    NAME = 'name',
    DEFAULT_VALUE = 'default_value',
    STATUS = 'status',
}

// Parse a single MATRX pattern into its metadata components
export const parseMatrxMetadata = (content: string): MatrxMetadata => {
    const parts = content.split('|');
    const metadata: MatrxMetadata = {};

    parts.forEach((part) => {
        const match = part.match(/^([^:]+):"([^"]*)"$/) || part.match(/^([^:]+):([^"]*)$/);
        if (match) {
            const [, key, value] = match;
            metadata[key] = value === 'undefined' ? '' : value;
        }
    });

    return metadata;
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

            case DisplayMode.STATUS:
                return metadata.status || fullMatch;

            default:
                return fullMatch;
        }
    });
};

export const isMatrxNew = (metadata: MatrxMetadata): boolean => metadata.status === 'new';

export const isMatrxActive = (metadata: MatrxMetadata): boolean => metadata.status === 'active';

// Function to get metadata from text
export const getMetadataFromText = (text: string): MatrxMetadata[] => {
    MATRX_PATTERN.lastIndex = 0;
    const matches = Array.from(text.matchAll(MATRX_PATTERN), (match) => match[1]);
    return matches.map(parseMatrxMetadata);
};

export const getProcessedMetadataFromText = (text: string): MatrxMetadata[] => {
    // Step 1: Extract metadata using the existing function
    const rawMetadata = getMetadataFromText(text);

    // Step 2: Define the consistent structure for metadata keys
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

    // Step 3: Map raw metadata to the consistent structure
    return rawMetadata.map((metadata) => ({
        ...defaultMetadataKeys,
        ...metadata,
    }));
};

export const getAllMatrxRecordIds = (text: string): string[] =>
    getProcessedMetadataFromText(text)
        .map((metadata) => metadata.matrxRecordId)
        .filter((id): id is string => Boolean(id));

interface message {
    content: string;
    [key: string]: any;
}

export const getAllMatrxRecordIdsFromMessages = (messages: MessageTemplateRecordWithKey[]): string[] => {
    return messages
        .map((message) => message.content || '') // Extract 'content', default to empty string
        .flatMap((content) => getAllMatrxRecordIds(content)) // Use utility to get IDs from each content
        .filter((id, index, self) => id && self.indexOf(id) === index); // Remove duplicates and falsy values
};

export const getNewMatrxRecordIdsFromMessages = (
    messages: MessageTemplateRecordWithKey[],
    currentIds: string[]
): string[] => {
    const allIdsFromMessages = messages
        .map((message) => message.content || '') // Extract 'content', default to empty string
        .flatMap((content) => getAllMatrxRecordIds(content)) // Use utility to get IDs from each content
        .filter((id, index, self) => id && self.indexOf(id) === index); // Remove duplicates and falsy values
        return allIdsFromMessages.filter(id => !currentIds.includes(id));
};

export const encodeMatrxMetadata = (metadata: MatrxMetadata): string => {
    const parts: string[] = [];
    
    // Handle required fields first
    if (metadata.matrxRecordId) {
        parts.push(`matrxRecordId:${metadata.matrxRecordId}`);
    }
    
    if (metadata.id) {
        parts.push(`id:${metadata.id}`);
    }
    
    // Handle optional fields with quotes for values that might contain special characters
    if (metadata.name !== undefined) {
        parts.push(`name:"${metadata.name}"`);
    }
    
    if (metadata.defaultValue !== undefined) {
        parts.push(`defaultValue:"${metadata.defaultValue}"`);
    }
    
    if (metadata.color !== undefined) {
        parts.push(`color:"${metadata.color}"`);
    }
    
    if (metadata.status !== undefined) {
        parts.push(`status:"${metadata.status}"`);
    }
    
    if (metadata.defaultComponent !== undefined && metadata.defaultComponent !== '') {
        parts.push(`defaultComponent:"${metadata.defaultComponent}"`);
    }
    
    if (metadata.dataType !== undefined && metadata.dataType !== '') {
        parts.push(`dataType:"${metadata.dataType}"`);
    }
    
    return `{${parts.join('|')}}!`;
};

export const encodeMatrxMetadataArray = (metadataArray: MatrxMetadata[]): string => {
    return metadataArray.map(encodeMatrxMetadata).join(' ');
};

// Helper function to insert encoded MATRX patterns into text with placeholders
export const insertMatrxPatterns = (text: string, patterns: MatrxMetadata[]): string => {
    let result = text;
    patterns.forEach((pattern, index) => {
        const placeholder = `[MATRX_PATTERN_${index}]`;
        result = result.replace(placeholder, encodeMatrxMetadata(pattern));
    });
    return result;
};