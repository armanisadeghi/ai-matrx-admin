/**
 * useResourceMessageFormatter Hook
 * 
 * Hook for formatting messages with resources.
 * Handles data fetching, XML formatting, and settings extraction.
 */

import { useState, useCallback } from 'react';
import { Resource } from '../types/resources';
import { fetchResourcesData } from '../utils/resource-data-fetcher';
import { appendResourcesToMessage, formatResourcesToXml, extractSettingsAttachments } from '../utils/resource-formatting';

interface UseResourceMessageFormatterResult {
    /**
     * Format a message with resources
     * This fetches any needed data and returns the formatted message with XML
     */
    formatMessageWithResources: (messageContent: string, resources: Resource[]) => Promise<{
        formattedMessage: string;
        settingsAttachments: {
            imageUrls?: string[];
            fileUrls?: string[];
            youtubeUrls?: string[];
            audioFiles?: string[];
        };
    }>;
    
    /**
     * Check if currently formatting
     */
    isFormatting: boolean;
}

/**
 * Hook for formatting messages with resources
 */
export function useResourceMessageFormatter(): UseResourceMessageFormatterResult {
    const [isFormatting, setIsFormatting] = useState(false);
    
    const formatMessageWithResources = useCallback(async (
        messageContent: string, 
        resources: Resource[]
    ) => {
        setIsFormatting(true);
        
        try {
            // If no resources, return message as-is
            if (!resources || resources.length === 0) {
                return {
                    formattedMessage: messageContent,
                    settingsAttachments: {},
                };
            }
            
            // Step 1: Fetch any data needed for resources (e.g., table data)
            const enrichedResources = await fetchResourcesData(resources);
            
            // Step 2: Format resources to XML
            const resourcesXml = formatResourcesToXml(enrichedResources);
            
            // Step 3: Append resources to message
            const formattedMessage = appendResourcesToMessage(messageContent, resourcesXml);
            
            // Step 4: Extract settings attachments
            const settingsAttachments = extractSettingsAttachments(enrichedResources);
            
            return {
                formattedMessage,
                settingsAttachments,
            };
        } finally {
            setIsFormatting(false);
        }
    }, []);
    
    return {
        formatMessageWithResources,
        isFormatting,
    };
}

