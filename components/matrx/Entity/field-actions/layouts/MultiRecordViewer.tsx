// components/record-display/MultiRecordViewer.tsx
import {EntityKeys} from '@/types/entityTypes';
import {useFetchRecords} from '@/lib/redux/entity/hooks/useFetchRecords';
import React, {useState} from 'react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '@/components/ui/accordion';
import {EntityStateFieldWithValue, MatrxRecordId} from '@/lib/redux/entity/types/stateTypes';
import {RecordDisplayConfig} from "@/components/matrx/Entity/field-actions/types";
import {EmptyState, ErrorDisplay, LoadingSpinner} from "@/components/matrx/Entity/field-actions/components/StateComponents";
import {TableLayout} from "@/components/matrx/Entity/field-actions/layouts/TableLayout";
import {CustomLayout} from "@/components/matrx/Entity/field-actions/layouts/CustomLayout";
import {FormLayout} from "@/components/matrx/Entity/field-actions/layouts/FormLayout";
import {GridLayout} from "@/components/matrx/Entity/field-actions/layouts/GridLayout";

interface MultiRecordViewerProps {
    entityKey: EntityKeys;
    recordIds: MatrxRecordId[];
    displayConfig: RecordDisplayConfig;
    viewMode?: 'tabs' | 'accordion' | 'list';
    onChange?: (recordId: MatrxRecordId, field: string, value: any) => void;
}

export const MultiRecordViewer: React.FC<MultiRecordViewerProps> = (
    {
        entityKey,
        recordIds,
        displayConfig,
        viewMode = 'accordion',
        onChange
    }) => {
    // @ts-ignore - COMPLEX: useFetchRecords expects entityKey parameter but called without args
    const {fetchRecords, getFetchedRecords} = useFetchRecords(entityKey);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    React.useEffect(() => {
        const cleanup = fetchRecords({
            entityKey,
            recordIds,
            onComplete: () => setLoading(false),
            onError: setError
        });

        return cleanup;
    }, [entityKey, recordIds.join(',')]);

    const recordData = getFetchedRecords(entityKey, recordIds);

    if (loading) return <LoadingSpinner/>;
    if (error) return <ErrorDisplay error={error}/>;
    if (!recordData) return <EmptyState/>;

    const handleFieldChange = (recordId: MatrxRecordId) => (field: string, value: any) => {
        onChange?.(recordId, field, value);
    };

    const renderRecord = (recordId: MatrxRecordId, fields: EntityStateFieldWithValue[]) => {
        switch (displayConfig.layout) {
            case 'grid':
                return <GridLayout fields={fields} config={displayConfig} onChange={handleFieldChange(recordId)}/>;
            case 'table':
                return <TableLayout fields={fields} config={displayConfig} onChange={handleFieldChange(recordId)}/>;
            case 'custom':
                return <CustomLayout fields={fields} config={displayConfig} onChange={handleFieldChange(recordId)}/>;
            case 'form':
            default:
                return <FormLayout fields={fields} config={displayConfig} onChange={handleFieldChange(recordId)}/>;
        }
    };

    if (viewMode === 'tabs') {
        return (
            <Tabs defaultValue={recordIds[0]}>
                <TabsList>
                    {recordData.records.map((record, index) => (
                        <TabsTrigger key={record.id} value={record.id}>
                            {recordData.entityDisplayName} {index + 1}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {recordData.records.map((record, index) => (
                    <TabsContent key={record.id} value={record.id}>
                        {/* @ts-ignore - COMPLEX: recordData.fields[index] is EntityStateField[] but renderRecord expects EntityStateFieldWithValue[] */}
                        {renderRecord(record.id, recordData.fields[index] as any)}
                    </TabsContent>
                ))}
            </Tabs>
        );
    }

    if (viewMode === 'accordion') {
        return (
            <Accordion type="single" collapsible>
                {recordData.records.map((record, index) => (
                    <AccordionItem key={record.id} value={record.id}>
                        <AccordionTrigger>
                            {recordData.entityDisplayName} {index + 1}
                        </AccordionTrigger>
                        <AccordionContent>
                            {/* @ts-ignore - COMPLEX: recordData.fields[index] is EntityStateField[] but renderRecord expects EntityStateFieldWithValue[] */}
                            {renderRecord(record.id, recordData.fields[index] as any)}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        );
    }

    // List view
    return (
        <div className="space-y-8">
            {recordData.records.map((record, index) => (
                <div
                    key={record.id}
                    className="p-4 bg-card rounded-lg border border-border"
                >
                    <h3 className="text-lg font-medium mb-4">
                        {recordData.entityDisplayName} {index + 1}
                    </h3>
                    {/* @ts-ignore - COMPLEX: recordData.fields[index] is EntityStateField[] but renderRecord expects EntityStateFieldWithValue[] */}
                    {renderRecord(record.id, recordData.fields[index] as any)}
                </div>
            ))}
        </div>
    );
};
