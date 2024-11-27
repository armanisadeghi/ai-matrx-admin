import * as React from 'react';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui";
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {cn} from "@/lib/utils";
import {ChevronRight, ChevronDown} from 'lucide-react';
import {MatrxRecordId} from "@/lib/redux/entity/types";
import {useFetchRelated, ViewModeOption} from "@/lib/redux/entity/hooks/useFetchRelated";

import {EntityInlineProps, ViewModeOptions} from './types';
import {CreateMode} from "./CreateMode";
import {ViewMode} from "./ViewMode";
import {EditMode} from "./EditMode";
import {useCallback} from "react";
import {useEntityForm} from "@/lib/redux/entity/hooks/useEntityForm";


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


    const renderContent = (recordId: MatrxRecordId, record: EntityData<EntityKeys>) => {
        const commonProps = {
            recordId,
            record,
            dynamicFieldInfo,
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
                className="w-full space-y-1 border rounded-lg p-2"
            >
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
                     Object.entries(records).map(([recordId, record]) => (
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
                                 {renderContent(recordId, record)}
                             </AccordionContent>
                         </AccordionItem>
                     ))
                 )}
            </Accordion>
        </div>
    );
}

export default RelatedEntityAccordion;
