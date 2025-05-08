'use client';

import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { selectActiveAppletId } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { Broker, BrokerMapping, AppletSourceConfig } from "@/features/applet/builder/builder.types";

import BrokerMappingCard from "./BrokerMappingCard";

interface SourceConfigCardSelectorProps {
    appletId?: string;
    sourceConfig: AppletSourceConfig | null;
    onMappingCreated: (mapping: BrokerMapping) => void;
}

const RecipeBrokerCards = ({ appletId, sourceConfig, onMappingCreated }: SourceConfigCardSelectorProps) => {
    const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
    
    const activeAppletId = useAppSelector(selectActiveAppletId);
    
    const idToUse = appletId || activeAppletId;

    return (
        <div className="flex flex-col space-y-4">
            {/* Main content area with 3-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Second and Third columns: Broker Mapping */}
                <div className="md:col-span-2">
                    {sourceConfig ? (
                        <BrokerMappingCard
                            selectedBroker={selectedBroker}
                            appletId={idToUse}
                            onMappingCreated={onMappingCreated}
                        />
                    ) : (
                        <div className="border rounded-lg p-4 border-gray-200 dark:border-gray-700 dark:bg-gray-800 flex items-center justify-center h-64">
                            <p className="text-gray-500 dark:text-gray-400">Select a recipe to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecipeBrokerCards;
