// ViewMode.tsx
import React from 'react';
import {ModeComponentProps} from './types';
import {cn} from "@/lib/utils";
import {ChevronDown, ChevronRight} from 'lucide-react';
import {ModeSwitcher} from './ModeSwitcher';

export const ViewMode: React.FC<ModeComponentProps> = (
    {
        matrxRecordId,
        record,
        dynamicFieldInfo,
        expandedFields,
        toggleFieldExpansion,
        truncateText,
        onModeChange
    }) => (
    <>
        <div className="flex justify-between items-center mb-4">
            <ModeSwitcher matrxRecordId={matrxRecordId} onModeChange={onModeChange}/>
        </div>
        <div className="bg-background grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
            {dynamicFieldInfo.map(field => {
                const fieldId = `${matrxRecordId}-${field.name}`;
                const isExpanded = expandedFields?.[fieldId];
                const fieldValue = record[field.name]?.toString() || '';
                const isLongText = fieldValue.length > 100;

                return (
                    <div
                        key={fieldId}
                        className={cn(
                            "flex items-start",
                            "p-2 rounded-lg border bg-border",
                            "bg-background hover:bg-secondary/30",
                            "transition-colors duration-200"
                        )}
                    >
                        <div className="flex flex-col w-full">
                            <div className="flex justify-between items-start w-full">
                                <span className="font-bold text-primary text-md w-1/3 pr-2 break-words">
                                    {field.displayName}:
                                </span>
                                <div className="w-2/3 text-left">
                                    <span className="text-md break-words">
                                        {isLongText && !isExpanded
                                         ? truncateText?.(fieldValue)
                                         : fieldValue || ''}
                                    </span>
                                </div>
                            </div>
                            {isLongText && toggleFieldExpansion && (
                                <button
                                    onClick={() => toggleFieldExpansion(fieldId)}
                                    className="text-primary hover:text-primary/80 text-sm mt-1 flex items-center"
                                >
                                    {isExpanded ? (
                                        <>Show less <ChevronDown className="h-3 w-3 ml-1"/></>
                                    ) : (
                                         <>Show more <ChevronRight className="h-3 w-3 ml-1"/></>
                                     )}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </>
);
