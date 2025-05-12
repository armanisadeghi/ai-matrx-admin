"use client";

import React, { useEffect, useState } from "react";
import SectionCard from "@/components/official/cards/SectionCard";
import { ThemeSwitcherMinimal, useTheme } from "@/styles/themes";
import { ComponentType } from "@/types/customAppTypes";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectFieldById } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import FieldPreviewAs from "./FieldPreviewAs";
import { componentOptions } from "@/features/applet/constants/field-constants";
import { addDynamicBrokerMap } from "@/lib/redux/app-runner/slices/brokerSlice";
import { v4 as uuidv4 } from "uuid";
import FieldContainerPreview from "./FieldContainerPreview";

interface FieldPreviewProps {
    fieldId: string;
    componentType: ComponentType | null;
}

const FieldPreview: React.FC<FieldPreviewProps> = ({ fieldId, componentType = "textarea" }) => {
    const field = useAppSelector((state) => selectFieldById(state, fieldId));
    const dispatch = useAppDispatch();
    const [fieldVersionIds, setFieldVersionIds] = useState<Record<string, string>>({});
    const source = "field-preview";
    const [stableSourceId] = useState(() => uuidv4());
    const { mode } = useTheme();

    // Set up stable IDs and broker maps only when fieldId changes
    useEffect(() => {
        const versionIds: Record<string, string> = {};

        componentOptions.forEach((option) => {
            const stableId = `${option.value}-${fieldId}`;
            versionIds[option.value] = stableId;

            dispatch(
                addDynamicBrokerMap({
                    source: source,
                    sourceId: stableSourceId,
                    itemId: stableId,
                })
            );
        });

        setFieldVersionIds(versionIds);
    }, [fieldId]);

    if (!field || Object.keys(fieldVersionIds).length === 0) {
        return (
            <SectionCard title="Component Preview" color="gray" spacing="relaxed">
                <div className="mt-6 p-4 text-center text-gray-500 dark:text-gray-400">Loading preview...</div>
            </SectionCard>
        );
    }

    return (
        <SectionCard
            titleNode={
                <div className="flex justify-between items-center w-full">
                    <h3 className="text-md font-semibold capitalize text-gray-900 dark:text-gray-100">
                        Your New <span className="text-blue-600 dark:text-blue-500 font-bold">{componentType}</span>
                    </h3>
                    <ThemeSwitcherMinimal 
                        text={mode === 'dark' ? 'See it in light mode' : 'See it in dark mode'}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    />
                </div>
            }
            color="gray"
            spacing="relaxed"
        >
            {/* Current component preview */}
            <div className="mt-6 mb-8 border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900 shadow-sm rounded-xl min-h-[250px]">
                {/* Use FieldContainerPreview instead of fieldController directly */}
                {componentType && fieldVersionIds[componentType] && (
                    <FieldContainerPreview
                        fields={[
                            {
                                ...field,
                                component: componentType,
                                id: fieldVersionIds[componentType],
                            },
                        ]}
                        appletId={stableSourceId}
                        source={source}
                    />
                )}
            </div>

            <FieldPreviewAs fieldId={fieldId} initialComponentType={componentType} />
        </SectionCard>
    );
};

export default FieldPreview;
