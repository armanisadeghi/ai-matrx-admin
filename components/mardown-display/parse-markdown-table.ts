import {MarkdownTableData} from "./types";


export const parseMarkdownTable = (content: string): MarkdownTableData | null => {
    try {
        const lines = content.split('\n');
        const tableStartIndex = lines.findIndex(line => line.trim().startsWith('|'));
        if (tableStartIndex === -1) return null;

        // Find table end index
        let tableEndIndex = tableStartIndex;
        while (tableEndIndex < lines.length && lines[tableEndIndex].trim().startsWith('|')) {
            tableEndIndex++;
        }

        // Extract table lines
        const tableLines = lines
            .slice(tableStartIndex, tableEndIndex)
            .filter(line => line.trim().length > 0);

        if (tableLines.length < 3) return null;

        // Process headers and rows
        const processRow = (line: string) =>
            line
                .split('|')
                .map(cell => cell.trim())
                .filter(cell => cell.length > 0);

        const headers = processRow(tableLines[0]);
        const rows = tableLines
            .slice(2) // Skip header and separator lines
            .map(processRow);

        return { headers, rows };
    } catch (error) {
        console.error('Error parsing markdown table:', error);
        return null;
    }
};
