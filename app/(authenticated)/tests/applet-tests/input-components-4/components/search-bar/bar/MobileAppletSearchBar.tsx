"use client";
import React, { useState, useEffect } from "react";
import { CircleX, Search, X } from "lucide-react";
import MobileFieldRow from "../row/MobileFieldRow";
import SearchGroupField from "../group/SearchGroupField";
import { useSearchTab } from "@/context/SearchTabContext";
import { TabSearchConfig } from "../../field-components/types";
import { useGetorFetchRecords } from "@/app/entities/hooks/records/useGetOrFetch";
import { ALL_BROKER_IDS } from "../../../constants";

interface MobileAppletSearchBarProps {
    config: TabSearchConfig;
}

const MobileAppletSearchBar: React.FC<MobileAppletSearchBarProps> = ({ config }) => {
    const { activeTab } = useSearchTab();
    const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
    const [showFullScreen, setShowFullScreen] = useState(false);
    
    const dataBrokers = useGetorFetchRecords("dataBroker", ALL_BROKER_IDS);
    
    useEffect(() => {
        setActiveFieldId(null);
    }, [activeTab]);
    
    // Initialize with first field active when entering full screen mode
    useEffect(() => {
        if (showFullScreen && activeFieldId === null) {
            const activeSearchGroups = config[activeTab] || [];
            if (activeSearchGroups.length > 0) {
                setActiveFieldId(activeSearchGroups[0].id);
            }
        }
    }, [showFullScreen, activeFieldId, activeTab, config]);
    
    // No need for a search button since we have the fixed bottom bar now
    const searchButton = null;
    
    const activeSearchGroups = config[activeTab] || [];
    
    // Handle clear all action
    const handleClearAll = () => {
        // Implementation would depend on your app's state management
        console.log("Clear all filters");
        // For demonstration, we'll just close the modal
        setShowFullScreen(false);
    };
    
    // Handle search action
    const handleSearch = () => {
        // Implementation would depend on your app's search logic
        console.log("Performing search");
        // For demonstration, we'll just close the modal
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
                        <Search size={18} className="text-gray-500 dark:text-gray-400 mr-2" />
                        <span className="text-gray-500 dark:text-gray-400">Search {activeTab}</span>
                    </div>
                </button>
            </div>
        );
    }
    
    // Full-screen mobile search experience
    return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto flex flex-col">
            {/* Header - reduced height */}
            <div className="flex items-center justify-between py-2 px-4 border-b dark:border-gray-800">
                <button onClick={() => setShowFullScreen(false)} className="p-1">
                <CircleX size={26} className="text-gray-500 dark:text-gray-300" />
                </button>
                <div className="font-medium text-base">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </div>
                <div className="w-8"></div> {/* Empty div for balanced centering */}
            </div>
            
            {/* Search fields */}
            <div className="flex-grow p-4 overflow-y-auto pb-24">
                <MobileFieldRow
                    activeFieldId={activeFieldId}
                    onActiveFieldChange={setActiveFieldId}
                    className="mx-auto w-full"
                >
                    {activeSearchGroups.map((group, index) => (
                        <SearchGroupField
                            key={group.id}
                            id={group.id}
                            label={group.label}
                            placeholder={group.placeholder}
                            fields={group.fields}
                            isActive={activeFieldId === group.id}
                            onClick={() => {}} // Managed by FieldRow
                            onOpenChange={() => {}} // Managed by FieldRow
                            isLast={index === activeSearchGroups.length - 1}
                            isMobile={true}
                        />
                    ))}
                </MobileFieldRow>
            </div>
            
            {/* Fixed bottom bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 p-4 flex justify-between items-center">
                <button 
                    className="text-rose-600 dark:text-rose-400 font-medium"
                    onClick={handleClearAll}
                >
                    Clear all
                </button>
                <button 
                    className="bg-rose-600 text-white px-8 py-3 rounded-xl font-medium flex items-center"
                    onClick={handleSearch}
                >
                    <Search size={18} className="mr-2" />
                    Search
                </button>
            </div>
        </div>
    );
};

export default MobileAppletSearchBar;