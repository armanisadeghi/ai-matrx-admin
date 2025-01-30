import { getNewMatrxRecordIdsFromMessages } from '@/features/rich-text-editor/utils/patternUtils';
import { useAppDispatch, useEntityTools } from '@/lib/redux';
import { getOrFetchSelectedRecordsThunk } from '@/lib/redux/entity/thunks';
import { MessageTemplateRecordWithKey } from '@/types';
import React, { useEffect, useState } from 'react';

interface BrokerResult {
    found: any[];
    missing: string[];
    isLoading: boolean;
}

export const useExtractEncodedBrokers = (messages: MessageTemplateRecordWithKey[], shouldProcess: boolean = true): BrokerResult => {
    const dispatch = useAppDispatch();
    const { actions: brokerActions } = useEntityTools('dataBroker');
    const [status, setStatus] = useState<BrokerResult>({
        found: [],
        missing: [],
        isLoading: false,
    });

    const uniqueEncodedBrokers = React.useMemo(() => {
        if (!shouldProcess) return [];
        return getNewMatrxRecordIdsFromMessages(messages, []);
    }, [messages, shouldProcess]);

    useEffect(() => {
        if (!uniqueEncodedBrokers.length) {
            setStatus({ found: [], missing: [], isLoading: false });
            return;
        }

        const fetchBrokers = async () => {
            setStatus((prev) => ({ ...prev, isLoading: true }));

            try {
                const results = await dispatch(
                    getOrFetchSelectedRecordsThunk({
                        entityKey: 'dataBroker',
                        actions: brokerActions,
                        payload: {
                            matrxRecordIds: uniqueEncodedBrokers,
                            fetchMode: 'fkIfk',
                        },
                    })
                ).unwrap();

                const fetchedBrokers = results.filter((result) => result.data);
                const missingBrokers = results.filter((result) => !result.data);

                setStatus({
                    found: fetchedBrokers.map((b) => b.data),
                    missing: missingBrokers.map((b) => b.recordId),
                    isLoading: false,
                });
            } catch (error) {
                console.error('Failed to fetch brokers:', error);
                setStatus({
                    found: [],
                    missing: uniqueEncodedBrokers,
                    isLoading: false,
                });
            }
        };

        fetchBrokers();
    }, [dispatch, brokerActions, uniqueEncodedBrokers]);

    return status;
};
