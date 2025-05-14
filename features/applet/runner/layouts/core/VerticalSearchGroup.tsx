// File: features\applet\layouts\core\VerticalSearchGroup.tsx
"use client";

// For the vertical layout
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AppletFieldController } from "../../fields/AppletFieldController";
import { ContainerRenderProps } from "../AppletLayoutManager";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";
import { useAppSelector } from "@/lib/redux/hooks";
import { CustomFieldLabelAndHelpText } from "@/constants/app-builder-help-text";

const VerticalSearchGroup: React.FC<ContainerRenderProps> = ({
    id,
    label,
    description,
    appletId,
    fields,
    isActive,
    onClick,
    onOpenChange,
    className = "",
    isMobile = false,
    source = "applet",
}) => {
    const appletContainers = useAppSelector((state) => selectAppletRuntimeContainers(state, appletId));

    const fieldRefs = useRef<Map<string, React.ReactNode>>(new Map());
    const [expanded, setExpanded] = useState(isActive);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setExpanded(isActive);
    }, [isActive]);

    useEffect(() => {
        fields.forEach((field) => {
            if (!fieldRefs.current.has(field.id)) {
                fieldRefs.current.set(field.id, AppletFieldController({ field, appletId, isMobile, source }));
            }
        });
    }, [fields, isMobile]);

    const handleToggle = () => {
        const newExpandedState = !expanded;
        setExpanded(newExpandedState);
        onClick(id);
        if (!newExpandedState) {
            onOpenChange(false);
        }
    };

    return (
        <div className={`border rounded-lg overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700 ${className}`}>
            <button
                className={`w-full flex justify-between items-center p-4 text-left focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    expanded ? "bg-gray-50 dark:bg-gray-700" : ""
                }`}
                onClick={handleToggle}
            >
                <div>
                    <h3 className="text-lg font-medium text-rose-500">{label}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                </div>
                <div>{expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
            </button>

            <div
                className="overflow-hidden transition-[height] duration-500 ease-in-out rounded-lg"
                style={{
                    height: expanded ? contentRef.current?.scrollHeight || "auto" : 0,
                }}
            >
                <div ref={contentRef} className="p-4 pb-6 dark:border-gray-700">
                    <div>
                        {fields.map((field) => (
                            <div key={field.id} className="mb-5 last:mb-0">
                                <CustomFieldLabelAndHelpText
                                    fieldId={field.id}
                                    fieldLabel={field.label}
                                    helpText={field.helpText}
                                    required={field.required}
                                    className="mb-2"
                                />
                                {fieldRefs.current.get(field.id)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerticalSearchGroup;
