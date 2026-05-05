'use client';
import { useCallback, useRef } from 'react';
import { useAppDispatch } from '@/lib/redux/hooks';
import { addToQueue, updateQueueItem } from '../../redux/imageSlice';
import { compressImage } from '@/utils/image/imageCompression';
import { CloudFolders, resolveDefaultVisibility } from '@/features/files/utils/folder-conventions';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from '../../constants';
import { toast } from 'sonner';
import type { CaptureResult, UploadQueueItem } from '../../types';

interface UseImageCaptureOptions {
  folderPath?: string;
  visibility?: 'public' | 'private' | 'shared';
  onCaptured?: (result: CaptureResult) => void;
  onUploaded?: (item: UploadQueueItem) => void;
}

/**
 * Reads a File into a data URL string.
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a data URL back into a File, preserving the original filename and
 * deriving the mime-type from the data URL prefix.
 */
function dataUrlToFile(dataUrl: string, name: string): File {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], name, { type: mime });
}

/**
 * Loads an Image element from a data URL and resolves with its natural
 * width/height.
 */
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image for dimension check'));
    img.src = dataUrl;
  });
}

export function useImageCapture({
  folderPath = CloudFolders.IMAGES_SCREENSHOTS,
  visibility,
  onCaptured,
  onUploaded,
}: UseImageCaptureOptions = {}) {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`Unsupported file type: ${file.type}`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        toast.error(`File exceeds ${MAX_IMAGE_SIZE_MB}MB limit`);
        return;
      }

      const id = crypto.randomUUID();
      const item: UploadQueueItem = { id, file, progress: 0, status: 'uploading' };
      dispatch(addToQueue(item));

      try {
        // compressImage accepts a data URL string and returns a compressed data URL string
        const rawDataUrl = await fileToDataUrl(file);
        const compressedDataUrl = await compressImage(rawDataUrl);

        // Reconstruct a File from the compressed data URL for uploading / CaptureResult
        const compressedFile = dataUrlToFile(compressedDataUrl, file.name);

        const { width, height } = await getImageDimensions(compressedDataUrl);

        onCaptured?.({ file: compressedFile, dataUrl: compressedDataUrl, width, height });

        const form = new FormData();
        form.append('file', compressedFile, file.name);
        form.append('folder', folderPath);
        form.append('visibility', visibility ?? resolveDefaultVisibility(folderPath));

        const res = await fetch('/api/images/upload', { method: 'POST', body: form });
        if (!res.ok) throw new Error(await res.text());

        dispatch(updateQueueItem({ id, status: 'done', progress: 100 }));
        onUploaded?.({ ...item, status: 'done', progress: 100 });
        toast.success('Image saved');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        dispatch(updateQueueItem({ id, status: 'error', error: msg }));
        toast.error(msg);
      }
    },
    [dispatch, folderPath, visibility, onCaptured, onUploaded],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((i) => i.type.startsWith('image/'));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      files.forEach(processFile);
    },
    [processFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      files.forEach(processFile);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [processFile],
  );

  const openPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return { fileInputRef, handlePaste, handleDrop, handleFileInput, openPicker, processFile };
}
