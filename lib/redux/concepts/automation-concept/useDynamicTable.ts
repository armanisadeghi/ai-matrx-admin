// // lib/redux/tableSagas/useTable.ts
//
//
// import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
// import { createTableSlice } from "@/lib/redux/tables/tableSliceCreator";
// import { RootState } from "@/lib/redux/store";
// import {automationTableSchema} from "@/utils/schema/initialSchemas";
//
// type TableStateKeys = keyof typeof automationTableSchema & keyof RootState;
//
// export function useDynamicTable<K extends TableStateKeys>(tableName: K) {
//     const dispatch = useAppDispatch();
//
//     const { actions } = createTableSlice(tableName, automationTableSchema[tableName]);
//
//     const tableState = useAppSelector((state: RootState) => state[tableName]);
//
//     const tableActions = Object.keys(actions).reduce((acc, key) => {
//         acc[key] = (...args: any[]) => dispatch((actions as any)[key](...args));
//         return acc;
//     }, {} as { [key in keyof typeof actions]: (...args: Parameters<typeof actions[key]>) => void });
//
//     return { state: tableState, actions: tableActions };
// }
