"use client";

import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { RootState } from "@/lib/redux/store";
import { selectAppletById } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { saveAppletThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import { AppletBuilder } from "@/lib/redux/app-builder/types";
import AppletOverview from "./AppletOverview";
import AppletVisuals from "./AppletVisuals";
import AppletActions from "./AppletActions";

// Default values for new applets
export const DEFAULT_APPLET_CONFIG: AppletBuilder = {
    id: "",
    name: "",
    description: "",
    slug: "",
    appletIcon: "Search",
    appletSubmitText: "",
    creator: "",
    primaryColor: "gray",
    accentColor: "blue",
    layoutType: "open",
    containers: [],
    imageUrl: "",
};

export interface QuickAppletCreateEditProps {
    appletId?: string; // Existing applet ID
    appId?: string; // Optional app ID for the applet
    isNew?: boolean; // Flag to indicate if this is a new applet form
    onSaveApplet?: () => void; // Callback for saving the applet
    onRemoveApplet?: () => void; // Callback for removing the applet
    showLayoutOption?: boolean;
    showButtonOptions?: boolean;
}

export const QuickAppletCreateEdit: React.FC<QuickAppletCreateEditProps> = ({ appletId, appId, isNew = false, onSaveApplet, onRemoveApplet, showLayoutOption = true, showButtonOptions = true }) => {
    const dispatch = useAppDispatch();

    // Redux selectors for the current applet
    const applet = useAppSelector((state: RootState) => selectAppletById(state, appletId || ""));

    const handleSaveApplet = () => {
        if (onSaveApplet) {
            // If parent provides save handler, use that instead of local Redux dispatch
            onSaveApplet();
        } else if (appletId) {
            // Otherwise, use local Redux dispatch
            dispatch(saveAppletThunk(appletId));
        }
    };

    // Ensure we have a valid applet before rendering
    if (!appletId) {
        return <div className="p-4 text-gray-500 dark:text-gray-400">No applet selected</div>;
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Form section */}
                <div className="w-full space-y-4">
                    <AppletOverview appletId={appletId} isNew={isNew} />
                    <AppletVisuals appletId={appletId} isNew={isNew} showLayoutOption={showLayoutOption} showButtonOptions={showButtonOptions} />
                    <AppletActions 
                        appletId={appletId} 
                        appId={appId} 
                        isNew={isNew} 
                        onSaveApplet={handleSaveApplet} 
                        onRemoveApplet={onRemoveApplet} 
                    />
                </div>
            </div>
        </div>
    );
};

export default QuickAppletCreateEdit;
