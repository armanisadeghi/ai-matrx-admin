import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';

interface UseSignedUrlResult {
    url: string | null;
    error: string | null;
    isLoading: boolean;
}

interface UseSignedUrlOptions {
    bucket?: string;
    expiresIn?: number; // seconds, default 3600 (1 hour)
    refreshThreshold?: number; // seconds, default 300 (5 minutes)
}

/**
 * Hook to get and auto-refresh a signed URL for a file in Supabase storage
 */
export function useSignedUrl(
    filePath: string | null | undefined,
    options: UseSignedUrlOptions = {}
): UseSignedUrlResult {
    const {
        bucket = 'user-private-assets',
        expiresIn = 3600,
        refreshThreshold = 300
    } = options;

    const [url, setUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Use refs to track timeouts/mounting to prevent memory leaks
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        // Reset state when filePath changes
        if (!filePath) {
            setUrl(null);
            setError(null);
            setIsLoading(false);
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
            return;
        }

        const fetchSignedUrl = async () => {
            // Clear existing timeout
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }

            if (!isMountedRef.current) return;

            setIsLoading(true);
            setError(null);

            try {
                // Ensure filePath doesn't have leading slash if bucket expects it that way?
                // Supabase usually handles it, but safer to be clean.
                // Assuming filePath is relative to bucket root.

                const { data, error: apiError } = await supabase
                    .storage
                    .from(bucket)
                    .createSignedUrl(filePath, expiresIn);

                if (apiError) throw apiError;

                if (isMountedRef.current) {
                    setUrl(data.signedUrl);

                    // Schedule refresh
                    // specific margin before expiration to refresh
                    const refreshTime = (expiresIn - refreshThreshold) * 1000;
                    // Ensure we don't refresh negative or too soon if short expiration (min 10s wait)
                    const safeRefreshTime = Math.max(10000, refreshTime);

                    refreshTimeoutRef.current = setTimeout(() => {
                        fetchSignedUrl();
                    }, safeRefreshTime);
                }
            } catch (err: any) {
                console.error('Error fetching signed URL:', err);
                if (isMountedRef.current) {
                    setError(err.message || 'Failed to generate signed URL');
                    setUrl(null);
                }
            } finally {
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
            }
        };

        fetchSignedUrl();

        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, [filePath, bucket, expiresIn, refreshThreshold]);

    return { url, error, isLoading };
}
