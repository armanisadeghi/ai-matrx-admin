// utils/zipUtils.ts
'use client';

import JSZip from 'jszip';

export type ZipEntry = {
  name: string;
  size: number;
  path: string;
  isDirectory: boolean;
};

export async function getZipContents(data: Blob | Buffer): Promise<ZipEntry[]> {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(data);
    const entries: ZipEntry[] = [];

    // Use forEach to access file properties
    contents.forEach((path, file) => {
      // Get file details through the async API
      if (!file.dir) {
        entries.push({
          name: path.split('/').pop() || path,
          path,
          isDirectory: file.dir,
          // Use a type assertion here since we know this is internal to JSZip
          size: (file as any)._data?.uncompressedSize || 0
        });
      }
    });

    // Sort entries: directories first, then files
    return entries.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) {
        return a.name.localeCompare(b.name);
      }
      return a.isDirectory ? -1 : 1;
    });
  } catch (error) {
    console.error('Error processing zip file:', error);
    throw new Error('Failed to process zip file');
  }
}

export async function extractZipEntry(
  zipData: Blob | Buffer,
  entryPath: string
): Promise<Blob | null> {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipData);
    const file = contents.files[entryPath];
    
    if (!file || file.dir) {
      return null;
    }

    const blob = await file.async('blob');
    return blob;
  } catch (error) {
    console.error('Error extracting zip entry:', error);
    throw new Error('Failed to extract file from zip');
  }
}