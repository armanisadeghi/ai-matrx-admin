"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";

import FieldRow from "../row/FieldRow";
import SearchGroupField from "../group/SearchGroupField";
import { useSearchTab } from "@/context/SearchTabContext";
import { TabSearchConfig } from "../../field-components/types";
import { useGetorFetchRecords } from "@/app/entities/hooks/records/useGetOrFetch";
import { ALL_BROKER_IDS } from "../../../constants";

interface DesktopAppletSearchBarProps {
    config: TabSearchConfig;
}

const DesktopAppletSearchBar: React.FC<DesktopAppletSearchBarProps> = ({ config }) => {
    const { activeTab } = useSearchTab();
    const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

    const dataBrokers = useGetorFetchRecords("dataBroker", ALL_BROKER_IDS);

    useEffect(() => {
        setActiveFieldId(null);
    }, [activeTab]);

    const searchButton = (
        <div className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-full p-3 ml-2">
            <Search size={24} />
        </div>
    );

    const activeSearchGroups = config[activeTab] || [];

    return (
        <div className="w-full p-4">
            <FieldRow
                activeFieldId={activeFieldId}
                onActiveFieldChange={setActiveFieldId}
                actionButton={searchButton}
                className="mx-auto max-w-4xl rounded-full bg-red-500"
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
            </FieldRow>
        </div>
    );
};

export default DesktopAppletSearchBar;