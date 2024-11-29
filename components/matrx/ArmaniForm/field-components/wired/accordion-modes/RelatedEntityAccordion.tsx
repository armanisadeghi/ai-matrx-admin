import * as React from 'react';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui";
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {cn} from "@/lib/utils";
import {ChevronRight, ChevronDown} from 'lucide-react';
import {MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";
import {useFetchRelated, ViewModeOption} from "@/lib/redux/entity/hooks/useFetchRelated";

import {EntityInlineProps, ViewModeOptions} from './types';
import {CreateMode} from "./CreateMode";
import {ViewMode} from "./ViewMode";
import {EditMode} from "./EditMode";
import {useCallback} from "react";
import {useEntityForm} from "@/lib/redux/entity/hooks/useEntityForm";
import {makeSelectEntityNameByFormat, selectEntityPrettyName} from '@/lib/redux/schema/globalCacheSelectors';
import { useAppSelector } from '@/lib/redux/hooks';
import {createEntitySelectors} from "@/lib/redux/entity/selectors";


function RelatedEntityAccordion(
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
        displayField,
        expandedFields,
        hoveredItem,
        toggleFieldExpansion,
        setHoveredItem,
        truncateText,
        matrxRecordId,
        individualFieldInfo,
        entityPrettyName,
    } = useFetchRelated({
        entityKey,
        dynamicFieldInfo,
        formData,
        activeEntityKey,
    });

    const [viewModeOption, setViewModeOption] = React.useState<ViewModeOptions>('view');

    const form = useEntityForm(entityKey);

    const handleModeChange = useCallback((mode: ViewModeOption, matrxRecordId?: MatrxRecordId) => {
        setViewModeOption(mode);
        console.log('Passing liveEntityFieldInfo to child:', individualFieldInfo);

        switch (mode) {
            case 'edit':
                if (matrxRecordId && records[matrxRecordId]) {
                    form.form.reset(records[matrxRecordId]);
                    form.handleEdit();
                }
                break;
            case 'create':
                form.form.reset(form.defaultValues);
                form.handleNew();
                break;
            case 'view':
                if (matrxRecordId && records[matrxRecordId]) {
                    form.form.reset(records[matrxRecordId]);
                }
                form.handleCancel();
                break;
        }
    }, [form, records]);


    const renderContent = (matrxRecordId: MatrxRecordId, record: EntityData<EntityKeys>) => {
        const commonProps = {
            matrxRecordId,
            record,
            individualFieldInfo,
            displayField,
            entityKey,
            onModeChange: handleModeChange,
            form,
            expandedFields,
            toggleFieldExpansion,
            truncateText,
        };

        switch (viewModeOption) {
            case 'view':
                return <ViewMode {...commonProps} />;
            case 'edit':
                return <EditMode {...commonProps} />;
            case 'create':
                return <CreateMode {...commonProps} />;
            default:
                return <ViewMode {...commonProps} />;
        }
    };

    return (
        <div className="col-span-full">
            <Accordion
                type="single"
                collapsible
                className="w-full bg-card-background space-y-1 border rounded-lg p-2"
            >
                <div className="mb-2">
                    <h3 className="text-lg font-medium text-secondary-foreground px-3 py-1 inline-block rounded-md">
                        Associated {entityPrettyName} Records
                    </h3>
                </div>

                {viewModeOption === 'create' ? (
                    <AccordionItem value="new" className="border rounded-lg">
                        <AccordionTrigger>
                            <div className="flex items-center space-x-2">
                                <ChevronRight
                                    className="h-5 w-5 text-primary shrink-0 transition-transform duration-200"/>
                                <span className="font-semibold text-primary">New Record</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            {renderContent(null as any, {} as EntityData<EntityKeys>)}
                        </AccordionContent>
                    </AccordionItem>
                ) : (
                     Object.entries(records).map(([matrxRecordId, record]) => (
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
                                 {renderContent(matrxRecordId, record)}
                             </AccordionContent>
                         </AccordionItem>
                     ))
                 )}
            </Accordion>
        </div>
    );
}

export default RelatedEntityAccordion;
