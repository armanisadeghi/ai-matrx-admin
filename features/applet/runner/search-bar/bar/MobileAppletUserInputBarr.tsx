"use client";
import React, { useState, useEffect } from "react";
import { CircleX, Search, X } from "lucide-react";
import MobileAppletBrokerContainer from "../container/MobileAppletBrokerContainer";
import MobileActionBar from "./MobileActionBar";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectActiveAppletAccentColor, selectActiveAppletContainers, selectActiveAppletName, selectAppletRuntimeActiveAppletId } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import SearchContainerField from "../group/SearchContainerField";


interface MobileAppletUserInputBarProps {
    appletId: string;
}

const MobileAppletUserInputBar: React.FC<MobileAppletUserInputBarProps> = ({ appletId }) => {
    const activeAppletContainers = useAppSelector(state => selectActiveAppletContainers(state))
    const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
    const [showFullScreen, setShowFullScreen] = useState(false);
    const activeAppletId = useAppSelector(state => selectAppletRuntimeActiveAppletId(state))
    const appletAccentColor = useAppSelector(state => selectActiveAppletAccentColor(state))
    const activeAppletLabel = useAppSelector(state => selectActiveAppletName(state))


    useEffect(() => {
        setActiveFieldId(null);
    }, [activeAppletId]);

    useEffect(() => {
        if (showFullScreen && activeFieldId === null) {
            if (activeAppletContainers.length > 0) {
                setActiveFieldId(activeAppletContainers[0].id);
            }
        }
    }, [showFullScreen, activeFieldId, activeAppletContainers]);

    const searchButton = null;

    const handleClearAll = () => {
        console.log("Clear all filters");
        setShowFullScreen(false);
    };

    const handleSearch = () => {
        console.log("Performing search");
        setShowFullScreen(false);
    };

    // Collapsed mobile search button view
    if (!showFullScreen) {
        return (
            <div className="w-full p-2">
                <button
                    onClick={() => setShowFullScreen(true)}
                    className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700"
                >
                    <div className="flex items-center">
                        <Search size={18} className="text-gray-500 dark:text-gray-400 mr-2" style={{ color: appletAccentColor }} />
                        <span className="text-gray-500 dark:text-gray-400">Search {activeAppletLabel}</span>
                    </div>
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto flex flex-col">
            {/* Header - reduced height */}
            <div className="flex items-center justify-between py-2 px-4 border-b dark:border-gray-800">
                <button onClick={() => setShowFullScreen(false)} className="p-1">
                    <CircleX size={26} className="text-gray-500 dark:text-gray-300" />
                </button>
                <div className="font-medium text-base">{activeAppletLabel}</div>
                <div className="w-8"></div> {/* Empty div for balanced centering */}
            </div>

            {/* Search fields */}
            <div className="flex-grow p-4 overflow-y-auto pb-24">
                <MobileAppletBrokerContainer activeFieldId={activeFieldId} onActiveFieldChange={setActiveFieldId} className="mx-auto w-full">
                    {activeAppletContainers.map((container, index) => (
                        <SearchContainerField
                            key={container.id}
                            id={container.id}
                            label={container.label}
                            description={container.description}
                            fields={container.fields}
                            isActive={activeFieldId === container.id}
                            onClick={() => {}} // Managed by Broker Container
                            onOpenChange={() => {}} // Managed by Broker Container
                            isLast={index === activeAppletContainers.length - 1}
                            isMobile={true}
                        />
                    ))}
                </MobileAppletBrokerContainer>
            </div>

            <MobileActionBar onClearAll={handleClearAll} onSearch={handleSearch} />
        </div>
    );
};

export default MobileAppletUserInputBar;
