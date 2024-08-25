// File location: @/features/registered-function/Selectors.ts

import { createSelector } from 'redux-orm';
import orm from '@/lib/redux/orm';
import { RootState } from '@/lib/redux/store';

export const selectRegisteredFunctions = createSelector(
    orm,
    (state: RootState) => state.orm,
    session => session.RegisteredFunction.all().toModelArray().map(rf => rf.ref)
);

export const selectRegisteredFunctionById = createSelector(
    orm,
    (state: RootState) => state.orm,
    (_: RootState, id: string) => id,
    (session, id) => session.RegisteredFunction.withId(id)?.ref
);

export const selectRegisteredFunctionLoading = (state: RootState) => state.registeredFunction.loading;
export const selectRegisteredFunctionError = (state: RootState) => state.registeredFunction.error;
