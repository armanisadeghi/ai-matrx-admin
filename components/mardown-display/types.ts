// types/table.ts
export interface MarkdownTableData {
    headers: string[];
    rows: string[][];
    originalContent?: string; // Store original markdown for copy
}


export interface MarkdownTableProps {
    data: MarkdownTableData;
    className?: string;
    fontSize?: number;
}

