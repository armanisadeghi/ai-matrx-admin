import { DataInputComponentData, DataInputComponentRecordWithKey, DataOutputComponentData, EntityDataWithKey, MatrxRecordId, MessageBrokerData } from '@/types';
import { useCreateWithId } from '@/app/entities/hooks/crud/useDirectCreateRecord';
import { useUser } from '@/lib/hooks/useUser';
import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useFieldUpdate } from '@/app/entities/hooks/unsaved-records/useUpdateFields';
import { createEntitySelectors, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { DataBrokerDataWithKey, DataInputComponent } from '../types';


interface CreateBrokerValueOptions {
    onSuccess?: (newRecordWithKey: EntityDataWithKey<'brokerValue'>) => void;
    onError?: (error: Error) => void;
    showToast?: boolean;
}

type OptionalBrokerValueData = {
    id?: string;
    tags?: string[];
    data?: Record<'value', unknown>;
    category?: string;
    subCategory?: string;
    comments?: string;
};

type BrokerValueRecordWithKey = {
    id: string;
    dataBroker: string;
    createdAt?: Date;
    userId: string;
    tags: string[];
    data: Record<'value', unknown>;
    category: string;
    subCategory: string;
    comments: string;
    matrxRecordId?: MatrxRecordId;
}


export const useCreateBrokerValue = ({ onSuccess, onError, showToast = false }: CreateBrokerValueOptions = {}) => {
    const createWithId = useCreateWithId({
        entityKey: 'brokerValue',
        onSuccess,
        onError,
        showToast,
    });

    const { userId } = useUser();

    return useCallback(
        async (broker: DataBrokerDataWithKey, additionalData: OptionalBrokerValueData = {}): Promise<BrokerValueRecordWithKey> => {
            const id = additionalData.id || uuidv4();
            const matrxRecordId = `id:${id}`;

            const brokerValueData: BrokerValueRecordWithKey = {
                id,
                userId,
                dataBroker: broker.id,
                data: { "value": broker.defaultValue },
                ...(additionalData.tags && { tags: additionalData.tags }),
                ...(additionalData.data && { data: additionalData.data }),
                ...(additionalData.category && { category: additionalData.category }),
                ...(additionalData.subCategory && { subCategory: additionalData.subCategory }),
                ...(additionalData.comments && { comments: additionalData.comments }),
            };

            const newRecordWithKey = await createWithId({
                data: brokerValueData,
                matrxRecordId,
            })

            console.log('useCreateBrokerValue newRecordWithKey', newRecordWithKey);

            return newRecordWithKey as unknown as BrokerValueRecordWithKey;
        },
        [createWithId, userId]
    );
};

export function useBrokerValue(broker: DataBrokerDataWithKey) {
    const dispatch = useAppDispatch();
    const primaryEntity = 'brokerValue';
    const { actions, selectors } = useEntityTools(primaryEntity);
    const [brokerValueRecord, setBrokerValueRecord] = useState<BrokerValueRecordWithKey | null>(null);
    const recordId = brokerValueRecord?.matrxRecordId;

    const dataInputComponentSelectors = createEntitySelectors('dataInputComponent');
    const componentMatrxId = `id:${broker.inputComponent}`;
    const inputComponent = useAppSelector((state) => dataInputComponentSelectors.selectRecordWithKey(state, componentMatrxId)) as unknown as DataInputComponent;



    const createBrokerValue = useCreateBrokerValue({
        onSuccess: (result) => {
            console.log('useBrokerValue onSuccess result', result);
            setBrokerValueRecord(result as BrokerValueRecordWithKey);
        },
    });

    useEffect(() => {
        const createValue = async () => {
            if (!broker) return;
            await createBrokerValue(broker);
        };
        createValue();
    }, [broker]);


    const updateMyField = useFieldUpdate(primaryEntity, recordId, 'data');

    const convertValue = (value: any): any => {
        switch (broker?.dataType) {
            case 'bool':
                return Boolean(value);
            case 'int':
                return parseInt(value);
            case 'float':
                return parseFloat(value);
            case 'list':
                return Array.isArray(value) ? value : [value];
            case 'dict':
                return typeof value === 'object' ? value : {};
            default:
                return String(value);
        }
    };

    const handleSave = () => {
        dispatch(actions.updateRecord({
            matrxRecordId: recordId,
        }));
    }

    const getValue = () => {
        return brokerValueRecord?.data.value ?? broker?.defaultValue ?? '';
    };

    const setValue = (newValue: any) => {
        const convertedValue = convertValue(newValue);
        const data = { value: convertedValue };
        updateMyField(data);
    };

    return {
        value: getValue(),
        setValue,
        handleSave,
        broker,
        inputComponent,
    };
}
