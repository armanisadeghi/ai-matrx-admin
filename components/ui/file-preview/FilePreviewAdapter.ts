// FilePreviewAdapter.ts
import { EnhancedFileDetails } from "@/utils/file-operations/constants";

// The format expected by existing preview components
export interface NodeStructure {
  path: string;
  type: string | 'FOLDER';
  bucketName: string;
  name: string;
  contentType: 'FOLDER' | 'FILE' | 'BUCKET';
  extension: string | 'FOLDER';
  isEmpty: boolean; // false for files
  children?: NodeStructure[];
  metadata?: any;
  details?: any;
}

/**
 * Adapts our current file structure to the NodeStructure format
 * expected by existing preview components
 */
export const adaptFileToNodeStructure = (
  file: {
    url: string;
    type: string;
    details?: EnhancedFileDetails;
    blob?: Blob | null;
  }
): NodeStructure => {
  const details = file.details;
  
  return {
    path: details.path || file.url,
    type: details.category || 'FILE',
    bucketName: details.bucket || 'default',
    name: details.filename || 'File',
    contentType: 'FILE',
    extension: details.extension || '',
    isEmpty: false,
    metadata: {
      contentType: file.type || details.mimetype,
      size: details.size,
      timeCreated: new Date().toISOString(),
      updated: new Date().toISOString(),
      // Add more metadata as needed
    },
    details: {
      ...details,
      blob: file.blob,
      url: file.url
    }
  };
};

/**
 * Determines which preview component to use based on file details
 */
export const getPreviewComponentType = (
  file: {
    url: string;
    type: string;
    details?: EnhancedFileDetails;
  }
): string => {
  const category = file.details?.category || 'UNKNOWN';
  const extension = file.details?.extension?.toLowerCase() || '';
  const mimeType = file.details?.mimetype || file.type || '';
  
  // Map file types to preview component names
  if (category === 'AUDIO') return 'AudioPreview';
  if (category === 'VIDEO') return 'VideoPreview';
  if (category === 'IMAGE') return 'ImagePreview';
  
  if (category === 'DATA') {
    if (extension === 'csv') return 'CSVPreview';
    if (['xlsx', 'xls'].includes(extension)) return 'SpreadsheetPreview';
    if (extension === 'json') return 'JSONPreview';
    return 'DataPreview';
  }
  
  if (category === 'DOCUMENT') {
    if (extension === 'pdf') return 'PDFPreview';
    if (extension === 'txt' || mimeType.includes('text/')) return 'TextPreview';
    return 'DocumentPreview';
  }
  
  if (category === 'CODE') return 'CodePreview';
  
  return 'GenericPreview';
};