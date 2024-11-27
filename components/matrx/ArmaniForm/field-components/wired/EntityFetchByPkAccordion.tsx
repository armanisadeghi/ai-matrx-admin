import * as React from 'react';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {useAppDispatch, useAppSelector} from "@/lib/redux/hooks";
import {cn} from "@/lib/utils";
import {ChevronRight, ChevronDown} from 'lucide-react';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';
import {EntityStateField, MatrxRecordId} from "@/lib/redux/entity/types";
import {useCallback} from "react";
import {Callback, callbackManager} from "@/utils/callbackManager";
import {getEntitySlice} from "@/lib/redux/entity/entitySlice";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";

interface EntityFetchByPkAccordionProps {
    entityKey: EntityKeys;
    dynamicFieldInfo: EntityStateField;
    value: any;
    onChange: (value: any) => void;
    density?: 'compact' | 'normal' | 'comfortable';
    animationPreset?: 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful';
    size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    className?: string;
    variant: MatrxVariant;
    floatingLabel?: boolean;
    formData: EntityData<EntityKeys>;
    activeEntityKey?: EntityKeys;
}

function EntityFetchByPkAccordion(
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
    }: EntityFetchByPkAccordionProps) {
    const quickReference = useQuickReference(entityKey);
    const dispatch = useAppDispatch();
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);

    const fieldValue = React.useMemo(() => {
        if (!formData || !dynamicFieldInfo?.entityName) {
            return null;
        }
        return formData[dynamicFieldInfo.entityName];
    }, [formData, dynamicFieldInfo]);

    const matrxRecordId = useAppSelector(state =>
        fieldValue ? selectors.selectMatrxRecordIdFromValue(state, fieldValue) : null
    );

    const fetchOne = useCallback((recordId: MatrxRecordId, callback?: Callback) => {
        if (callback) {
            const callbackId = callbackManager.register(callback);
            dispatch(
                actions.fetchOne({
                    matrxRecordId: recordId,
                    callbackId,
                })
            );
        } else {
            dispatch(
                actions.fetchOne({
                    matrxRecordId: recordId
                })
            );
        }
    }, [dispatch, actions]);

    const {records, fieldInfo, displayField} = useAppSelector(selectors.selectCombinedRecordsWithFieldInfo);

    React.useEffect(() => {
        if (matrxRecordId) {
            const existingRecord = records[matrxRecordId];
            if (!existingRecord) {
                fetchOne(matrxRecordId);
                console.log(" useEffect Fetching One using matrxRecordId: ", matrxRecordId);
            }
        }
    }, [entityKey, value, matrxRecordId, fetchOne, records]);

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

export default EntityFetchByPkAccordion;
