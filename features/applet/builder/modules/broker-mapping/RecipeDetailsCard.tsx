'use client';

import React from "react";
import SectionCard from "@/components/official/cards/SectionCard";
import { AppletSourceConfig } from "@/features/applet/builder/builder.types";
import { useAppSelector } from "@/lib/redux/hooks";
import { BrokerMapping } from "@/features/applet/builder/builder.types";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { selectAppletBrokerMappings } from "@/lib/redux/app-builder/selectors/appletSelectors";

interface RecipeDetailsCardProps {
    sourceConfig: AppletSourceConfig | null;
    appletId?: string | null;
}

const RecipeDetailsCard = ({ sourceConfig, appletId }: RecipeDetailsCardProps) => {
    const brokerCount = sourceConfig?.config.neededBrokers.length || 0;
    const brokerMappings = useAppSelector(state => 
        appletId ? selectAppletBrokerMappings(state, appletId) : null
    ) as BrokerMapping[] | null;
    
    // Count how many needed brokers have been mapped
    const neededBrokerIds = sourceConfig?.config.neededBrokers.map(broker => broker.id) || [];
    const mappedBrokerIds = brokerMappings?.map(mapping => mapping.brokerId) || [];
    const mappedCount = neededBrokerIds.filter(id => 
        mappedBrokerIds.includes(id)
    ).length;
    
    // Check if all needed brokers are mapped
    const allMapped = brokerCount > 0 && mappedCount === brokerCount;

    // Helper function to display values safely, showing "null" for null values
    const displayValue = (value: any): string => {
        if (value === null || value === undefined) return "null";
        if (typeof value === "string") return value;
        return String(value);
    };

    return (
        <SectionCard 
            title={allMapped ? "Recipe Ready" : "Recipe Details"} 
            color={allMapped ? "blue" : "gray"}
        >
            {sourceConfig && (
                <div className={cn(
                    "space-y-2 text-sm p-3",
                    "transition-all duration-300",
                    allMapped ? "border-l-4 border-blue-500 dark:border-blue-600 pl-4 rounded-l bg-blue-50 dark:bg-blue-950/30" : ""
                )}>
                    <div className="flex">
                        <span className="font-medium text-gray-700 dark:text-gray-300 w-28">Recipe ID:</span>
                        <span className="text-gray-900 dark:text-gray-100 text-xs break-all">
                            {displayValue(sourceConfig.config.id)}
                        </span>
                    </div>
                    <div className="flex">
                        <span className="font-medium text-gray-700 dark:text-gray-300 w-28">Compiled ID:</span>
                        <span className="text-gray-900 dark:text-gray-100 text-xs break-all">
                            {displayValue(sourceConfig.config.compiledId)}
                        </span>
                    </div>
                    <div className="flex">
                        <span className="font-medium text-gray-700 dark:text-gray-300 w-28">Version:</span>
                        <span className="text-gray-900 dark:text-gray-100">{displayValue(sourceConfig.config.version)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <span className="font-medium text-gray-700 dark:text-gray-300 w-28">Broker Mappings:</span>
                            <span className={cn(
                                "font-medium",
                                allMapped 
                                    ? "text-blue-600 dark:text-blue-400" 
                                    : "text-gray-900 dark:text-gray-100"
                            )}>
                                {mappedCount} / {brokerCount}
                            </span>
                        </div>
                        {allMapped && (
                            <CheckCircle 
                                className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" 
                            />
                        )}
                    </div>
                </div>
            )}
        </SectionCard>
    );
};

export default RecipeDetailsCard; 