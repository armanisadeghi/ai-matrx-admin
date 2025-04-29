// File: components/search/layouts/AccordionSearchLayout.tsx
import React, { useState, useRef, useEffect } from "react";
import { SearchLayoutProps } from "@/features/applet/layouts/options/layout.types";
import { ChevronDown, Send } from "lucide-react";
import { fieldController } from "@/features/applet/runner/components/field-components/FieldController";

const AccordionSearchLayout: React.FC<SearchLayoutProps> = ({ config, activeTab, actionButton, className = "" }) => {
    const activeSearchGroups = config[activeTab] || [];
    // Only store the currently active group ID instead of a Set
    const [activeGroupId, setActiveGroupId] = useState<string>(activeSearchGroups[0]?.id || "");
    const contentRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());
    const fieldRefs = useRef<Map<string, Map<string, React.ReactNode>>>(new Map());

    // Initialize content refs for each group
    useEffect(() => {
        activeSearchGroups.forEach((group) => {
            if (!contentRefs.current.has(group.id)) {
                contentRefs.current.set(group.id, React.createRef<HTMLDivElement>());
            }

            // Initialize field refs for this group
            if (!fieldRefs.current.has(group.id)) {
                const groupFieldRefs = new Map<string, React.ReactNode>();
                fieldRefs.current.set(group.id, groupFieldRefs);

                // Render each field
                group.fields.forEach((field) => {
                    groupFieldRefs.set(field.brokerId, fieldController(field, false));
                });
            }
        });

        // Ensure we always have an active group
        if (!activeGroupId && activeSearchGroups.length > 0) {
            setActiveGroupId(activeSearchGroups[0].id);
        }
    }, [activeSearchGroups, activeGroupId]);

    const toggleGroup = (groupId: string) => {
        // In a true accordion, clicking on the active item doesn't close it
        if (groupId !== activeGroupId) {
            setActiveGroupId(groupId);
        }
    };

    // Determine if we're at the last group
    const isLastGroup = (index: number): boolean => {
        return index === activeSearchGroups.length - 1;
    };

    return (
        <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700">
                {activeSearchGroups.map((group, index) => {
                    const isActive = activeGroupId === group.id;
                    return (
                        <div key={group.id} className={`${index !== 0 ? "border-t dark:border-gray-700" : ""}`}>
                            <button
                                className={`w-full flex justify-between items-center p-4 text-left focus:outline-none 
                  ${isActive ? "bg-gray-50 dark:bg-gray-700 cursor-default" : "hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"}`}
                                onClick={() => !isActive && toggleGroup(group.id)}
                                disabled={isActive}
                            >
                                <div>
                                    <h3 className="text-lg font-medium text-rose-500">{group.label}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{group.placeholder}</p>
                                </div>
                                <div>{!isActive && <ChevronDown size={20} />}</div>
                            </button>

                            <div
                                className="overflow-hidden transition-[height] duration-500 ease-in-out border-b border-gray-200 dark:border-gray-700"
                                style={{
                                    height: isActive ? contentRefs.current.get(group.id)?.current?.scrollHeight || "auto" : 0,
                                }}
                            >
                                <div ref={contentRefs.current.get(group.id) || null} className="p-4 border-t dark:border-gray-700">
                                    {group.description && (
                                        <div className="pr-1 mb-5 text-sm text-gray-500 dark:text-gray-400 ">{group.description}</div>
                                    )}

                                    <div>
                                        {group.fields.map((field) => (
                                            <div key={field.brokerId} className="mb-6 last:mb-0">
                                                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                                                    {field.label}
                                                </label>
                                                {fieldRefs.current.get(group.id)?.get(field.brokerId)}
                                                {field.helpText && (
                                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end mt-3">
                {actionButton || (
                    <button className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-md px-6 py-3 flex items-center">
                        <span className="mr-2">Submit</span>
                        <Send size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default AccordionSearchLayout;
