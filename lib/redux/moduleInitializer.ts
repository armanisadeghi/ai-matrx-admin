// // lib/redux/moduleInitializer.ts
//
// import { AppDispatch } from '@/lib/redux/store';
// import { createModuleSlice } from '@/lib/redux/slices/moduleSliceCreator';
//
// type InitialData = Record<string, any>;
//
// export const initializeModuleState = (
//     dispatch: AppDispatch,
//     moduleName: string,
//     initialData: Record<string, any>,
//     initialItems: Record<string, any>,
//     initialUserPreferences: Record<string, any>,
//     staleTime: number = 600000
// ) => {
//     const { actions } = createModuleSlice(moduleName, initialData, initialItems, staleTime);
//
//     // Dispatch the initial state
//     dispatch(actions.setData(initialData));
//     dispatch(actions.setItems(initialItems));
//     dispatch(actions.setUserPreferences(initialUserPreferences));
// };
