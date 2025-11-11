// lib/redux/features/textDiff/types.ts

export type DiffType = 'search_replace' | 'line_range';

export type DiffStatus = 'pending' | 'accepted' | 'rejected' | 'error';

export interface SearchReplaceDiff {
    type: 'search_replace';
    id: string;
    searchText: string;
    replaceText: string;
    status: DiffStatus;
    matchInfo?: {
        found: boolean;
        matchType: 'exact' | 'fuzzy' | 'none' | 'multiple';
        startIndex?: number;
        endIndex?: number;
        actualText?: string; // The actual matched text (may differ from searchText in fuzzy match)
    };
    error?: string;
}

export interface LineRangeDiff {
    type: 'line_range';
    id: string;
    startLine: number;
    endLine: number;
    replaceText: string;
    status: DiffStatus;
    matchInfo?: {
        found: boolean;
        actualLines?: string[]; // The actual lines being replaced
    };
    error?: string;
}

export type ParsedDiff = SearchReplaceDiff | LineRangeDiff;

export interface DiffSession {
    noteId: string;
    isDirty: boolean;
    pendingDiffs: Record<string, ParsedDiff>;
    allDiffIds: string[];
    acceptedDiffIds: string[];
    rejectedDiffIds: string[];
    originalContent: string; // Content before any diffs applied
    currentContent: string; // Content after accepted diffs applied
    lastProcessedAt: string | null;
}

export interface TextDiffState {
    sessions: Record<string, DiffSession>;
}

export interface ApplyDiffsResult {
    success: boolean;
    newContent: string;
    appliedDiffs: string[];
    failedDiffs: Array<{
        diffId: string;
        error: string;
    }>;
}
