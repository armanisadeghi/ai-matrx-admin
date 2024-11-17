// components/record-display/layouts/CustomLayout.tsx
import {EntityStateFieldWithValue} from '@/lib/redux/entity/types';
import {RecordDisplayConfig} from "@/components/matrx/Entity/field-actions/types";


interface CustomLayoutProps {
    fields: EntityStateFieldWithValue[];
    config: RecordDisplayConfig;
    onChange?: (fieldName: string, value: any) => void;
}

export const CustomLayout: React.FC<CustomLayoutProps> = (
    {
        fields,
        config,
        onChange
    }) => {
    const CustomRenderer = config.customRenderer;

    if (!CustomRenderer) {
        return (
            <div className="p-4 text-muted-foreground text-center">
                No custom renderer provided
            </div>
        );
    }

    return (
        <CustomRenderer
            fields={fields}
            config={config}
            onChange={onChange}
        />
    );
};
