import * as React from 'react';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui";
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {cn} from "@/lib/utils";
import {ChevronRight, ChevronDown} from 'lucide-react';
import {EntityStateField} from "@/lib/redux/entity/types";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";
import {useFetchRelated} from "@/lib/redux/entity/hooks/useFetchRelated";
import {FormDensity} from "@/components/matrx/ArmaniForm/ArmaniForm";
import {AnimationPreset, TextSizeOptions} from "@/types/componentConfigTypes";

export interface EntityInlineProps {
    entityKey: EntityKeys;
    dynamicFieldInfo: EntityStateField;
    value: any;
    onChange: (value: any) => void;
    density?: FormDensity;
    animationPreset?: AnimationPreset;
    size?: TextSizeOptions;
    className?: string;
    variant: MatrxVariant;
    floatingLabel?: boolean;
    formData: EntityData<EntityKeys>;
    activeEntityKey?: EntityKeys;
}

function EntityFkAccordion(
    {
        entityKey,
        dynamicFieldInfo,
        value,
        onChange,
        density,
        animationPreset,
        size,
        variant,
        floatingLabel,
        formData,
        activeEntityKey,
    }: EntityInlineProps) {
    const {
        records,
        fieldInfo,
        displayField,
        expandedFields,
        hoveredItem,
        toggleFieldExpansion,
        setHoveredItem,
        truncateText,
    } = useFetchRelated({
        entityKey,
        dynamicFieldInfo,
        formData,
        activeEntityKey,
    });

    return (
        <div className="col-span-full">
            <Accordion
                type="single"
                collapsible
                className="w-full space-y-1 border rounded-lg p-2"
            >
                {Object.entries(records).map(([recordId, record]) => (
                    <AccordionItem
                        key={recordId}
                        value={recordId}
                        className={cn(
                            "border rounded-lg transition-colors duration-200",
                            hoveredItem === recordId && "border-secondary"
                        )}
                        onMouseEnter={() => setHoveredItem(recordId)}
                        onMouseLeave={() => setHoveredItem(null)}
                    >
                        <AccordionTrigger
                            className={cn(
                                "px-2 rounded-lg transition-colors duration-200",
                                hoveredItem === recordId && "bg-secondary/50"
                            )}
                        >
                            <div className="flex items-center space-x-2">
                                <ChevronRight
                                    className="h-5 w-5 text-primary shrink-0 transition-transform duration-200"/>
                                <span className="font-semibold text-primary">
                                {record[displayField] || '-'}
                            </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="bg-background grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                                {fieldInfo.map(field => {
                                    const fieldId = `${recordId}-${field.name}`;
                                    const isExpanded = expandedFields[fieldId];
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
                                                         ? truncateText(fieldValue)
                                                         : fieldValue || ''}
                                                    </span>
                                                    </div>
                                                </div>
                                                {isLongText && (
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
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}

export default EntityFkAccordion;
