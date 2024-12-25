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
    
    return Object.values(contents.files).map(file => ({
      name: file.name.split('/').pop() || file.name,  // Get just the filename
      size: parseInt(file.uncompressedSize?.toString() || '0'),
      path: file.name,
      isDirectory: file.dir || false
    }));
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