import {EntityKeys} from "@/types/entityTypes";
import React from "react";
import {useFetchRecords} from "@/lib/redux/entity/hooks/useFetchRecords";
import {MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";
import {RecordDisplayConfig} from "@/components/matrx/Entity/field-actions/types";
import {EmptyState, ErrorDisplay, LoadingSpinner} from "@/components/matrx/Entity/field-actions/components/StateComponents";
import {GridLayout} from "@/components/applet/applets/layouts/GridLayout";
import {TableLayout} from "@/components/matrx/Entity/field-actions/layouts/TableLayout";
import {CustomLayout} from "@/components/matrx/Entity/field-actions/layouts/CustomLayout";
import {FormLayout} from "@/components/matrx/Entity/field-actions/layouts/FormLayout";

// components/record-display/SingleRecordViewer.tsx
interface SingleRecordViewerProps {
    entityKey: EntityKeys;
    recordId: MatrxRecordId;
    displayConfig: RecordDisplayConfig;
    onChange?: (field: string, value: any) => void;
}

export const SingleRecordViewer: React.FC<SingleRecordViewerProps> = (
    {
        entityKey,
        recordId,
        displayConfig,
        onChange
    }) => {
    // @ts-ignore - COMPLEX: useFetchRecords expects entityKey parameter but called without args
    // TODO: Fix useFetchRecords hook call to pass required entityKey parameter
    const {fetchRecords, getFetchedRecords} = useFetchRecords(entityKey);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
        const cleanup = fetchRecords({
            entityKey,
            recordIds: [recordId],
            onComplete: () => setLoading(false),
            onError: setError
        });

        return cleanup;
    }, [entityKey, recordId]);

    const recordData = getFetchedRecords(entityKey, [recordId]);

    if (loading) return <LoadingSpinner/>;
    if (error) return <ErrorDisplay error={error}/>;
    if (!recordData) return <EmptyState/>;

    const fields = recordData.fields[0];

    // Filter and group fields based on config
    const visibleFields = fields.filter(field => {
        if (displayConfig.showFields) {
            return displayConfig.showFields.includes(field.name);
        }
        if (displayConfig.hideFields) {
            return !displayConfig.hideFields.includes(field.name);
        }
        return true;
    });

    const layoutProps = {
        fields: visibleFields,
        config: displayConfig,
        onChange
    };

    switch (displayConfig.layout) {
        case 'grid':
            {/* @ts-ignore - COMPLEX: GridLayout expects EntityStateFieldWithValue[] but receives EntityStateField[] */}
            return <GridLayout {...layoutProps as any} />;
        case 'table':
            {/* @ts-ignore - COMPLEX: TableLayout expects EntityStateFieldWithValue[] but receives EntityStateField[] */}
            return <TableLayout {...layoutProps as any} />;
        case 'custom':
            {/* @ts-ignore - COMPLEX: CustomLayout expects EntityStateFieldWithValue[] but receives EntityStateField[] */}
            return <CustomLayout {...layoutProps as any} />;
        case 'form':
        default:
            {/* @ts-ignore - COMPLEX: FormLayout expects EntityStateFieldWithValue[] but receives EntityStateField[] */}
            return <FormLayout {...layoutProps as any} />;
    }
};
