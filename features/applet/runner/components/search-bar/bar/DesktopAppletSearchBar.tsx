"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";

import AppletBrokerContainer from "../container/AppletBrokerContainer";
import SearchGroupField from "../group/SearchGroupField";
import { useAppletData } from "@/context/AppletDataContext";
import { AvailableAppletConfigs } from "../../field-components/types";
import { useGetorFetchRecords } from "@/app/entities/hooks/records/useGetOrFetch";
import { ALL_BROKER_IDS } from "../../../../sample-mock-data/constants";

interface DesktopAppletUserInputBarProps {
    config: AvailableAppletConfigs;
}

const DesktopAppletUserInputBar: React.FC<DesktopAppletUserInputBarProps> = ({ config }) => {
    const { activeTab } = useAppletData();
    const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

    const dataBrokers = useGetorFetchRecords("dataBroker", ALL_BROKER_IDS);

    useEffect(() => {
        setActiveFieldId(null);
    }, [activeTab]);

    const searchButton = (
        <div className="bg-blue-500 hover:bg-rose-600 dark:bg-blue-600 dark:hover:bg-rose-700 text-white rounded-full p-3 ml-2">
            <Search size={24} />
        </div>
    );

    const activeSearchGroups = config[activeTab] || [];

    return (
        <div className="w-full p-4">
            <AppletBrokerContainer
                activeFieldId={activeFieldId}
                onActiveFieldChange={setActiveFieldId}
                actionButton={searchButton}
                className="mx-auto max-w-4xl rounded-full"
            >
                {activeSearchGroups.map((group, index) => (
                    <SearchGroupField
                        key={group.id}
                        id={group.id}
                        label={group.label}
                        placeholder={group.placeholder}
                        description={group.description}
                        fields={group.fields}
                        isActive={activeFieldId === group.id}
                        onClick={() => {}} // Managed by FieldRow
                        onOpenChange={() => {}} // Managed by FieldRow
                        isLast={index === activeSearchGroups.length - 1}
                        isMobile={false}
                    />
                ))}
            </AppletBrokerContainer>
        </div>
    );
};

export default DesktopAppletUserInputBar;