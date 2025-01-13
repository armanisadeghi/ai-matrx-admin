import React from 'react';

import { Input } from "@/components/ui/input";
import { MatrxRecordId, AllEntityFieldKeys, EntityKeys } from '@/types/entityTypes';
import QuickRefRelatedRecordSelect from '@/app/entities/relationships/QuickRefRelatedRecordSelect';
import { useAppSelector, useEntityTools } from '@/lib/redux';

interface QuickReferenceRecord {
    recordKey: MatrxRecordId;
    primaryKeyValues: Record<AllEntityFieldKeys, any>;
    displayValue: string;
    metadata?: {
        lastModified?: string;
        createdBy?: string;
        status?: string;
    };
}

interface EntitySpecialRelatedRecordProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
    dynamicFieldInfo: any;
    ref?: React.Ref<any>;
}

const EntitySpecialRelatedRecord = React.forwardRef<HTMLDivElement, EntitySpecialRelatedRecordProps>(
    ({ value, onChange, disabled, className, dynamicFieldInfo }, ref) => {
        // Extract the entity from foreignKeyReference
        const relatedEntityName = dynamicFieldInfo?.foreignKeyReference?.entity as EntityKeys;

        // Get the related entity's selectors
        const { selectors } = useEntityTools(relatedEntityName);
        
        // Convert the simple value to a proper recordKey
        const recordKey = useAppSelector(state => 
            selectors?.selectMatrxRecordIdBySimpleKey(state, value)
        );

        // Handle the record change with the full QuickReferenceRecord
        const handleRecordChange = (record: QuickReferenceRecord) => {
            onChange(record.recordKey);
        };

        // If we don't have an entity key, show fallback input
        if (!relatedEntityName || !selectors) {
            console.warn('No entity or selectors found for related record select');
            return (
                <div ref={ref} className="w-full min-w-0">
                    <Input
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className={className}
                        placeholder={dynamicFieldInfo.displayName}
                    />
                </div>
            );
        }

        // If something goes wrong with the component, show fallback input
        try {
            return (
                <div ref={ref} className="w-full min-w-0">
                    <QuickRefRelatedRecordSelect
                        entityKey={relatedEntityName}
                        recordKey={recordKey}
                        onRecordChange={handleRecordChange}
                        disabled={disabled}
                        className={className}
                        dynamicFieldInfo={dynamicFieldInfo}
                    />
                </div>
            );
        } catch (error) {
            console.warn('Error rendering QuickRefRelatedRecordSelect:', error);
            return (
                <div ref={ref} className="w-full min-w-0">
                    <Input
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className={className}
                        placeholder={dynamicFieldInfo.displayName}
                    />
                </div>
            );
        }
    }
);

EntitySpecialRelatedRecord.displayName = 'EntitySpecialRelatedRecord';

export default React.memo(EntitySpecialRelatedRecord);
