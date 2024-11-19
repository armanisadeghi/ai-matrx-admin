import * as React from 'react';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {EntityKeys} from "@/types/entityTypes";
import {useAppSelector} from "@/lib/redux/hooks";
import {cn} from "@/lib/utils";

interface EntityAccordionProps {
    entityKey: EntityKeys;
}

function EntityShowSelectedAccordion({ entityKey }: EntityAccordionProps) {
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const { records, fieldInfo, displayField } = useAppSelector(selectors.selectCombinedRecordsWithFieldInfo);

    return (
        <Accordion type="single" collapsible className="w-full">
            {Object.entries(records).map(([recordId, record]) => (
                <AccordionItem key={recordId} value={recordId}>
                    <AccordionTrigger className="px-4">
                        {record[displayField] || '-'}
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fieldInfo.map(field => {
                                if (field.isPrimaryKey) return null;
                                return (
                                    <div
                                        key={field.name}
                                        className={cn(
                                            "space-y-1.5 p-3",
                                            "rounded-md bg-background/50",
                                            "border border-border/50"
                                        )}
                                    >
                                        <label className="text-sm font-medium text-muted-foreground">
                                            {field.displayName}
                                        </label>
                                        <div className="text-sm font-medium">
                                            {record[field.name] || '-'}
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
