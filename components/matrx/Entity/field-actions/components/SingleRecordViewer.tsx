import {EntityKeys} from "@/types/entityTypes";
import React from "react";
import {useFetchRecords} from "@/lib/redux/entity/hooks/useFetchRecords";
import {MatrxRecordId} from "@/lib/redux/entity/types";
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
    const {fetchRecords, getFetchedRecords} = useFetchRecords();
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
            return <GridLayout {...layoutProps} />;
        case 'table':
            return <TableLayout {...layoutProps} />;
        case 'custom':
            return <CustomLayout {...layoutProps} />;
        case 'form':
        default:
            return <FormLayout {...layoutProps} />;
    }
};
