// File location: @/features/registered-function/Actions.ts

import { createAction } from '@reduxjs/toolkit';
import { RegisteredFunctionType } from '@/types/registeredFunctionTypes';

export const createRegisteredFunction = createAction<RegisteredFunctionType>('REGISTERED_FUNCTION_CREATE');
export const updateRegisteredFunction = createAction<RegisteredFunctionType>('REGISTERED_FUNCTION_UPDATE');
export const deleteRegisteredFunction = createAction<string>('REGISTERED_FUNCTION_DELETE');
export const fetchRegisteredFunctionsSuccess = createAction<RegisteredFunctionType[]>('REGISTERED_FUNCTION_FETCH_SUCCESS');
