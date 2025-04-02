import { MarkdownTableData } from "../../types";




type NormalizedTableData = Array<{ [key: string]: string }>;

export const parseMarkdownTable = (content: string): { 
    markdown: MarkdownTableData | null,
    data: NormalizedTableData | null 
} => {
    try {
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        
        // Check if we have at least the start of a table
        const tableStartIndex = lines.findIndex(line => line.trim().startsWith('|'));
        if (tableStartIndex === -1) return { markdown: null, data: null };

        // For streaming, we need at least 3 lines (header, separator, and 1+ rows) to process
        const tableLines = lines.slice(tableStartIndex);
        if (tableLines.length < 3) return { markdown: null, data: null };

        // Verify we have a separator line (contains dashes)
        if (!tableLines[1].includes('-')) return { markdown: null, data: null };

        // Process headers and rows
        const processRow = (line: string) =>
            line
                .split('|')
                .map(cell => cell.trim())
                .filter(cell => cell.length > 0);

        const headers = processRow(tableLines[0]);
        
        // Skip processing if header is incomplete in this chunk
        if (headers.length === 0) return { markdown: null, data: null };

        const rows = tableLines
            .slice(2)
            .map(processRow)
            .filter(row => row.length > 0); // Only process non-empty rows

        // If we have no complete rows yet, wait for more data
        if (rows.length === 0) return { markdown: null, data: null };

        // Convert to normalized data
        const normalizedData = rows.map(row => {
            const rowData: { [key: string]: string } = {};
            headers.forEach((header, index) => {
                // Only assign if we have a corresponding cell, otherwise empty string
                rowData[header] = index < row.length ? row[index] : '';
            });
            return rowData;
        });

        return { 
            markdown: { headers, rows },
            data: normalizedData 
        };
    } catch (error) {
        // Silently fail for streaming case - we'll try again with more data
        return { markdown: null, data: null };
    }
};

// // Example usage in a streaming context
// let buffer = '';

// function processStreamChunk(chunk: string) {
//     buffer += chunk;
//     const result = parseMarkdownTable(buffer);
    
//     if (result.markdown && result.data) {
//         console.log('Parsed table:', result);
//         // Optionally clear buffer if you only want to process each table once
//         // buffer = '';
//     }
// }

// // Simulating streaming chunks
// const chunks = [
//     '| Name | Age | City |\n',
//     '|------|-----|------|\n',
//     '| John | 25  | NY    |\n',
//     '| Jane | 30  | LA    |\n'
// ];

// chunks.forEach(chunk => processStreamChunk(chunk));