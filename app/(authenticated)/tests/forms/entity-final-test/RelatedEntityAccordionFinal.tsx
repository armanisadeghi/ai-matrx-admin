import * as React from 'react';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui";
import {cn} from "@/lib/utils";
import {ChevronRight} from 'lucide-react';
import ArmaniFormFinal from "@/app/(authenticated)/tests/forms/entity-final-test/ArmaniFormFinal";
import {getUpdatedUnifiedLayoutProps} from "@/app/(authenticated)/tests/forms/entity-final-test/configs";
import {useFetchRelatedFinal} from "@/app/(authenticated)/tests/forms/entity-final-test/useFetchRelatedFinal";
import {EntityKeys} from "@/types";
import {MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";
import {UnifiedLayoutProps} from "@/components/matrx/Entity";

export interface RelatedEntityAccordionFinalProps {
    entityKey: EntityKeys;
    unifiedLayoutProps: UnifiedLayoutProps;
    fieldValue: any;
    activeEntityRecordId: MatrxRecordId;
    activeEntityKey?: EntityKeys;
    className?: string;
}

function RelatedEntityAccordionFinal(
    {
        entityKey,
        unifiedLayoutProps,
        activeEntityRecordId,
        activeEntityKey,
        fieldValue,
    }: RelatedEntityAccordionFinalProps) {

    // console.log("+++++ RelatedEntityAccordionFinal Entity:", entityKey);

    const {
        records,
        displayField,
        hoveredItem,
        setHoveredItem,
        entityPrettyName,
        hasRecords,
        recordCount,
    } = useFetchRelatedFinal({entityKey, activeEntityRecordId, activeEntityKey, fieldValue});

    const layoutProps = React.useMemo(() => getUpdatedUnifiedLayoutProps(unifiedLayoutProps, {
        entityKey: entityKey,
        defaultFormComponent: 'ArmaniFormSmart',
        entitiesToHide: activeEntityKey ? [activeEntityKey] : undefined,
    }), [unifiedLayoutProps, entityKey, activeEntityKey]);

    // if (!hasRecords) return null;

    // console.log("Records: ", records);

    return (
        <div className="col-span-full">
            <Accordion
                type="single"
                collapsible
                className="w-full bg-card-background space-y-1 border rounded-lg p-2"
            >
                <div className="mb-2">
                    <h3 className="text-lg font-medium text-secondary-foreground px-3 py-1 inline-block rounded-md">
                        {entityPrettyName} Records: {recordCount}
                    </h3>
                </div>
                {Object.entries(records).map(([matrxRecordId, record]) => (
                    <AccordionItem
                        key={matrxRecordId}
                        value={matrxRecordId}
                        className={cn(
                            "border rounded-lg transition-colors duration-200",
                            hoveredItem === matrxRecordId && "border-secondary"
                        )}
                        onMouseEnter={() => setHoveredItem(matrxRecordId)}
                        onMouseLeave={() => setHoveredItem(null)}
                    >
                        <AccordionTrigger
                            className={cn(
                                "px-2 rounded-lg transition-colors duration-200",
                                hoveredItem === matrxRecordId && "bg-secondary/50"
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
                            <ArmaniFormFinal {...layoutProps} />
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}

export default RelatedEntityAccordionFinal;