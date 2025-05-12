"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import HelpIcon from "@/components/official/HelpIcon";
import { ComponentType } from "@/types/customAppTypes";
import { componentOptions } from "@/features/applet/constants/field-constants";
import { fieldController } from "@/features/applet/runner/field-components/FieldController";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectFieldById } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { v4 as uuidv4 } from "uuid";
import { addDynamicBrokerMap } from "@/lib/redux/app-runner/slices/brokerSlice";
import FieldContainerPreview from "./FieldContainerPreview";

interface FieldPreviewAsProps {
    fieldId: string;
    initialComponentType?: ComponentType | null;
}

const FieldPreviewAs: React.FC<FieldPreviewAsProps> = ({ fieldId, initialComponentType = "textarea" }) => {
    const dispatch = useAppDispatch();
    const [viewAsComponentType, setViewAsComponentType] = useState<ComponentType | null>(initialComponentType);
    const field = useAppSelector((state) => selectFieldById(state, fieldId));
    const source = "field-preview-as";
    const [stableSourceId] = useState(() => uuidv4());
    const [fieldVersionIds, setFieldVersionIds] = useState<Record<string, string>>({});

    // Create stable IDs and broker maps only when fieldId changes
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

    const handleComponentTypeChange = (newType: ComponentType) => {
        setViewAsComponentType(newType);
    };

    if (!field || Object.keys(fieldVersionIds).length === 0) {
        return <div className="mt-6 p-4 text-center text-gray-500 dark:text-gray-400">Loading preview...</div>;
    }

    return (
        <div className="space-y-8">
            {/* Component type selector */}
            <div className="space-y-3">
                <Label className="text-gray-900 dark:text-gray-100">View As Different Component Type</Label>
                <HelpIcon
                    text={
                        "Not all Fields will make sense for your specific settings, but we like to let you 'shop around' to find the best fit. notice that if you provide more values, your component can take on more forms, without breaking."
                    }
                />
                <div className="flex flex-wrap gap-2">
                    {componentOptions.map((option) => (
                        <Button
                            key={option.value}
                            variant={viewAsComponentType === option.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleComponentTypeChange(option.value)}
                            className={
                                viewAsComponentType === option.value
                                    ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                                    : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                            }
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>
            </div>

            {viewAsComponentType && fieldVersionIds[viewAsComponentType] && (
                <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900 shadow-sm rounded-xl min-h-[250px]">
                    <h3 className="text-md font-semibold mb-4 capitalize text-gray-900 dark:text-gray-100">
                        Rendered In Sample Container{"  "}
                    </h3>
                    <FieldContainerPreview 
                        fields={[
                            {
                                ...field,
                                component: viewAsComponentType,
                                id: fieldVersionIds[viewAsComponentType]
                            }
                        ]}
                        appletId={stableSourceId}
                        source={source}
                    />
                </div>
            )}
        </div>
    );
};

export default FieldPreviewAs;
