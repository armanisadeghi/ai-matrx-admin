"use client";
import React, { useState, useEffect } from "react";
import { CircleX, Search, X } from "lucide-react";
import MobileAppletBrokerContainer from "../container/MobileAppletBrokerContainer";
import SearchGroupField from "../group/SearchGroupField";
import { useAppletData } from "@/context/AppletDataContext";
import { useGetorFetchRecords } from "@/app/entities/hooks/records/useGetOrFetch";
import { ALL_BROKER_IDS } from "@/features/applet/sample-mock-data/constants";
import MobileActionBar from "./MobileActionBar";

interface MobileAppletUserInputBarProps {
    appName: string;
}

const MobileAppletUserInputBar: React.FC<MobileAppletUserInputBarProps> = ({ appName }) => {
    const { activeTab, customAppConfig: config, accentColor } = useAppletData();
    const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
    const [showFullScreen, setShowFullScreen] = useState(false);

    const dataBrokers = useGetorFetchRecords("dataBroker", ALL_BROKER_IDS);

    useEffect(() => {
        setActiveFieldId(null);
    }, [activeTab]);

    useEffect(() => {
        if (showFullScreen && activeFieldId === null) {
            const activeSearchGroups = config[activeTab] || [];
            if (activeSearchGroups.length > 0) {
                setActiveFieldId(activeSearchGroups[0].id);
            }
        }
    }, [showFullScreen, activeFieldId, activeTab, config]);

    const searchButton = null;

    const activeSearchGroups = config[activeTab] || [];

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
                        <Search size={18} className="text-gray-500 dark:text-gray-400 mr-2" style={{ color: accentColor }} />
                        <span className="text-gray-500 dark:text-gray-400">Search {activeTab}</span>
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
                <div className="font-medium text-base">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</div>
                <div className="w-8"></div> {/* Empty div for balanced centering */}
            </div>

            {/* Search fields */}
            <div className="flex-grow p-4 overflow-y-auto pb-24">
                <MobileAppletBrokerContainer activeFieldId={activeFieldId} onActiveFieldChange={setActiveFieldId} className="mx-auto w-full">
                    {activeSearchGroups.map((group, index) => (
                        <SearchGroupField
                            key={group.id}
                            id={group.id}
                            label={group.label}
                            placeholder={group.placeholder}
                            description={group.description}
                            fields={group.fields}
                            isActive={activeFieldId === group.id}
                            onClick={() => {}} // Managed by Broker Container
                            onOpenChange={() => {}} // Managed by Broker Container
                            isLast={index === activeSearchGroups.length - 1}
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
