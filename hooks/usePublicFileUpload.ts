// hooks/usePublicFileUpload.ts
// Standalone file upload hook for public routes - no Redux dependency

import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface PublicUploadResult {
    url: string;
    filename: string;
    size: number;
    type: string;
}

interface UsePublicFileUploadOptions {
    bucket?: string;
    path?: string;
    maxSizeMB?: number;
    allowedTypes?: string[];
}

interface UsePublicFileUploadReturn {
    uploadFile: (file: File) => Promise<PublicUploadResult | null>;
    uploadFiles: (files: File[]) => Promise<PublicUploadResult[]>;
    isUploading: boolean;
    error: string | null;
    clearError: () => void;
}

/**
 * Standalone hook for uploading files to a public Supabase bucket.
 * Does NOT require Redux or authentication.
 * 
 * @example
 * ```tsx
 * const { uploadFile, isUploading, error } = usePublicFileUpload();
 * 
 * const handlePaste = async (file: File) => {
 *   const result = await uploadFile(file);
 *   if (result) {
 *     console.log('Uploaded:', result.url);
 *   }
 * };
 * ```
 */
export function usePublicFileUpload(options: UsePublicFileUploadOptions = {}): UsePublicFileUploadReturn {
    const {
        bucket = 'public-chat-uploads',
        path = 'uploads',
        maxSizeMB = 10,
        allowedTypes,
    } = options;

    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => setError(null), []);

    const validateFile = useCallback((file: File): string | null => {
        // Check file size
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
            return `File size exceeds ${maxSizeMB}MB limit`;
        }

        // Check file type if restrictions are specified
        if (allowedTypes && allowedTypes.length > 0) {
            const isAllowed = allowedTypes.some(type => {
                if (type.endsWith('/*')) {
                    // Handle wildcard types like 'image/*'
                    const category = type.replace('/*', '');
                    return file.type.startsWith(category);
                }
                return file.type === type;
            });

            if (!isAllowed) {
                return `File type ${file.type} is not allowed`;
            }
        }

        return null;
    }, [maxSizeMB, allowedTypes]);

    const uploadFile = useCallback(async (file: File): Promise<PublicUploadResult | null> => {
        setError(null);

        // Validate file
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            return null;
        }

        setIsUploading(true);

        try {
            const supabase = createClient();

            // Generate unique filename with timestamp
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 8);
            const extension = file.name.split('.').pop() || '';
            const filename = `${timestamp}-${randomId}.${extension}`;
            const filePath = path ? `${path}/${filename}` : filename;

            // Upload to public bucket
            const { data, error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                throw new Error(uploadError.message);
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);

            return {
                url: urlData.publicUrl,
                filename: file.name,
                size: file.size,
                type: file.type,
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            setError(message);
            console.error('Public upload error:', err);
            return null;
        } finally {
            setIsUploading(false);
        }
    }, [bucket, path, validateFile]);

    const uploadFiles = useCallback(async (files: File[]): Promise<PublicUploadResult[]> => {
        setError(null);
        setIsUploading(true);

        const results: PublicUploadResult[] = [];

        try {
            for (const file of files) {
                const result = await uploadFile(file);
                if (result) {
                    results.push(result);
                }
            }
        } finally {
            setIsUploading(false);
        }

        return results;
    }, [uploadFile]);

    return {
        uploadFile,
        uploadFiles,
        isUploading,
        error,
        clearError,
    };
}

export default usePublicFileUpload;
