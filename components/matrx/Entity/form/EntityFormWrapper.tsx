import {useMemo} from 'react';
import {FlexAnimatedForm} from '@/components/matrx/AnimatedForm';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityFormState, FlexEntityFormProps} from '@/components/matrx/Entity/types/entityForm';
import {transformFieldsToFormFields} from '@/components/matrx/Entity/addOns/mapDataTypeToFormFieldType';
import {MatrxRecordId} from '@/lib/redux/entity/types/stateTypes';
import { useEntityForm } from '@/lib/redux/entity/hooks/useEntityForm';

interface EntityFormWrapperProps<TEntity extends EntityKeys> {
    entityFormState: ReturnType<typeof useEntityForm>;
    entityName: TEntity;
}

function EntityFormWrapper<TEntity extends EntityKeys>(
    {
        entityFormState,
        entityName
    }: EntityFormWrapperProps<TEntity>) {
    const formProps: FlexEntityFormProps = useMemo(() => {
        if (!entityFormState?.activeRecord) {
            return {
                fields: [],
                formState: {},
                onUpdateField: () => {
                },
                onSubmit: () => {
                },
            };
        }

        const formFields = transformFieldsToFormFields(entityFormState.fieldInfo);

        return {
            fields: formFields,
            formState: entityFormState.activeRecord as EntityFormState,
            onUpdateField: (name: string, value: any) => {
                if (!entityFormState.activeRecord || !entityFormState.matrxRecordId) return;
                entityFormState.updateRecord(entityFormState.matrxRecordId, updatedData => {
                    updatedData[name] = value;
                });
            },
            onSubmit: () => {
                if (!entityFormState.activeRecord || !entityFormState.matrxRecordId) return;
                console.log('Form submitted:', entityFormState.activeRecord);
            },
            layout: 'grid',
            direction: 'row',
            enableSearch: false,
            columns: 2,
            isSinglePage: true,
            isFullPage: true
        };
    }, [entityFormState, entityFormState.fieldInfo, entityFormState.matrxRecordId]);

    return (
        <div className="p-4">
            {entityFormState.activeRecord && <FlexAnimatedForm {...formProps} />}
        </div>
    );
}

export default EntityFormWrapper;
