"use client";

import { ViewId, resolveView } from "./view-registry";

interface ViewRendererProps {
    requestedViewId?: ViewId;
    availableViews: ViewId[];
    defaultViewId: ViewId;
    data: any;
    coordinatorId?: string;
    className?: string;
    isLoading?: boolean;
}

/**
 * Centralized component for handling view resolution and rendering
 * Encapsulates all the view resolution logic in one place
 */
export const ViewRenderer = ({
    requestedViewId,
    availableViews,
    defaultViewId,
    data,
    coordinatorId,
    className = "",
    isLoading = false
}: ViewRendererProps) => {
    
    // Make sure defaultViewId is one of the availableViews
    let finalViewId = requestedViewId || defaultViewId;
    if (!availableViews.includes(finalViewId)) {
        console.warn(`Requested view ${finalViewId} not in available views. Falling back to first available view.`);
        finalViewId = availableViews.length > 0 ? availableViews[0] : "dynamic";
    }
    
    const { component: ViewComponent, resolvedViewId } = resolveView(
        finalViewId,
        availableViews,
        defaultViewId
    );

    if (!ViewComponent) {
        return (
            <div className={`text-red-600 dark:text-red-400 ${className}`}>
                View not found: {resolvedViewId}
                {coordinatorId && ` for coordinator: ${coordinatorId}`}
            </div>
        );
    }

    return (
        <div className={className}>
            <ViewComponent data={data} isLoading={isLoading} />
        </div>
    );
};

export default ViewRenderer; 