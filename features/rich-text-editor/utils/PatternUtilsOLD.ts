// import {DisplayMode, encodeMatrxMetadata, MatrxMetadata, Message} from './patternUtils'


// export const MATRX_PATTERN_OLD = /\{([^}]+)}!/g;


// // Parse a single MATRX pattern into its metadata components
// export const parseMatrxMetadata_OLD = (content: string): MatrxMetadata => {
//     const parts = content.split('|');
//     const metadata: MatrxMetadata = {};

//     parts.forEach((part) => {
//         const match = part.match(/^([^:]+):"([^"]*)"$/) || part.match(/^([^:]+):([^"]*)$/);
//         if (match) {
//             const [, key, value] = match;
//             metadata[key] = value === 'undefined' ? '' : value;
//         }
//     });

//     return metadata;
// };

// export const transformMatrxText_OLD = (text: string, mode: DisplayMode): string => {
//     MATRX_PATTERN_OLD.lastIndex = 0;

//     return text.replace(MATRX_PATTERN_OLD, (fullMatch, content) => {
//         const metadata = parseMatrxMetadata_OLD(content);

//         switch (mode) {
//             case DisplayMode.ENCODED:
//                 console.log('ENCODED:', fullMatch);
//                 return fullMatch;

//             case DisplayMode.SIMPLE_ID:
//                 return metadata.id || fullMatch;

//             case DisplayMode.RECORD_KEY:
//                 return metadata.matrxRecordId || fullMatch;

//             case DisplayMode.NAME:
//                 return metadata.name || fullMatch;

//             case DisplayMode.DEFAULT_VALUE:
//                 return metadata.defaultValue || fullMatch;

//             default:
//                 return fullMatch;
//         }
//     });
// };



// export const transformEncodedToSimpleIdPattern_OLD = (text: string): string => {
//     MATRX_PATTERN_OLD.lastIndex = 0;
    
//     return text.replace(MATRX_PATTERN_OLD, (fullMatch, content) => {
//         const metadata = parseMatrxMetadata_OLD(content);
//         return metadata.id ? `{${metadata.id}}!` : fullMatch;
//     });
// };


// export const isMatrxNew_OLD = (metadata: MatrxMetadata): boolean => metadata.status === 'new';

// export const isMatrxActive_OLD = (metadata: MatrxMetadata): boolean => metadata.status === 'active';

// // Function to get metadata from text
// export const getMetadataFromText_OLD = (text: string): MatrxMetadata[] => {
//     MATRX_PATTERN_OLD.lastIndex = 0;
//     const matches = Array.from(text.matchAll(MATRX_PATTERN_OLD), (match) => match[1]);
//     return matches.map(parseMatrxMetadata_OLD);
// };

// export const getAllMetadata_OLD = (text?: string): MatrxMetadata[] => {
//     if (!text) {
//         return [];
//     }

//     const rawMetadata = getMetadataFromText_OLD(text);
//     const defaultMetadataKeys: MatrxMetadata = {
//         matrxRecordId: '',
//         id: '',
//         name: '',
//         defaultValue: '',
//         color: '',
//         status: '',
//         defaultComponent: '',
//         dataType: '',
//     };

//     return rawMetadata.map((metadata) => ({
//         ...defaultMetadataKeys,
//         ...metadata,
//     }));
// };

// export const getAllMatrxRecordIds_OLD = (text: string): string[] =>
//     getAllMetadata_OLD(text)
//         .map((metadata) => metadata.matrxRecordId)
//         .filter((id): id is string => Boolean(id));


// export const getAllMatrxRecordIdsFromMessages_OLD = (messages: Message[]): string[] => {
//     return messages
//         .map((message) => message.content || '') // Extract 'content', default to empty string
//         .flatMap((content) => getAllMatrxRecordIds_OLD(content)) // Use utility to get IDs from each content
//         .filter((id, index, self) => id && self.indexOf(id) === index); // Remove duplicates and falsy values
// };

