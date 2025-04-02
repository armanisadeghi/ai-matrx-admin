import {MarkdownTableData} from "./types";

type NormalizedTableData = Array<{ [key: string]: string }>;

export const parseMarkdownTable = (content: string): { 
    markdown: MarkdownTableData | null,
    data: NormalizedTableData | null 
} => {
    try {
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        
        const tableStartIndex = lines.findIndex(line => line.trim().startsWith('|'));
        if (tableStartIndex === -1) return { markdown: null, data: null };

        const tableLines = lines.slice(tableStartIndex);
        if (tableLines.length < 3) return { markdown: null, data: null };

        if (!tableLines[1].includes('-')) return { markdown: null, data: null };

        // Process rows, preserving empty cells
        const processRow = (line: string) => {
            const cells = line.split('|').map(cell => cell.trim());
            // Remove the first and last empty elements (from leading/trailing |)
            if (cells.length > 0 && cells[0] === '') cells.shift();
            if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
            return cells;
        };

        const headers = processRow(tableLines[0]);
        if (headers.length === 0) return { markdown: null, data: null };

        const rows = tableLines
            .slice(2)
            .map(processRow)
            .filter(row => row.some(cell => cell.length > 0)); // Only filter completely empty rows

        if (rows.length === 0) return { markdown: null, data: null };

        // Clean markdown formatting for normalized data only
        const cleanText = (text: string) => {
            return text
                .replace(/\*\*([^*]+)\*\*/g, '$1')
                .replace(/\*([^*]+)\*/g, '$1')
                .replace(/_([^_]+)_/g, '$1')
                .replace(/`([^`]+)`/g, '$1')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
                .replace(/#{1,6}\s*/g, '')
                .trim();
        };

        // Convert to normalized data with cleaned text
        const normalizedData = rows.map(row => {
            const rowData: { [key: string]: string } = {};
            headers.forEach((header, index) => {
                const cleanHeader = cleanText(header);
                rowData[cleanHeader] = index < row.length ? cleanText(row[index]) : '';
            });
            return rowData;
        });

        return { 
            markdown: { headers, rows }, // Keep original markdown with empty cells
            data: normalizedData         // Cleaned version with proper alignment
        };
    } catch (error) {
        return { markdown: null, data: null };
    }
};

