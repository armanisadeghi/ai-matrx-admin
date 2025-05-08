"use client";
import React, { useMemo } from "react";
import { Broker } from "@/features/applet/builder/builder.types";
import { CheckCircle2 } from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsBrokerMapped, selectBrokerMappedStatus } from "@/lib/redux/app-builder/selectors/appletSelectors";

interface BrokerCardProps {
  broker: Broker;
  appletId: string;
  isSelected: boolean;
  onSelect: (broker: Broker) => void;
}

// Helper function to display broker data type in a human-readable format
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

// Helper function to convert value to displayable string
const displayValue = (value: any): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  return String(value);
};

const BrokerCard = ({ broker, appletId, isSelected, onSelect }: BrokerCardProps) => {
  // Use the more efficient brokerMappedStatus selector which returns a stable object
  const mappedStatus = useAppSelector((state) => selectBrokerMappedStatus(state, appletId));
  const isMapped = mappedStatus[broker.id] || false;

  return (
    <div
      className={`border rounded-xl p-2 cursor-pointer relative ${
        isSelected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
          : isMapped
          ? "border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/10 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700 dark:bg-gray-800/60 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 dark:hover:border-blue-400"
      }`}
      onClick={() => onSelect(broker)}
    >
      {isMapped && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
      )}
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-md text-blue-400 dark:text-blue-400">
            Name: {displayValue(broker.name)}
          </p>
        </div>
        <div
          className={`text-xs px-2 py-1 rounded-full mr-7 ${
            broker.required
              ? isMapped 
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          {broker.required ? "Required" : "Optional"}
        </div>
      </div>
      <div className="mt-1 text-xs">
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
        <div className="flex mt-1">
          <span className="text-xs text-amber-700 dark:text-amber-300">
            Hint: Set from Cockpit or Broker Management
          </span>
        </div>
      </div>
    </div>
  );
};

export default BrokerCard; 