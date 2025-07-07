import { MarkdownTableData } from "@/components/mardown-display/types";

type NormalizedTableData = Array<{ [key: string]: string }>;

/*
- Example Input:

```markdown
| **Name** | Age |
| --- | --- |
| *Alice* | 25 |
| Bob |  |
```

- Example Output:

```json
{
  "markdown": {
    "headers": ["**Name**", "Age"],
    "rows": [["*Alice*", "25"], ["Bob", ""]]
  },
  "data": [
    { "Name": "Alice", "Age": "25" },
    { "Name": "Bob", "Age": "" }
  ]
}
```
*/

export const parseMarkdownTable = (
    content: string,
    isStreamActive: boolean = false
): {
    markdown: MarkdownTableData | null;
    data: NormalizedTableData | null;
} => {
    try {
        const lines = content.split("\n").filter((line) => line.trim().length > 0);

        const tableStartIndex = lines.findIndex((line) => line.trim().startsWith("|"));
        if (tableStartIndex === -1) return { markdown: null, data: null };

        const tableLines = lines.slice(tableStartIndex);
        if (tableLines.length < 3) return { markdown: null, data: null };

        // More robust separator validation
        const separatorLine = tableLines[1].trim();
        if (!separatorLine.includes("-") || !separatorLine.match(/^\|[-:\s|]+\|?$/)) {
            // Only log during development and not during streaming to reduce noise
            if (!isStreamActive && process.env.NODE_ENV === 'development') {
                console.warn("Invalid table separator format:", separatorLine);
            }
            return { markdown: null, data: null };
        }

        // Process rows, preserving empty cells
        const processRow = (line: string) => {
            const cells = line.split("|").map((cell) => cell.trim());
            // Remove the first and last empty elements (from leading/trailing |)
            if (cells.length > 0 && cells[0] === "") cells.shift();
            if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
            return cells;
        };

        const headers = processRow(tableLines[0]);
        if (headers.length === 0) return { markdown: null, data: null };

        const rows = tableLines
            .slice(2)
            .map(processRow)
            .filter((row) => row.some((cell) => cell.length > 0)); // Only filter completely empty rows

        if (rows.length === 0) return { markdown: null, data: null };

        // Light validation for table structure - don't be too aggressive during streaming
        const hasValidStructure = rows.every(row => 
            row.length > 0 && row.length <= Math.max(headers.length * 2, 10) // Allow flexibility
        );
        
        if (!hasValidStructure) {
            if (!isStreamActive && process.env.NODE_ENV === 'development') {
                console.warn("Table structure validation failed - inconsistent row lengths");
            }
            return { markdown: null, data: null };
        }

        // Clean markdown formatting for normalized data only
        const cleanText = (text: string) => {
            return text
                .replace(/\*\*([^*]+)\*\*/g, "$1")
                .replace(/\*([^*]+)\*/g, "$1")
                .replace(/_([^_]+)_/g, "$1")
                .replace(/`([^`]+)`/g, "$1")
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
                .replace(/#{1,6}\s*/g, "")
                .trim();
        };

        // Convert to normalized data with cleaned text
        const normalizedData = rows.map((row) => {
            const rowData: { [key: string]: string } = {};
            headers.forEach((header, index) => {
                const cleanHeader = cleanText(header);
                rowData[cleanHeader] = index < row.length ? cleanText(row[index]) : "";
            });
            return rowData;
        });

        return {
            markdown: { headers, rows }, // Keep original markdown with empty cells
            data: normalizedData, // Cleaned version with proper alignment
        };
    } catch (error) {
        return { markdown: null, data: null };
    }
};



export const parseMarkdownTables = (
    content: string
): Array<{
    markdown: MarkdownTableData | null;
    data: NormalizedTableData | null;
    startIndex: number;
}> => {
    try {
        const lines = content.split("\n");
        const tables: Array<{
            markdown: MarkdownTableData | null;
            data: NormalizedTableData | null;
            startIndex: number;
        }> = [];

        let currentIndex = 0;
        while (currentIndex < lines.length) {
            // Find the start of a table
            const tableStartIndex = lines
                .slice(currentIndex)
                .findIndex((line) => line.trim().startsWith("|"));
            if (tableStartIndex === -1) break;

            // Adjust the global index
            const globalStartIndex = currentIndex + tableStartIndex;
            const tableLines = lines.slice(globalStartIndex);
            if (tableLines.length < 3) {
                currentIndex = globalStartIndex + 1;
                continue;
            }

            if (!tableLines[1].includes("-")) {
                currentIndex = globalStartIndex + 1;
                continue;
            }

            // Process rows, preserving empty cells
            const processRow = (line: string) => {
                const cells = line.split("|").map((cell) => cell.trim());
                if (cells.length > 0 && cells[0] === "") cells.shift();
                if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
                return cells;
            };

            const headers = processRow(tableLines[0]);
            if (headers.length === 0) {
                currentIndex = globalStartIndex + 1;
                continue;
            }

            const rows = tableLines
                .slice(2)
                .map(processRow)
                .filter((row) => row.some((cell) => cell.length > 0));

            // Stop processing this table when a non-table line is encountered
            const tableEndIndex = tableLines.findIndex((line, i) => i >= 2 && !line.trim().startsWith("|"));
            const tableLength = tableEndIndex === -1 ? tableLines.length : tableEndIndex + 2;

            if (rows.length === 0) {
                currentIndex = globalStartIndex + tableLength;
                continue;
            }

            // Clean markdown formatting for normalized data
            const cleanText = (text: string) => {
                return text
                    .replace(/\*\*([^*]+)\*\*/g, "$1")
                    .replace(/\*([^*]+)\*/g, "$1")
                    .replace(/_([^_]+)_/g, "$1")
                    .replace(/`([^`]+)`/g, "$1")
                    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
                    .replace(/#{1,6}\s*/g, "")
                    .trim();
            };

            // Convert to normalized data
            const normalizedData = rows.map((row) => {
                const rowData: { [key: string]: string } = {};
                headers.forEach((header, index) => {
                    const cleanHeader = cleanText(header);
                    rowData[cleanHeader] = index < row.length ? cleanText(row[index]) : "";
                });
                return rowData;
            });

            tables.push({
                markdown: { headers, rows },
                data: normalizedData,
                startIndex: globalStartIndex,
            });

            // Move to the end of the current table
            currentIndex = globalStartIndex + tableLength;
        }

        return tables;
    } catch (error) {
        return [];
    }
};