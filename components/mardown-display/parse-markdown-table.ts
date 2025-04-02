import {MarkdownTableData} from "./types";

// Define a new type for the normalized data
type NormalizedTableData = Array<{ [key: string]: string }>;

export const parseMarkdownTable = (content: string): { 
    markdown: MarkdownTableData | null,
    data: NormalizedTableData | null 
} => {
    try {
        const lines = content.split('\n');
        const tableStartIndex = lines.findIndex(line => line.trim().startsWith('|'));
        if (tableStartIndex === -1) return { markdown: null, data: null };

        // Find table end index
        let tableEndIndex = tableStartIndex;
        while (tableEndIndex < lines.length && lines[tableEndIndex].trim().startsWith('|')) {
            tableEndIndex++;
        }

        // Extract table lines
        const tableLines = lines
            .slice(tableStartIndex, tableEndIndex)
            .filter(line => line.trim().length > 0);

        if (tableLines.length < 3) return { markdown: null, data: null };

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

        // Convert to normalized data
        const normalizedData = rows.map(row => {
            const rowData: { [key: string]: string } = {};
            headers.forEach((header, index) => {
                rowData[header] = row[index] || ''; // Use empty string if cell is undefined
            });
            return rowData;
        });

        return { 
            markdown: { headers, rows },
            data: normalizedData 
        };
    } catch (error) {
        console.error('Error parsing markdown table:', error);
        return { markdown: null, data: null };
    }
};

// // Example usage:
// const markdown = `
// | Name | Age | City |
// |------|-----|------|
// | John | 25  | NY   |
// | Jane | 30  | LA   |
// `;

// const result = parseMarkdownTable(markdown);
// console.log(result.data);
// /* Output:
// [
//     { "Name": "John", "Age": "25", "City": "NY" },
//     { "Name": "Jane", "Age": "30", "City": "LA" }
// ]
// */