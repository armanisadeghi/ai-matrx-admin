import * as React from 'react';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {EntityKeys} from "@/types/entityTypes";
import {useAppSelector} from "@/lib/redux/hooks";
import {cn} from "@/lib/utils";
import {AnimationPreset, ComponentDensity} from "@/types/componentConfigTypes";
import { ChevronRight, ChevronDown } from 'lucide-react';

interface EntityAccordionProps {
    entityKey: EntityKeys;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    columnsClassName?: string;
}

function EntityShowSelectedAccordion({ entityKey, columnsClassName }: EntityAccordionProps) {
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const { records, fieldInfo, displayField } = useAppSelector(selectors.selectCombinedRecordsWithFieldInfo);
    const [expandedFields, setExpandedFields] = React.useState<Record<string, boolean>>({});
    const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);

    const toggleFieldExpansion = (fieldId: string) => {
        setExpandedFields(prev => ({
            ...prev,
            [fieldId]: !prev[fieldId]
        }));
    };

    const truncateText = (text: string, maxLength: number = 100) => {
        if (!text || text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };

    return (
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
                            <ChevronRight className="h-5 w-5 text-primary shrink-0 transition-transform duration-200" />
                            <span className="font-semibold text-primary">
                                {record[displayField] || '-'}
                            </span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className={cn(
                            "bg-background grid gap-2 p-2",
                            columnsClassName || "grid-cols-1 md:grid-cols-2"
                        )}>
                            {(Array.isArray(fieldInfo) ? fieldInfo : Object.values(fieldInfo)).map(field => {
                                if (field.isPrimaryKey) return null;
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
                                                <span className="font-bold text-primary text-lg w-1/3 pr-2 break-words">
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
                                                        <>Show less <ChevronDown className="h-3 w-3 ml-1" /></>
                                                    ) : (
                                                         <>Show more <ChevronRight className="h-3 w-3 ml-1" /></>
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
    );
}

export default EntityShowSelectedAccordion;