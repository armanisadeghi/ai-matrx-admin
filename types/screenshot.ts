// types/screenshot.ts

export type ImageQuality = 'full' | 'compressed' | 'thumbnail';

export interface ScreenshotData {
    fullSize: string;
    compressed: string;
    thumbnail: string;
    metadata: ScreenshotMetadata;
    imageDataForAPI: ImageDataForAPI;
}

export interface ScreenshotMetadata {
    timestamp: string;
    viewportWidth: number;
    viewportHeight: number;
    pathName: string;
    url: string;
}

export interface ProcessedScreenshotData {
    fullSize: string;
    compressed: string;
    thumbnail: string;
    metadata: ScreenshotMetadata;
    imageDataForAPI: ImageDataForAPI;
}

export interface UseScreenshotOptions {
    quality?: number;
    format?: string;
    excludeSelectors?: string[];
    autoCompress?: boolean;
}

export interface UseScreenshotReturn {
    captureScreen: () => Promise<ProcessedScreenshotData>;
    isCapturing: boolean;
    error: Error | null;
    lastCapture: ProcessedScreenshotData | null;
}

export interface ImageDataForAPI {
    type: 'image';
    source: {
        type: 'base64';
        media_type: string;
        data: string;
    };
}
