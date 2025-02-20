"use client";

import React, { useEffect, useState } from "react";
import { MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import { useFetchQuickRef } from "@/app/entities/hooks/useFetchQuickRef";
import { useSelectQuickRef } from "@/app/entities/hooks/useSelectQuickRef";
import { FetchMode } from "@/lib/redux/entity/actions";
import { EntityKeys } from "@/types";
import { selectEntitySelectText, useAppSelector } from "@/lib/redux";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import SearchableSelect from "@/components/ui/matrx/SearchableSelect";

interface QuickRefSelectProps {
    entityKey?: EntityKeys;
    initialSelectedRecord?: QuickReferenceRecord;
    onRecordChange?: (record: QuickReferenceRecord) => void;
    fetchMode?: FetchMode;
    className?: string;
}

export const QuickRefSearchableSelect: React.FC<QuickRefSelectProps> = ({
    entityKey,
    initialSelectedRecord,
    onRecordChange,
    fetchMode = "fkIfk",
    className = "",
}) => {
    const selectText = useAppSelector((state) => selectEntitySelectText(state, entityKey));

    const [selectedRecordKey, setSelectedRecordKey] = useState<MatrxRecordId>(initialSelectedRecord?.recordKey || "");

    // Fetch quick references
    useFetchQuickRef(entityKey);

    const { activeRecordId, handleRecordSelect, quickReferenceRecords, setFetchMode } = useSelectQuickRef(entityKey);

    // Set fetch mode when it changes
    useEffect(() => {
        setFetchMode(fetchMode);
    }, [entityKey, setFetchMode, fetchMode]);

    // Initialize with initial selected record
    useEffect(() => {
        if (initialSelectedRecord) {
            setSelectedRecordKey(initialSelectedRecord.recordKey);
            onRecordChange?.(initialSelectedRecord);
        }
    }, [initialSelectedRecord, onRecordChange]);

    // Convert quick reference records to options format for SearchableSelect
    const selectOptions = React.useMemo(() => {
        if (!quickReferenceRecords) return [];

        return quickReferenceRecords.map((record) => ({
            label: record.displayValue,
            value: record.recordKey,
        }));
    }, [quickReferenceRecords]);

    // Handle selection change
    const handleChange = (newRecordKey: string) => {
        setSelectedRecordKey(newRecordKey);

        // Find the complete record to pass to parent
        const selectedRecord = quickReferenceRecords?.find((record) => record.recordKey === newRecordKey);

        if (selectedRecord) {
            onRecordChange?.(selectedRecord);
            handleRecordSelect(newRecordKey);
        }
    };

    useEffect(() => {
        if (!activeRecordId) return;
        setSelectedRecordKey(activeRecordId);
    }, [activeRecordId]);

    // Customized styles to match your existing UI
    const customStyles = {
        trigger: `bg-elevation1 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 
      hover:bg-elevation2 dark:hover:bg-elevation2 focus:bg-elevation1 dark:focus:bg-elevation1`,
        dropdown: `bg-elevation1 dark:bg-elevation1 border-gray-300 dark:border-gray-700`,
        option: `hover:bg-elevation2 dark:hover:bg-elevation2`,
        searchInput: `bg-elevation2 dark:bg-elevation2 border-gray-300 dark:border-gray-700`,
    };

    return (
        <SearchableSelect
            id={`quick-ref-${entityKey}`}
            placeholder={selectText}
            options={selectOptions}
            value={selectedRecordKey}
            onChange={handleChange}
            width="w-full"
            className={className}
            customStyles={{
                container: "text-sm",
                trigger: `!bg-elevation1 !dark:bg-elevation1 ${customStyles.trigger}`,
                dropdown: customStyles.dropdown,
                option: customStyles.option,
                searchInput: customStyles.searchInput,
            }}
        />
    );
};

export default QuickRefSearchableSelect;
