"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppletTabsWrapper from "@/features/applet/builder/parts/AppletTabsWrapper";
import EmptyStateCard from "@/components/official/cards/EmptyStateCard";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
    selectAppletSourceConfig,
    selectAppletBrokerMappings,
    selectIsAppletDirtyById,
    selectNeededBrokerCount,
    selectUnmatchedNeededBrokerCount,
    selectIsBrokerMapIntegrity,
    selectIsAllRequiredBrokersMapped,
    selectMappedBrokerCount,
} from "@/lib/redux/app-builder/selectors/appletSelectors";
import { addBrokerMapping } from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import { saveAppletThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import { Broker, BrokerMapping } from "@/features/applet/builder/builder.types";
import NeededBrokersCard from "@/features/applet/builder/modules/broker-mapping/NeededBrokersCard";
import BrokerMappingCard from "@/features/applet/builder/modules/broker-mapping/BrokerMappingCard";
import { cn } from "@/lib/utils";

interface FieldsBrokerConfigContentProps {
    appletId: string;
    onUpdateCompletion?: (completion: {
        isComplete: boolean;
        canProceed: boolean;
        message?: string;
        footerButtons?: React.ReactNode;
    }) => void;
}

const FieldsBrokerConfigContent: React.FC<FieldsBrokerConfigContentProps> = ({ appletId, onUpdateCompletion }) => {
    const dispatch = useAppDispatch();
    const sourceConfig = useAppSelector((state) => selectAppletSourceConfig(state, appletId));
    const isAppletDirty = useAppSelector((state) => selectIsAppletDirtyById(state, appletId));
    const brokerMappings = useAppSelector((state) => selectAppletBrokerMappings(state, appletId));
    const neededBrokerCount = useAppSelector((state) => selectNeededBrokerCount(state, appletId));
    const unmatchedBrokerCount = useAppSelector((state) => selectUnmatchedNeededBrokerCount(state, appletId));
    const mappedBrokerCount = useAppSelector((state) => selectMappedBrokerCount(state, appletId));
    const isBrokerMapValid = useAppSelector((state) => selectIsBrokerMapIntegrity(state, appletId));
    const isAllRequiredMapped = useAppSelector((state) => selectIsAllRequiredBrokersMapped(state, appletId));

    const [selectedBroker, setSelectedBroker] = React.useState<Broker | null>(null);
    const hasNotifiedCompletionRef = useRef(false);

    const handleMappingCreated = useCallback(
        (mapping: BrokerMapping) => {
            dispatch(addBrokerMapping({ id: appletId, brokerMapping: mapping }));
        },
        [appletId, dispatch]
    );

    const handleBrokerSelect = useCallback((broker: Broker) => {
        setSelectedBroker(broker);

    }, []);

    const handleSaveApplet = useCallback(async () => {
        try {
            await dispatch(saveAppletThunk(appletId)).unwrap();
        } catch (error) {
            console.error("Failed to save applet:", error);
        }
    }, [appletId, dispatch]);

    const updateCompletionStatus = useCallback(() => {
        if (!onUpdateCompletion) return;

        if (!sourceConfig) {
            onUpdateCompletion({
                isComplete: false,
                canProceed: false,
                message: "No source configuration found for this applet.",
            });
            return;
        }

        if (neededBrokerCount === 0) {
            onUpdateCompletion({
                isComplete: true,
                canProceed: true,
                message: "No brokers needed for this applet.",
            });
            return;
        }

        const allMapped = unmatchedBrokerCount === 0;
        const saveButton = isAppletDirty ? (
            <Button onClick={handleSaveApplet} className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800">
                Save Changes
            </Button>
        ) : null;

        const message = !isBrokerMapValid
            ? "Duplicate broker mappings detected. Please ensure each broker is mapped only once."
            : isAppletDirty
            ? "Please save your changes before continuing."
            : allMapped
            ? "All brokers are mapped successfully."
            : isAllRequiredMapped
            ? `${mappedBrokerCount}/${neededBrokerCount} brokers mapped. All required brokers are mapped.`
            : `${mappedBrokerCount}/${neededBrokerCount} brokers mapped. Please map all required brokers.`;

        onUpdateCompletion({
            isComplete: isAllRequiredMapped && isBrokerMapValid,
            canProceed: isAllRequiredMapped && isBrokerMapValid && !isAppletDirty,
            message,
            footerButtons: saveButton,
        });
    }, [
        sourceConfig,
        neededBrokerCount,
        unmatchedBrokerCount,
        mappedBrokerCount,
        isAllRequiredMapped,
        isBrokerMapValid,
        isAppletDirty,
        handleSaveApplet,
        onUpdateCompletion,
    ]);

    useEffect(() => {
        if (!hasNotifiedCompletionRef.current) {
            updateCompletionStatus();
            hasNotifiedCompletionRef.current = true;
        }
    }, [updateCompletionStatus]);

    useEffect(() => {
        const timer = setTimeout(() => {
            updateCompletionStatus();
        }, 300);
        return () => clearTimeout(timer);
    }, [brokerMappings, isAppletDirty, isBrokerMapValid, isAllRequiredMapped, updateCompletionStatus]);

    if (!sourceConfig) {
        return (
            <EmptyStateCard
                title="No Source Configuration"
                description="Please configure a source for this applet in the Intelligence step."
                icon={Variable}
            />
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-transparent">
            <div className="md:col-span-1 space-y-4 bg-transparent">
                <NeededBrokersCard appletId={appletId} sourceConfig={sourceConfig} selectedBroker={selectedBroker} onBrokerSelect={handleBrokerSelect} />
            </div>
            <div className="md:col-span-3 bg-transparent">
                {selectedBroker ? (
                    <BrokerMappingCard selectedBroker={selectedBroker} appletId={appletId} onMappingCreated={handleMappingCreated} />
                ) : (
                    <EmptyStateCard
                        title="Broker & Field Mapping"
                        description="Select a broker from the Needed Brokers list."
                        icon={Variable}
                    />
                )}
            </div>
        </div>
    );
};

interface FieldsBrokerConfigStepProps {
    appId?: string;
    onUpdateCompletion?: (completion: {
        isComplete: boolean;
        canProceed: boolean;
        message?: string;
        footerButtons?: React.ReactNode;
    }) => void;
}

export const FieldsBrokerConfigStep: React.FC<FieldsBrokerConfigStepProps> = ({ appId, onUpdateCompletion }) => {
    return (
        <AppletTabsWrapper appId={appId} title="Fields & Brokers" description="Map fields to brokers">
            {(applet) => <FieldsBrokerConfigContent appletId={applet.id} onUpdateCompletion={onUpdateCompletion} />}
        </AppletTabsWrapper>
    );
};

export default FieldsBrokerConfigStep;
