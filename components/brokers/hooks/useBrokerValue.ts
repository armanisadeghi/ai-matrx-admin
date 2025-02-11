import { useGetOrFetchRecord } from '@/app/entities/hooks/records/useGetOrFetch';
import { DataInputComponentData, DataInputComponentRecordWithKey, DataOutputComponentData, MatrxRecordId, MessageBrokerData } from '@/types';
import { useCreateWithId } from '@/app/entities/hooks/crud/useDirectCreateRecord';
import { useUser } from '@/lib/hooks/useUser';
import { use, useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useFieldUpdate } from '@/app/entities/hooks/unsaved-records/useUpdateFields';
import { createEntitySelectors, useAppSelector } from '@/lib/redux';

type BrokerValueData = {
    id: string;
    createdAt?: Date;
    dataBroker?: string;
    userId?: string;
    tags?: string[];
    data?: Record<'value', unknown>;
    category?: string;
    subCategory?: string;
    comments?: string;
};

export type DataBrokerDataWithKey = {
    id: string;
    matrxRecordId: MatrxRecordId;
    name: string;
    dataType?: 'str' | 'bool' | 'dict' | 'float' | 'int' | 'list' | 'url';
    outputComponent?: string;
    defaultValue?: string;
    inputComponent?: string;
    color?:
        | 'blue'
        | 'amber'
        | 'cyan'
        | 'emerald'
        | 'fuchsia'
        | 'gray'
        | 'green'
        | 'indigo'
        | 'lime'
        | 'neutral'
        | 'orange'
        | 'pink'
        | 'purple'
        | 'red'
        | 'rose'
        | 'sky'
        | 'slate'
        | 'stone'
        | 'teal'
        | 'violet'
        | 'yellow'
        | 'zinc';
    dataInputComponentReference?: DataInputComponentData[];
    dataOutputComponentReference?: DataOutputComponentData[];
    brokerValueInverse?: BrokerValueData[];
    messageBrokerInverse?: MessageBrokerData[];
};

interface CreateBrokerValueOptions {
    onSuccess?: (result: any) => void;
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
    data: Record<string, unknown>;
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

            const result = await createWithId({
                data: brokerValueData,
                matrxRecordId,
            });

            return {
                ...brokerValueData,
                matrxRecordId,
            };
        },
        [createWithId, userId]
    );
};

export function useBrokerValue(broker: DataBrokerDataWithKey) {
    const primaryEntity = 'brokerValue';
    const [brokerValueRecord, setBrokerValueRecord] = useState<BrokerValueData | null>(null);
    const recordId = brokerValueRecord?.id;
    // const broker = useGetOrFetchRecord({ entityName: 'dataBroker', matrxRecordId: `id:${brokerId}` }) as DataBrokerDataWithKey;
    console.log('useBrokerValue broker:', broker);

    const dataInputComponentSelectors = createEntitySelectors('dataInputComponent');
    const componentMatrxId = `id:${broker.inputComponent}`;
    const inputComponent = useAppSelector((state) => dataInputComponentSelectors.selectRecordWithKey(state, componentMatrxId)) as DataInputComponentRecordWithKey;



    const createBrokerValue = useCreateBrokerValue({
        onSuccess: (result) => {
            setBrokerValueRecord(result);
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
        broker,
        inputComponent,
    };
}
