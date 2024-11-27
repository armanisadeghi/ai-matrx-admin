import React from "react";
import {EntityKeys} from "@/types/entityTypes";
import {useAppSelector} from "@/lib/redux/hooks";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui";
import {FormField} from "@/components/ui/form";
import {FieldFactory} from "./FieldFactory";
import {UseFormReturn} from "react-hook-form";

interface ComponentBasedFieldViewProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    form: UseFormReturn<Record<string, any>>;
    isReadOnly?: boolean;
}

const ComponentBasedFieldView = <TEntity extends EntityKeys>(
    {
        entityKey,
        form,
        isReadOnly,
    }: ComponentBasedFieldViewProps<TEntity>) => {
    const selectors = React.useMemo(
        () => createEntitySelectors(entityKey),
        [entityKey]
    );

    const fields = useAppSelector(selectors.selectFieldInfo);
    const {record: activeRecord} = useAppSelector(
        selectors.selectActiveRecordWithId
    );

    return (
        <Card className="bg-neutral-150 dark:bg-neutral-800">
            <CardHeader>
                <CardTitle>Dynamic Field View</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {fields.map(field => (
                        <FormField
                            key={field.name}
                            control={form.control}
                            name={field.name}
                            render={({field: formField}) => (
                                <FieldFactory
                                    entityKey={entityKey}
                                    field={field}
                                    formField={formField}
                                    value={form.getValues()[field.name] ?? activeRecord?.[field.name]}
                                    isReadOnly={isReadOnly}
                                />
                            )}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default ComponentBasedFieldView;
