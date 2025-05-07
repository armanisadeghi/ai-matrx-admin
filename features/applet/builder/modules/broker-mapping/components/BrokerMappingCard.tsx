"use client";

import React, { useEffect, useState } from "react";
import SectionCard from "@/components/official/cards/SectionCard";
import { useAppSelector, useAppDispatch, RootState } from "@/lib/redux";
import { selectFieldLoading } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { Broker, BrokerMapping } from "@/features/applet/builder/builder.types";
import { fetchFieldsThunk } from "@/lib/redux/app-builder/thunks/fieldBuilderThunks";
import FieldListTable from "@/features/applet/builder/modules/field-builder/FieldListTable";
import { LoadingSpinner } from "@/components/ui/spinner";
import EmptyStateCard from "@/components/official/cards/EmptyStateCard";
import { CheckCircle2, LinkIcon, Variable } from "lucide-react";
import { selectAppletName } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { cn } from "@/lib/utils";
import { addBrokerMapping } from "@/lib/redux/app-builder/slices/appletBuilderSlice";


interface BrokerMappingCardProps {
    selectedBroker: Broker | null;
    appletId: string;
    onMappingCreated: (mapping: BrokerMapping) => void;
}

const BrokerMappingCard = ({ selectedBroker, appletId, onMappingCreated }: BrokerMappingCardProps) => {
    const [selectedField, setSelectedField] = useState<string>("");
    const appletName = useAppSelector((state: RootState) => selectAppletName(state, appletId));
    const isLoading = useAppSelector(selectFieldLoading);

    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(fetchFieldsThunk());
    }, [dispatch]);

    // Helper function to display values safely, showing "null" for null values
    const displayValue = (value: any): string => {
        if (value === null || value === undefined) return "null";
        if (typeof value === "string") return value;
        return String(value);
    };

    // Create mapping between broker and field
    const handleCreateMapping = (id: string) => {
        setSelectedField(id);
        const mapping: BrokerMapping = {
            appletId: appletId,
            fieldId: id,
            brokerId: selectedBroker.id,
        };

        dispatch(addBrokerMapping({ id: appletId, brokerMapping: mapping }));

        onMappingCreated(mapping);
    };

    const handleCreateField = () => {
        setSelectedField("");
    };

    if (!selectedBroker) {
        return (
            <EmptyStateCard title="Broker & Field Mapping" description="Select a broker from the list of Needed Brokers." icon={Variable} />
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-24">
                <LoadingSpinner />
            </div>
        );
    }

    const isMappingComplete = selectedField !== "";

    return (
        <>
            <SectionCard title="Broker Mapping" color="gray">
                <div className={cn(
                    "border rounded-lg p-4 border-gray-200 dark:border-gray-700 dark:bg-gray-800 mt-4",
                    isMappingComplete && "border-blue-300 dark:border-blue-700"
                )}>
                    <div className={cn(
                        "p-3 rounded mb-3 transition-all duration-300",
                        isMappingComplete 
                            ? "bg-blue-50 dark:bg-blue-900/20" 
                            : "bg-gray-50 dark:bg-gray-700/40"
                    )}>
                        {isMappingComplete && (
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                    <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                        Mapping Complete
                                    </span>
                                </div>
                                <LinkIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        )}
                        
                        <div className="text-sm flex mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300 w-36">Broker:</span>
                            <span className={cn(
                                "text-gray-900 dark:text-gray-100",
                                isMappingComplete && "font-medium"
                            )}>
                                {displayValue(selectedBroker.name)}
                            </span>
                        </div>
                        <div className="text-sm flex mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300 w-36">Applet:</span>
                            <span className="text-gray-900 dark:text-gray-100 text-xs break-all">
                                {displayValue(appletName)}
                            </span>
                        </div>
                        <div className="text-sm flex">
                            <span className="font-medium text-gray-700 dark:text-gray-300 w-36">Field:</span>
                            <span className={cn(
                                "text-gray-900 dark:text-gray-100 text-xs break-all",
                                isMappingComplete && "text-blue-700 dark:text-blue-400 font-medium"
                            )}>
                                {displayValue(selectedField)}
                            </span>
                        </div>
                    </div>

                    {/* Field Dropdown */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {isMappingComplete ? "Mapped Field" : "Select Field"}
                        </label>
                        <FieldListTable onFieldSelect={handleCreateMapping} />
                    </div>
                </div>
            </SectionCard>
        </>
    );
};

export default BrokerMappingCard;
