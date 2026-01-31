import { useCallback } from 'react';
import { useEntityToasts } from '@/lib/redux';
import { EntityData, EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { useCreateWithId } from './useDirectCreateRecord';

interface SequentialCreateOptions {
    firstEntity: EntityKeys;
    secondEntity: EntityKeys;
    onFirstSuccess?: (result: EntityData<EntityKeys>) => void;
    onSecondSuccess?: (result: EntityData<EntityKeys>) => void;
    onError?: (error: Error) => void;
    showIndividualToasts?: boolean;
    showCombinedToast?: boolean;
}

interface SequentialCreateCallParams {
    firstData: Record<string, unknown>;
    secondData: Record<string, unknown>;
    firstMatrxRecordId: MatrxRecordId;
    secondMatrxRecordId: MatrxRecordId;
    showIndividualToasts?: boolean;
    showCombinedToast?: boolean;
}

interface SequentialCreateResult {
    firstResult: EntityData<EntityKeys>;
    secondResult: EntityData<EntityKeys>;
}

interface RawData {
    child: Record<any, unknown>;
    joining?: Record<any, unknown>;
}

interface RelationshipCreateCallbacks {
    onSuccess?: (result: { childRecord: EntityData<EntityKeys>; joinRecord: EntityData<EntityKeys> }) => void;
    onError?: (error: Error) => void;
    showIndividualToasts?: boolean;
    showCombinedToast?: boolean;
}

interface RelationshipCreateResult {
    childRecord: EntityData<EntityKeys>;
    joinRecord: EntityData<EntityKeys>;
}

export const useSequentialCreate = ({
    firstEntity,
    secondEntity,
    onFirstSuccess,
    onSecondSuccess,
    onError,
    showIndividualToasts = false,
    showCombinedToast = false
}: SequentialCreateOptions) => {
    const firstEntityToasts = useEntityToasts(firstEntity);
    const secondEntityToasts = useEntityToasts(secondEntity);

    const firstCreateWithId = useCreateWithId({
        entityKey: firstEntity,
        onSuccess: onFirstSuccess,
        onError,
        showToast: false,
    });

    const secondCreateWithId = useCreateWithId({
        entityKey: secondEntity,
        onSuccess: onSecondSuccess,
        onError,
        showToast: false,
    });

    return useCallback(
        async ({
            firstData,
            secondData,
            firstMatrxRecordId,
            secondMatrxRecordId,
            showIndividualToasts: overrideIndividual,
            showCombinedToast: overrideCombined
        }: SequentialCreateCallParams): Promise<SequentialCreateResult> => {
            const effectiveShowIndividual = overrideIndividual ?? showIndividualToasts;
            const effectiveShowCombined = overrideCombined ?? showCombinedToast;
            
            const shouldShowIndividual = effectiveShowIndividual === true && effectiveShowCombined !== true;
            const shouldShowCombined = effectiveShowCombined === true && effectiveShowIndividual !== true;

            console.log('useSequentialCreate')

            try {
                const firstResponse = await firstCreateWithId({
                    data: firstData,
                    matrxRecordId: firstMatrxRecordId,
                });

                console.log('useSequentialCreate firstResponse', firstResponse)

                if (shouldShowIndividual) {
                    firstEntityToasts.handleCreateSuccess();
                }

                const secondResponse = await secondCreateWithId({
                    data: secondData,
                    matrxRecordId: secondMatrxRecordId,
                });

                console.log('useSequentialCreate secondResponse', secondResponse)

                if (shouldShowIndividual) {
                    secondEntityToasts.handleCreateSuccess();
                } else if (shouldShowCombined) {
                    firstEntityToasts.handleCustomSuccess('Both records created successfully');
                }

                return {
                    firstResult: firstResponse.newRecordWithKey,
                    secondResult: secondResponse.newRecordWithKey,
                };
            } catch (error) {
                if (shouldShowIndividual || shouldShowCombined) {
                    firstEntityToasts.handleError(error as Error, 'create');
                }
                onError?.(error as Error);
                throw error;
            }
        },
        [
            firstCreateWithId,
            secondCreateWithId,
            firstEntityToasts,
            secondEntityToasts,
            onError,
            showIndividualToasts,
            showCombinedToast
        ]
    );
};

