// types/contextCollection.ts

import type { ScreenshotData } from './screenshot';

export interface PageElementContext {
    selector: string;
    text?: string;
    role?: string;
    ariaLabel?: string;
    isVisible: boolean;
    boundingBox?: {
        top: number;
        left: number;
        width: number;
        height: number;
    };
}

export interface UserInteractionContext {
    lastClicked?: {
        selector: string;
        timestamp: string;
        text?: string;
    };
    lastHovered?: {
        selector: string;
        timestamp: string;
        text?: string;
    };
    currentFocus?: string;
    scrollPosition: {
        x: number;
        y: number;
        maxScroll: number;
    };
}

export interface PageContext {
    title: string;
    url: string;
    route: string;
    breadcrumbs: string[];
    activeModals: string[];
    activeDrawers: string[];
    currentSection?: string;
}

export interface AIHelpContext {
    screenshot: ScreenshotData;
    page: PageContext;
    userInteraction: UserInteractionContext;
    relevantElements: PageElementContext[];
    helpDocuments?: Record<string, string>;
    timestamp: string;
}