// export const getNewMatrxRecordIdsFromMessages_OLD = (messages: Message[], currentIds: string[]): string[] => {
//     const allIdsFromMessages = messages
//         .map((message) => message.content || '') // Extract 'content', default to empty string
//         .flatMap((content) => getAllMatrxRecordIds_OLD(content)) // Use utility to get IDs from each content
//         .filter((id, index, self) => id && self.indexOf(id) === index); // Remove duplicates and falsy values
//     return allIdsFromMessages.filter((id) => !currentIds.includes(id));
// };


// export const getMetadataFromAllMessages_OLD = (messages: Message[]): MatrxMetadata[] => {
//     return messages
//         .map(message => message.content || '')
//         .flatMap(getAllMetadata_OLD);
// };

// export const getUniqueMetadataFromAllMessages_OLD = (messages: Message[]): MatrxMetadata[] => {
//     const allMetadata = getMetadataFromAllMessages_OLD(messages);
//     const uniqueMetadataMap = new Map(
//         allMetadata.map(metadata => [metadata.id, metadata])
//     );
    
//     return Array.from(uniqueMetadataMap.values());
// };





// export const encodeMatrxMetadata_OLD = (metadata: MatrxMetadata): string => {
//     const parts: string[] = [];

//     // Handle required fields first
//     if (metadata.matrxRecordId) {
//         parts.push(`matrxRecordId:${metadata.matrxRecordId}`);
//     }

//     if (metadata.id) {
//         parts.push(`id:${metadata.id}`);
//     }

//     // Handle optional fields with quotes for values that might contain special characters
//     if (metadata.name !== undefined) {
//         parts.push(`name:"${metadata.name}"`);
//     }

//     if (metadata.defaultValue !== undefined) {
//         parts.push(`defaultValue:"${metadata.defaultValue}"`);
//     }

//     if (metadata.color !== undefined) {
//         parts.push(`color:"${metadata.color}"`);
//     }

//     if (metadata.status !== undefined) {
//         parts.push(`status:"${metadata.status}"`);
//     }

//     if (metadata.defaultComponent !== undefined && metadata.defaultComponent !== '') {
//         parts.push(`defaultComponent:"${metadata.defaultComponent}"`);
//     }

//     if (metadata.dataType !== undefined && metadata.dataType !== '') {
//         parts.push(`dataType:"${metadata.dataType}"`);
//     }

//     return `{${parts.join('|')}}!`;
// };

// export const encodeMatrxMetadataArray_OLD = (metadataArray: MatrxMetadata[]): string => {
//     return metadataArray.map(encodeMatrxMetadata_OLD).join(' ');
// };

// // Helper function to insert encoded MATRX patterns into text with placeholders
// export const insertMatrxPatterns_OLD = (text: string, patterns: MatrxMetadata[]): string => {
//     let result = text;
//     patterns.forEach((pattern, index) => {
//         const placeholder = `[MATRX_PATTERN_OLD_${index}]`;
//         result = result.replace(placeholder, encodeMatrxMetadata_OLD(pattern));
//     });
//     return result;
// };

// export const convertOldMatrxToNew = (input: string | Message[]): string | Message[] => {
//     if (Array.isArray(input)) {
//         return input.map(message => ({
//             ...message,
//             content: convertOldMatrxToNew(message.content) as string,
//         }));
//     }

//     let updatedContent = input;
//     const metadataList = getAllMetadata_OLD(input);

//     metadataList.forEach(metadata => {
//         const oldPattern = new RegExp(`\\{([^}]+)}!`, 'g');
//         updatedContent = updatedContent.replace(oldPattern, (match, content) => {
//             const parsedMetadata = parseMatrxMetadata_OLD(content);
//             return encodeMatrxMetadata(parsedMetadata);
//         });
//     });

//     return updatedContent;
// };
