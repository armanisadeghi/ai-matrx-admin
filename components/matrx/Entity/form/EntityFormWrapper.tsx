import {useMemo} from 'react';
import {FlexAnimatedForm} from '@/components/matrx/AnimatedForm';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityFormState, FlexEntityFormProps} from '@/components/matrx/Entity/types/entityForm';
import {transformFieldsToFormFields} from '@/components/matrx/Entity/addOns/mapDataTypeToFormFieldType';
import {MatrxRecordId} from '@/lib/redux/entity/types';
import {useEntity} from "@/lib/redux/entity/useEntity";

interface EntityFormWrapperProps<TEntity extends EntityKeys> {
    entity: ReturnType<typeof useEntity>;
    entityName: TEntity;
}

function EntityFormWrapper<TEntity extends EntityKeys>(
    {
        entity,
        entityName
    }: EntityFormWrapperProps<TEntity>) {
    const formProps: FlexEntityFormProps = useMemo(() => {
        if (!entity?.activeRecord) {
            return {
                fields: [],
                formState: {},
                onUpdateField: () => {
                },
                onSubmit: () => {
                },
            };
        }

        const formFields = transformFieldsToFormFields(entity.fieldInfo);

        return {
            fields: formFields,
            formState: entity.activeRecord as EntityFormState,
            onUpdateField: (name: string, value: any) => {
                if (!entity.activeRecord || !entity.primaryKeyMetadata) return;

                const primaryKeyValues = entity.primaryKeyMetadata.fields.reduce((acc, field) => ({
                    ...acc,
                    [field]: entity.activeRecord[field]
                }), {} as Record<string, MatrxRecordId>);

                const update = {
                    [name]: value
                } as Partial<EntityData<TEntity>>;

                entity.updateRecord(primaryKeyValues, update);
            },
            onSubmit: () => {
                if (!entity.activeRecord || !entity.primaryKeyMetadata) return;
                console.log('Form submitted:', entity.activeRecord);
            },
            layout: 'grid',
            direction: 'row',
            enableSearch: false,
            columns: 2,
            isSinglePage: true,
            isFullPage: true
        };
    }, [entity.fieldInfo, entity.primaryKeyMetadata, entity]);

    return (
        <div className="p-4">
            {entity.activeRecord && <FlexAnimatedForm {...formProps} />}
        </div>
    );
}

export default EntityFormWrapper;
