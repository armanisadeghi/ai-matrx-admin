// features/registered-function/registeredFunctionFeature.ts

import { RegisteredFunctionBaseSchema, RegisteredFunctionBase } from '@/types/registeredFunctionTypes';
import { createFeatureSlice } from "@/lib/redux/slices/featureSliceCreator";
import { createFeatureSelectors } from "@/lib/redux/selectors/featureSelectors";
import { createFeatureActions } from '@/lib/redux/actions/featureActions';

import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { RootState } from '@/lib/redux/store';

const featureName = 'registeredFunction' as const;

const { reducer } = createFeatureSlice(featureName, RegisteredFunctionBaseSchema);

const selectors = createFeatureSelectors<typeof RegisteredFunctionBaseSchema>(featureName);

export const useRegisteredFunctionSelector = <TSelected>(
    selector: (state: RootState) => TSelected
): TSelected => useAppSelector(selector);

export const useRegisteredFunctionDispatch = useAppDispatch;

export const registeredFunctionReducer = reducer;
export const registeredFunctionSelectors = selectors;

