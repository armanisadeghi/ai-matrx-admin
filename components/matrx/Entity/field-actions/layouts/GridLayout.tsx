// components/record-display/layouts/GridLayout.tsx
import { EntityStateFieldWithValue } from '@/lib/redux/entity/types/stateTypes';
import { cn } from '@/lib/utils';
import {RecordDisplayConfig} from "@/components/matrx/Entity/field-actions/types";
import {FieldDisplay} from "@/components/matrx/Entity/field-actions/components/FieldDisplay";

interface GridLayoutProps {
    fields: EntityStateFieldWithValue[];
    config: RecordDisplayConfig;
    onChange?: (fieldName: string, value: any) => void;
}

export const GridLayout: React.FC<GridLayoutProps> = ({
                                                          fields,
                                                          config,
                                                          onChange
                                                      }) => {
    const columns = config.gridColumns || 3;

    return (
        <div className={cn(
            "grid gap-4",
            `grid-cols-${columns}`
        )}>
            {fields.map(field => (
                <div
                    key={field.name}
                    className="bg-card p-4 rounded-lg border border-border"
                >
                    <FieldDisplay
                        field={field}
                        customComponent={config.customComponents?.[field.name]}
                        actions={config.actions?.[field.name]}
                        onChange={(value) => onChange?.(field.name, value)}
                    />
                </div>
            ))}
        </div>
    );
};
