'use client';

import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import type {
    UseScreenshotOptions,
    UseScreenshotReturn,
    ScreenshotMetadata,
    ProcessedScreenshotData,
    ImageDataForAPI
} from '@/types/screenshot';
import { compressImage, generateThumbnail } from '@/utils/image/imageCompression';

export const useScreenshot = (options: UseScreenshotOptions = {}): UseScreenshotReturn => {
    const {
        quality = 0.95,
        format = 'image/png',
        excludeSelectors = [],
        autoCompress = true
    } = options;

    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [lastCapture, setLastCapture] = useState<ProcessedScreenshotData | null>(null);

    const getMetadata = (): ScreenshotMetadata => ({
        timestamp: new Date().toISOString(),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        pathName: window.location.pathname,
        url: window.location.href
    });

    const processScreenshot = async (
        originalImage: string,
        metadata: ScreenshotMetadata
    ): Promise<ProcessedScreenshotData> => {
        try {
            const [compressed, thumbnail] = await Promise.all([
                compressImage(originalImage, {
                    maxWidth: 1920,
                    maxHeight: 1080,
                    quality: 0.8,
                    type: 'image/jpeg'
                }),
                generateThumbnail(originalImage)
            ]);

            const base64Data = originalImage.replace(/^data:image\/\w+;base64,/, '');
            const mimeTypeMatch = originalImage.match(/^data:(image\/\w+);base64,/);
            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';

            const imageDataForAPI: ImageDataForAPI = {
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: base64Data,
                },
            };

            return {
                fullSize: originalImage,
                compressed,
                thumbnail,
                metadata,
                imageDataForAPI
            };
        } catch (error) {
            console.error('Error processing screenshot:', error);
            const base64Data = originalImage.replace(/^data:image\/\w+;base64,/, '');
            const mimeTypeMatch = originalImage.match(/^data:(image\/\w+);base64,/);
            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';

            const imageDataForAPI: ImageDataForAPI = {
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: base64Data,
                },
            };

            return {
                fullSize: originalImage,
                compressed: originalImage,
                thumbnail: originalImage,
                metadata,
                imageDataForAPI
            };
        }
    };

    const hideExcludedElements = () => {
        const elements = excludeSelectors.flatMap(selector =>
            Array.from(document.querySelectorAll<HTMLElement>(selector))
        );
        const originalVisibilities = elements.map(el => el.style.visibility);
        elements.forEach(el => {
            el.style.visibility = 'hidden';
        });
        return { elements, originalVisibilities };
    };

    const showExcludedElements = (elements: HTMLElement[], originalVisibilities: string[]) => {
        elements.forEach((el, index) => {
            el.style.visibility = originalVisibilities[index];
        });
    };

    const captureScreen = useCallback(async (): Promise<ProcessedScreenshotData> => {
        try {
            setIsCapturing(true);
            setError(null);

            const { elements, originalVisibilities } = hideExcludedElements();

            const canvas = await html2canvas(document.body, {
                logging: false,
                useCORS: true,
                allowTaint: false,
                scale: window.devicePixelRatio,
            });

            showExcludedElements(elements, originalVisibilities);

            const rawImageData = canvas.toDataURL(format, quality);
            const metadata = getMetadata();

            const processedData = await processScreenshot(rawImageData, metadata);
            setLastCapture(processedData);
            return processedData;

        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to capture screenshot');
            setError(error);
            throw error;
        } finally {
            setIsCapturing(false);
        }
    }, [quality, format, excludeSelectors]);

    return {
        captureScreen,
        isCapturing,
        error,
        lastCapture
    };
};
