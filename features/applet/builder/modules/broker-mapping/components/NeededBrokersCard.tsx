"use client";

import React from "react";
import SectionCard from "@/components/official/cards/SectionCard";
import { AppletSourceConfig } from "@/lib/redux/app-builder/service";
import { Broker } from "@/features/applet/builder/builder.types";

interface NeededBrokersCardProps {
    sourceConfig: AppletSourceConfig | null;
    selectedBroker: Broker | null;
    onBrokerSelect: (broker: Broker) => void;
}

const displayBrokerType = (dataType: string) => {
    switch (dataType) {
        case "str":
            return "Text";
        case "int":
            return "Number";
        case "float":
            return "Decimal";
        case "bool":
            return "True/False";
        case "date":
            return "Date";
        case "datetime":
            return "Date and Time";
        case "list":
            return "List of items";
        case "dict":
            return "Object";
        case "url":
            return "URL";
        case "file":
            return "File";
        case "image":
            return "Image";
        case "video":
            return "Video";
        default:
            return dataType;
    }
};

const NeededBrokersCard = ({ sourceConfig, selectedBroker, onBrokerSelect }: NeededBrokersCardProps) => {
    // Helper function to display values safely, showing "null" for null values
    const displayValue = (value: any): string => {
        if (value === null || value === undefined) return "null";
        if (typeof value === "string") return value;
        return String(value);
    };

    const brokerCount = sourceConfig?.config.neededBrokers.length || 0;

    if (!sourceConfig) return null;

    return (
        <SectionCard title="Needed Brokers" description={`Please map ${brokerCount} ${brokerCount === 1 ? "broker to a field" : "brokers to fields"}`} color="gray">
            <div className="p-4 space-y-3">
                {sourceConfig.config.neededBrokers.map((broker) => (
                    <div
                        key={broker.id}
                        className={`border rounded-xl p-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 dark:hover:border-blue-400 ${
                            selectedBroker?.id === broker.id
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                                : "border-gray-200 dark:border-gray-700 dark:bg-gray-800/60"
                        }`}
                        onClick={() => onBrokerSelect(broker)}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-medium text-md text-blue-400 dark:text-blue-400">Name: {displayValue(broker.name)}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ID: {displayValue(broker.id)}</p>
                            </div>
                            <div
                                className={`text-xs px-2 py-1 rounded-full ${
                                    broker.required
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                }`}
                            >
                                {broker.required ? "Required" : "Optional"}
                            </div>
                        </div>
                        <div className="mt-2 text-xs">
                            <div className="flex">
                                <span className="font-medium text-gray-700 dark:text-gray-300 w-36">Data Type:</span>
                                <span className="text-gray-900 dark:text-gray-100">{displayBrokerType(broker.dataType)}</span>
                            </div>
                            <div className="flex mt-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300 w-36">Default Value:</span>
                                <span className="italic text-gray-700 dark:text-gray-300 truncate">
                                    {displayValue(broker.defaultValue).substring(0, 60)}...
                                </span>
                            </div>
                            <div className="flex mt-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300 w-36">Default Component:</span>
                                <span className="text-gray-900 dark:text-gray-100">{displayValue(broker.inputComponent)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </SectionCard>
    );
};

export default NeededBrokersCard;
