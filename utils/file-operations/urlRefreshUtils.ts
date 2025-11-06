/**
 * URL Refresh Utilities
 * 
 * Handles automatic detection and refresh of expired signed URLs.
 * Provides multiple layers of protection to ensure file access always works.
 */

import FileSystemManager from "./FileSystemManager";
import { AvailableBuckets } from "@/lib/redux/fileSystem/types";

export interface URLMetadata {
    url: string;
    bucket?: string;
    path?: string;
    expiresAt?: Date;
    isPublic?: boolean;
}

export interface RefreshOptions {
    expiresIn?: number; // Seconds, default 3600 (1 hour)
    maxRetries?: number; // Max number of refresh attempts, default 3
}

/**
 * Check if a URL has expired or is about to expire
 */
export function isUrlExpired(urlMetadata: URLMetadata, bufferSeconds: number = 60): boolean {
    // If we don't have expiration info, assume it might be expired
    if (!urlMetadata.expiresAt) {
        return false; // Can't determine, let the caller try to use it
    }

    const now = new Date();
    const expiresAt = new Date(urlMetadata.expiresAt);
    const bufferTime = bufferSeconds * 1000;

    // Consider expired if within buffer window
    return (expiresAt.getTime() - now.getTime()) < bufferTime;
}

/**
 * Check if an error indicates an expired or inaccessible URL
 */
export function isUrlAccessError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorLower = errorMessage.toLowerCase();

    // Common error patterns for expired/inaccessible URLs
    return (
        errorLower.includes('403') ||
        errorLower.includes('forbidden') ||
        errorLower.includes('expired') ||
        errorLower.includes('invalid') ||
        errorLower.includes('401') ||
        errorLower.includes('unauthorized') ||
        errorLower.includes('not found') ||
        errorLower.includes('404')
    );
}

/**
 * Refresh a file URL using the FileSystemManager
 */
export async function refreshFileUrl(
    bucket: string,
    storagePath: string,
    options: RefreshOptions = {}
): Promise<URLMetadata> {
    const { expiresIn = 3600 } = options;

    const fileSystemManager = FileSystemManager.getInstance();
    
    try {
        const urlResult = await fileSystemManager.getFileUrl(
            bucket as AvailableBuckets,
            storagePath,
            { expiresIn }
        );

        return {
            url: urlResult.url,
            bucket,
            path: storagePath,
            expiresAt: urlResult.expiresAt,
            isPublic: urlResult.isPublic
        };
    } catch (error) {
        console.error('Error refreshing file URL:', error);
        throw new Error(`Failed to refresh URL for ${bucket}/${storagePath}`);
    }
}

/**
 * Attempt to fetch a file with automatic URL refresh on failure
 * This is the main function that provides resilient file access
 */
export async function fetchWithUrlRefresh(
    urlMetadata: URLMetadata,
    options: RefreshOptions = {}
): Promise<{
    blob: Blob;
    url: string;
    refreshed: boolean;
}> {
    const { maxRetries = 3 } = options;
    let currentUrl = urlMetadata.url;
    let attempts = 0;
    let refreshed = false;

    while (attempts < maxRetries) {
        try {
            // Check if URL is expired before attempting fetch
            if (attempts > 0 || isUrlExpired(urlMetadata)) {
                // Need to refresh the URL
                if (!urlMetadata.bucket || !urlMetadata.path) {
                    throw new Error('Cannot refresh URL: missing bucket or path information');
                }

                console.log(`Refreshing URL for ${urlMetadata.bucket}/${urlMetadata.path} (attempt ${attempts + 1})`);
                const refreshedMetadata = await refreshFileUrl(
                    urlMetadata.bucket,
                    urlMetadata.path,
                    options
                );
                currentUrl = refreshedMetadata.url;
                urlMetadata.expiresAt = refreshedMetadata.expiresAt;
                refreshed = true;
            }

            // Attempt to fetch the file
            const response = await fetch(currentUrl);
            
            if (!response.ok) {
                const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMsg);
            }

            const blob = await response.blob();
            return { blob, url: currentUrl, refreshed };

        } catch (error) {
            attempts++;
            
            // Check if this is a URL access error that might be fixed by refreshing
            if (isUrlAccessError(error)) {
                if (attempts < maxRetries) {
                    console.log(`URL access error detected, attempting refresh (${attempts}/${maxRetries})`);
                    continue; // Try again with a refreshed URL
                }
            }

            // If we've exhausted retries or it's not a URL error, throw
            if (attempts >= maxRetries) {
                throw error;
            }
        }
    }

    throw new Error('Failed to fetch file after maximum retries');
}

/**
 * Create URLMetadata from file details
 */
export function createUrlMetadata(
    url: string,
    bucket?: string,
    path?: string,
    expiresAt?: Date | string,
    isPublic?: boolean
): URLMetadata {
    return {
        url,
        bucket,
        path,
        expiresAt: expiresAt ? (typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt) : undefined,
        isPublic
    };
}

/**
 * Parse expiration time from a Supabase signed URL (if possible)
 * This is a fallback method when expiresAt is not provided
 */
export function parseExpirationFromUrl(url: string): Date | undefined {
    try {
        const urlObj = new URL(url);
        const expiresParam = urlObj.searchParams.get('Expires');
        
        if (expiresParam) {
            // Supabase uses Unix timestamp in Expires parameter
            const expiresTimestamp = parseInt(expiresParam, 10);
            if (!isNaN(expiresTimestamp)) {
                return new Date(expiresTimestamp * 1000);
            }
        }
    } catch (error) {
        console.debug('Could not parse expiration from URL:', error);
    }
    
    return undefined;
}

