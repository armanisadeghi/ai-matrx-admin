import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { createFeatureSelectors } from '@/lib/redux/featureSelectors';
import { createApiThunks } from '@/lib/redux/apiThunks';
import { featureSchemas } from '@/lib/redux/featureSchema';
import { FetchOneThunkArgs, FetchPaginatedThunkArgs, DeleteOneThunkArgs, DeleteManyThunkArgs, UpdateThunkArgs, CreateThunkArgs } from '@/types/reduxTypes';

const featureName = 'registeredFunction';
const featureSchema = featureSchemas.registeredFunction;

const selectors = createFeatureSelectors<typeof featureSchema>(featureName);
const apiThunks = createApiThunks(featureName, featureSchema);

export const useRegisteredFunction = () => {
    const dispatch = useAppDispatch();

    const items = useAppSelector(selectors.getItems);
    const allIdAndNames = useAppSelector(selectors.getAllIdAndNames);
    const totalCount = useAppSelector(selectors.getTotalCount);
    const loading = useAppSelector(selectors.getLoading);
    const error = useAppSelector(selectors.getError);

    const fetchOne = useCallback((args: FetchOneThunkArgs) => dispatch(apiThunks.fetchOne(args)), [dispatch]);
    const fetchPaginated = useCallback((args: FetchPaginatedThunkArgs) => dispatch(apiThunks.fetchPaginated(args)), [dispatch]);
    const deleteOne = useCallback((args: DeleteOneThunkArgs) => dispatch(apiThunks.deleteOne(args)), [dispatch]);
    const deleteMany = useCallback((args: DeleteManyThunkArgs) => dispatch(apiThunks.deleteMany(args)), [dispatch]);
    const update = useCallback((args: UpdateThunkArgs) => dispatch(apiThunks.update(args)), [dispatch]);
    const create = useCallback((args: CreateThunkArgs) => dispatch(apiThunks.create(args)), [dispatch]);

    return {
        // State
        items,
        allIdAndNames,
        totalCount,
        loading,
        error,

        // Thunks
        fetchOne,
        fetchPaginated,
        deleteOne,
        deleteMany,
        update,
        create,
    };
};
