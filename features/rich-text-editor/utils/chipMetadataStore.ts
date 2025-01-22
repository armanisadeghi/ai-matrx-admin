// /**
//  * Format for storing content with metadata in a single text field:
//  * ---CONTENT_START---
//  * actual content here with {uuids}! intact
//  * ---CONTENT_END---
//  * ---METADATA_START---
//  * {
//  *   "chips": {
//  *     "uuid": {
//  *       "color": "#fff",
//  *       "label": "Example",
//  *       "brokerId": "broker-123",
//  *       "stringValue": "multiline\nvalue\nhere"
//  *     }
//  *   }
//  * }
//  * ---METADATA_END---
//  */

// import { ChipData } from "../types/editor.types";

// export interface ContentWithMetadata {
//     content: string;
//     metadata: {
//         chips: {
//             [key: string]: ChipData;
//         };
//     };
// }

// // Utility functions for encoding/decoding
// export const encodeForStorage = (data: ContentWithMetadata): string => {
//     return [
//         '---CONTENT_START---',
//         data.content,
//         '---CONTENT_END---',
//         '---METADATA_START---',
//         JSON.stringify(data.metadata),
//         '---METADATA_END---'
//     ].join('\n');
// };

// export const decodeFromStorage = (stored: string): ContentWithMetadata | null => {
//     try {
//         const contentMatch = stored.match(/---CONTENT_START---\n([\s\S]*?)\n---CONTENT_END---/);
//         const metadataMatch = stored.match(/---METADATA_START---\n([\s\S]*?)\n---METADATA_END---/);
        
//         if (!contentMatch || !metadataMatch) return null;
        
//         return {
//             content: contentMatch[1],
//             metadata: JSON.parse(metadataMatch[1])
//         };
//     } catch (e) {
//         console.error('Error decoding stored content:', e);
//         return null;
//     }
// };