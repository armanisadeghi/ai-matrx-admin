"use client";

import { ViewId, getDefaultViewComponent, getViewComponent } from "./view-registry";
import { getDefaultViewId } from "../markdown-coordinator";

interface DefaultViewRendererProps {
    data: any;
    coordinatorId: string;
    className?: string;
    isLoading?: boolean;
}

export const DefaultViewRenderer = ({
    data,
    coordinatorId,
    className = "",
    isLoading = false
}: DefaultViewRendererProps) => {
    const ViewComponent = getDefaultViewComponent(coordinatorId);
    

    if (!ViewComponent) {
        return null;
    }

    return (
        <div className={className}>
            <ViewComponent data={data} isLoading={isLoading} />
        </div>
    );
};


interface DirectViewRendererProps {
    data: any;
    viewId: ViewId;
    className?: string;
    isLoading?: boolean;
}


export const DirectViewRenderer = ({
    data,
    viewId,
    className = "",
    isLoading = false
}: DirectViewRendererProps) => {
    const ViewComponent = getViewComponent(viewId);

    if (!ViewComponent) {
        return null;
    }

    return (
        <div className={className}>
            <ViewComponent data={data} isLoading={isLoading} />
        </div>
    );
};


interface AstViewRendererProps {
    ast: any;
    viewId: ViewId;
    className?: string;
    isLoading?: boolean;
}

export const AstViewRenderer = ({
    ast,
    viewId,
    className = "",
    isLoading = false
}: AstViewRendererProps) => {

    const ViewComponent = getViewComponent(viewId);

    if (!ViewComponent) {
        return null;
    }

    return (
        <div className={className}>
            <ViewComponent data={ast} isLoading={isLoading} />
        </div>
    );
};



interface ViewRendererProps {
    data: any;
    requestedViewId?: ViewId | "default";
    coordinatorId?: string;
    className?: string;
    isLoading?: boolean;
}


export const ViewRenderer = ({
    coordinatorId,
    requestedViewId = "default",
    data,
    className = "",
    isLoading = false
}: ViewRendererProps) => {

    let viewIdToUse: ViewId;
    
    if (requestedViewId !== "default") {
        viewIdToUse = requestedViewId as ViewId;
    } else if (coordinatorId) {
        viewIdToUse = getDefaultViewId(coordinatorId) as ViewId;
    } else {
        return null; // Cannot determine which view to use
    }

    const ViewComponent = getViewComponent(viewIdToUse);
    
    if (!ViewComponent) {
        return null;
    }

    return (
        <div className={className}>
            <ViewComponent data={data} isLoading={isLoading} />
        </div>
    );
};


export default ViewRenderer; 