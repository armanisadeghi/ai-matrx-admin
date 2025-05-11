"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import SectionCard from "@/components/official/cards/SectionCard";
import FieldRenderer from "./FieldRenderer";
import { ThemeSwitcherIcon } from "@/styles/themes";
import HelpIcon from "@/features/applet/runner/layouts/helpers/HelpIcon";
import { ComponentType } from "@/types/customAppTypes";
import { componentOptions } from "@/features/applet/constants/field-constants";

interface FieldPreviewProps {
    field: any;
    componentType: ComponentType | null;
}

const FieldPreview: React.FC<FieldPreviewProps> = ({ field, componentType }) => {
    const [viewAsComponentType, setViewAsComponentType] = useState<ComponentType | null>("textarea");

    const handleComponentTypeChange = (componentType: ComponentType) => {
        setViewAsComponentType(componentType);
    };

    return (
        <SectionCard title="Component Preview" color="gray" spacing="relaxed">
            {/* Current component preview */}
            <div className="mt-6 mb-8 border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900 shadow-sm rounded-xl min-h-[250px]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-md font-semibold capitalize text-gray-900 dark:text-gray-100">
                        Your New{" "}
                        <span className="text-blue-600 dark:text-blue-500 font-bold">
                            {" "}
                            {componentType} {"  "}
                        </span>{" "}
                        Component
                    </h3>
                    <ThemeSwitcherIcon />
                </div>
                {field && <FieldRenderer field={field} />}
            </div>

            {/* Component type selector */}
            <div className="mb-8 space-y-3">
                <Label className="text-gray-900 dark:text-gray-100">View As Different Component Type</Label>
                <HelpIcon text={"Not all Fields will make sense for your specific settings, but we like to let you 'shop around' to find the best fit. notice that if you provide more values, your component can take on more forms, without breaking."} />
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

            {/* Additional component view when a type is selected */}
            {field && viewAsComponentType && (
                <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900 shadow-sm rounded-xl min-h-[250px]">
                    <h3 className="text-md font-semibold mb-4 capitalize text-gray-900 dark:text-gray-100">
                        Rendered as{"  "}
                        <span className="text-blue-600 dark:text-blue-500 font-bold">
                            {componentOptions.find((option) => option.value === viewAsComponentType)?.label}
                        </span>
                    </h3>
                    <FieldRenderer
                        field={{
                            ...field,
                            component: viewAsComponentType,
                        }}
                    />
                </div>
            )}
        </SectionCard>
    );
};

export default FieldPreview; 