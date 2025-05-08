"use client";

import React, { useEffect, useState } from "react";
import SectionCard from "@/components/official/cards/SectionCard";
import { useAppSelector, useAppDispatch, RootState } from "@/lib/redux";
import { selectFieldLoading } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { Broker, BrokerMapping } from "@/features/applet/builder/builder.types";
import { fetchFieldsThunk } from "@/lib/redux/app-builder/thunks/fieldBuilderThunks";
import FieldListTable from "@/features/applet/builder/modules/field-builder/table/FieldListTable";
import { LoadingSpinner } from "@/components/ui/spinner";
import EmptyStateCard from "@/components/official/cards/EmptyStateCard";
import { CheckCircle2, LocateOff, Variable, Plus, ListFilter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { addBrokerMapping } from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import FieldEditor from "../field-builder/FieldEditor";
import { cancelFieldCreation } from "@/lib/redux/app-builder/slices/fieldBuilderSlice";
import { Button } from "@/components/ui/button";

interface BrokerMappingCardProps {
    selectedBroker: Broker | null;
    appletId: string;
    onMappingCreated: (mapping: BrokerMapping) => void;
}

const BrokerMappingCard = ({ selectedBroker, appletId, onMappingCreated }: BrokerMappingCardProps) => {
    const [selectedField, setSelectedField] = useState<string>("");
    const isLoading = useAppSelector(selectFieldLoading);
    const [mode, setMode] = useState<"create" | "edit" | "list">("list");
    const [broker, setBroker] = useState<Broker | null>(selectedBroker);

    useEffect(() => {
        setBroker(selectedBroker);
    }, [selectedBroker]);


    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(fetchFieldsThunk());
    }, [dispatch]);

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
        setMode("list");
    };

    const handleCreateField = () => {
        setSelectedField("");
    };

    const handleFieldEditCancel = () => {
        setMode("list");
    };

    const handleFieldCreateCancel = () => {
        dispatch(cancelFieldCreation(selectedField));
        setMode("list");
    };

    const handleFieldEdit = (id: string) => {
        setSelectedField(id);
        setMode("edit");
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

    const getDescription = () => {
        return (
            <div className="flex flex-col mb-0 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        {isMappingComplete ? (
                            <>
                                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Mapping Complete</span>
                            </>
                        ) : (
                            <>
                                <LocateOff className="w-5 h-5 text-gray-400 mr-2" />
                                <span className="text-sm font-medium text-gray-400">Please select or create a field for {selectedBroker.name}</span>
                            </>
                        )}
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="flex space-x-1 border border-gray-200 dark:border-gray-700 rounded-md">
                            <Button
                                variant={mode === "list" ? "default" : "ghost"}
                                size="sm"
                                className={cn(
                                    "text-xs h-7 px-2",
                                    mode === "list"
                                        ? "bg-transparent hover:bg-zinc-300 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-300 text-gray-800 dark:text-gray-200"
                                        : "text-gray-600 dark:text-gray-400"
                                )}
                                onClick={() => setMode("list")}
                                title="Use existing field"
                            >
                                <ListFilter className="w-3.5 h-3.5 mr-1" />
                                Existing
                            </Button>

                            <Button
                                variant={mode === "create" ? "default" : "ghost"}
                                size="sm"
                                className={cn(
                                    "text-xs h-7 px-2",
                                    mode === "create"
                                        ? "bg-transparent hover:bg-zinc-300 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-300 text-gray-800 dark:text-gray-200"
                                        : "text-gray-600 dark:text-gray-400"
                                )}
                                onClick={() => {
                                    handleCreateField();
                                    setMode("create");
                                }}
                                title="Create new field"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                New
                            </Button>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "text-xs h-7 px-2 bg-transparent border-dashed border-yellow-300 dark:border-yellow-600 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200",
                                mode === "list" && "opacity-50 cursor-not-allowed"
                            )}
                            onClick={() => handleFieldCreateCancel()}
                            disabled={mode === "list"}
                        >
                            <X className="w-3.5 h-3.5 mr-1 text-yellow-500 dark:text-yellow-400" />
                            Clear
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <SectionCard title="Broker Mapping" descriptionNode={getDescription()} color="gray" minHeight="960px" scrollable={true}>
                <div className={cn("bg-transparent mt-4", isMappingComplete && "border-blue-300 dark:border-blue-700")}>
                    {/* Field Dropdown */}
                    <div className="space-y-3">
                        {mode === "create" && (
                            <FieldEditor
                                key={broker.id}
                                fieldId={selectedField}
                                isCreatingNew={true}
                                onSaveSuccess={handleCreateMapping}
                                onCancel={handleFieldCreateCancel}
                                broker={broker}
                            />
                        )}
                        {mode === "edit" && (
                            <FieldEditor
                                key={broker.id}
                                fieldId={selectedField}
                                isCreatingNew={false}
                                onSaveSuccess={handleCreateMapping}
                                onCancel={handleFieldEditCancel}
                                broker={broker}
                            />
                        )}
                        {mode === "list" && <FieldListTable onFieldSelect={handleCreateMapping} onFieldEdit={handleFieldEdit} />}
                    </div>
                </div>
            </SectionCard>
        </>
    );
};

export default BrokerMappingCard;
