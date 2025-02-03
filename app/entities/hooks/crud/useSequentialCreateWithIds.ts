import { useCallback } from 'react';
import { createRecordKey, useAppSelector, useEntityTools } from '@/lib/redux';
import { EntityData, EntityKeys, MatrxRecordId } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useSequentialCreate } from './useSequentialCreate';

interface SequentialCreateWithIdsOptions {
    firstEntity: EntityKeys;
    secondEntity: EntityKeys;
    onFirstSuccess?: (result: EntityData<EntityKeys>) => void;
    onSecondSuccess?: (result: EntityData<EntityKeys>) => void;
    onError?: (error: Error) => void;
    showIndividualToasts?: boolean;
    showCombinedToast?: boolean;
}

interface SequentialCreateWithIdsResult {
    firstResult: EntityData<EntityKeys>;
    secondResult: EntityData<EntityKeys>;
    firstMatrxRecordId: MatrxRecordId;
    secondMatrxRecordId: MatrxRecordId;
}

export const useSequentialCreateWithIds = ({
    firstEntity,
    secondEntity,
    onFirstSuccess,
    onSecondSuccess,
    onError,
    showIndividualToasts = false,
    showCombinedToast = true
}: SequentialCreateWithIdsOptions) => {
    const { selectors: firstSelectors } = useEntityTools(firstEntity);
    const { selectors: secondSelectors } = useEntityTools(secondEntity);
    
    const firstPrimaryKeyMetadata = useAppSelector(firstSelectors.selectPrimaryKeyMetadata);
    const secondPrimaryKeyMetadata = useAppSelector(secondSelectors.selectPrimaryKeyMetadata);

    const sequentialCreate = useSequentialCreate({
        firstEntity,
        secondEntity,
        onFirstSuccess,
        onSecondSuccess,
        onError,
        showIndividualToasts,
        showCombinedToast
    });

    return useCallback(
        async ({
            firstData,
            secondData,
        }: {
            firstData: Record<string, unknown>;
            secondData: Record<string, unknown>;
        }): Promise<SequentialCreateWithIdsResult> => {
            const firstId = uuidv4();
            const secondId = uuidv4();

            const firstPrimaryKeyField = firstPrimaryKeyMetadata?.fields[0];
            const secondPrimaryKeyField = secondPrimaryKeyMetadata?.fields[0];

            if (!firstPrimaryKeyField || !secondPrimaryKeyField) {
                throw new Error('Primary key fields not found');
            }

            const firstDataWithId = {
                ...firstData,
                [firstPrimaryKeyField]: firstId
            };

            const secondDataWithId = {
                ...secondData,
                [secondPrimaryKeyField]: secondId
            };

            const firstMatrxRecordId = createRecordKey(firstPrimaryKeyMetadata, firstDataWithId);
            const secondMatrxRecordId = createRecordKey(secondPrimaryKeyMetadata, secondDataWithId);

            const { firstResult, secondResult } = await sequentialCreate({
                firstData: firstDataWithId,
                secondData: secondDataWithId,
                firstMatrxRecordId,
                secondMatrxRecordId
            });

            return {
                firstResult,
                secondResult,
                firstMatrxRecordId,
                secondMatrxRecordId
            };
        },
        [
            sequentialCreate,
            firstPrimaryKeyMetadata,
            secondPrimaryKeyMetadata
        ]
    );
};