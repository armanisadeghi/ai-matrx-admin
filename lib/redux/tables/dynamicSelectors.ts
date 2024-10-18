// // lib/redux/tables/selectors.ts
//
// import { RootState } from "@/lib/redux/store";
// import {createSelector} from "@reduxjs/toolkit";
// import {AltOptionKeys, TableSchema} from "@/types/tableSchemaTypes";
//
// }
//
//
// export function createTableSelectors<T extends TableSchema>(tableName: AltOptionKeys<T>) {
//
//
//     const getTableState = (state: RootState): T => state[tableName] as T;
//
//     const getInitiated = createSelector([getTableState], (state) => state.initiated);
//     const getData = createSelector([getTableState], (state) => state.data);
//     const getConfigs = createSelector([getTableState], (state) => state.configs);
//     const getUserPreferences = createSelector([getTableState], (state) => state.userPreferences);
//     const getLoading = createSelector([getTableState], (state) => state.loading);
//     const getError = createSelector([getTableState], (state) => state.error);
//     const getStaleTime = createSelector([getTableState], (state) => state.staleTime);
//
//     const getOneData = <K extends keyof T['data']>(key: K) =>
//         createSelector([getData], (data) => data[key]);
//
//     const getOneConfig = <K extends keyof T['configs']>(key: K) =>
//         createSelector([getConfigs], (configs) => configs[key]);
//
//     const getOneUserPreference = <K extends keyof T['userPreferences']>(key: K) =>
//         createSelector([getUserPreferences], (userPreferences) => userPreferences[key]);
//
//     return {
//         getTableState,
//         getInitiated,
//         getData,
//         getConfigs,
//         getUserPreferences,
//         getLoading,
//         getError,
//         getStaleTime,
//         getOneData,
//         getOneConfig,
//         getOneUserPreference,
//     };
// };
//
// export type TableSelectors<T extends TableSchema> = ReturnType<typeof createTableSelectors<T>>;
