import { AnyEntityDatabaseTable, EntityData, EntityKeys } from '@/types/entityTypes';
import { createEntitySlice } from '@/lib/redux/entity/slice';
import { PayloadAction } from '@reduxjs/toolkit';
import { BatchOperationPayload, FilterPayload, HistoryEntry, MatrxRecordId, QueryOptions, UnifiedDatabaseObject } from '@/lib/redux/entity/types/stateTypes';
import EntityLogger from '@/lib/redux/entity/utils/entityLogger';
import { all, call, delay, put, select, take } from 'redux-saga/effects';
import {
    selectDatabaseConversion,
    selectEntityDatabaseName,
    selectEntityMetadata,
    selectEntityPrimaryKeyMetadata,
    selectEntityRelationships,
    selectFrontendConversion,
} from '@/lib/redux/schema/globalCacheSelectors';
import { createEntitySelectors } from '@/lib/redux/entity/selectors';
import { createRecordKey, setLoading } from '@/lib/redux/entity/utils/stateHelpUtils';
import { Draft } from 'immer';
import { BaseSagaContext, handleQuickReferenceUpdate } from '@/lib/redux';
import { FetchOneWithFkIfkPayload, GetOrFetchSelectedRecordsPayload } from '../actions';
import { createStructuredError } from '@/utils/errorContext';
import { supabase } from '@/utils/supabase/client';

const DEBOUNCE_MS = 300;
const CACHE_DURATION = 5 * 60 * 1000;
const trace = 'SAGA HANDLERS';
const sagaLogger = EntityLogger.createLoggerWithDefaults(trace, 'NoEntity');








function* handleCreateRelated<TEntity extends EntityKeys>({
    entityKey,
    actions,
    api,
    action,
    unifiedDatabaseObject,
}: BaseSagaContext<TEntity> & {
    action: PayloadAction<any>;
}) {
    const entityLogger = EntityLogger.createLoggerWithDefaults('handleCreate', entityKey);

    const dataForInsert = unifiedDatabaseObject.data;
    entityLogger.log('debug', 'Data for insert:', dataForInsert);

    try {
        const { data, error } = yield api.insert(dataForInsert).select().single();

        if (error) throw error;

        entityLogger.log('debug', 'Database response', { data });

        const payload = { entityName: entityKey, data };
        const frontendResponse = yield select(selectFrontendConversion, payload);

        const successPayload = {
            tempRecordId: unifiedDatabaseObject.tempRecordId,
            data: frontendResponse,
        };

        entityLogger.log('debug', '-- Dispatching createRecordSuccess', successPayload);

        yield put(actions.createRecordSuccess(successPayload));

        entityLogger.log('debug', 'Pushing to history', frontendResponse);

        yield put(
            actions.pushToHistory({
                timestamp: new Date().toISOString(),
                operation: 'create',
                data: frontendResponse,
            })
        );

        entityLogger.log('debug', 'Invalidating cache');

        yield put(actions.invalidateCache());

        entityLogger.log('debug', 'Handling quick reference update');

        yield* handleQuickReferenceUpdate(entityKey, actions, frontendResponse, unifiedDatabaseObject);

        entityLogger.log('debug', 'Final result', frontendResponse);

        const primaryKeyMetadata = yield select(selectEntityPrimaryKeyMetadata, entityKey);
        const recordKey = createRecordKey(primaryKeyMetadata, data);

        return {
            tempRecordId: unifiedDatabaseObject.tempRecordId,
            recordKey,
            data: frontendResponse,
        };
    } catch (error: any) {
        entityLogger.log('error', 'Create operation error', error);
        yield put(
            actions.setError({
                message: error.message || 'An error occurred during create.',
                code: error.code,
            })
        );
        throw error;
    }
}
