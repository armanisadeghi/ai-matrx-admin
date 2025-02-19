// "use client";

// import { useMemo, useCallback } from "react";
// import { useCreateUpdateBrokerValue } from "./useBrokerValueNew";
// import { DataBrokerData } from "@/types";

// type BrokerValueHook = ReturnType<typeof useCreateUpdateBrokerValue>;

// export const useMultipleBrokerValues = (brokers: DataBrokerData[]) => {
//     const brokerIds = useMemo(() => brokers.map((broker) => broker.id), [brokers]);

//     const brokerHooks: Record<string, BrokerValueHook> = {};

//     brokerIds.forEach((brokerId) => {
//         brokerHooks[brokerId] = useCreateUpdateBrokerValue(brokerId);
//     });

//     const getBrokerHook = useCallback(
//         (brokerId: string): BrokerValueHook | undefined => {
//             return brokerHooks[brokerId];
//         },
//         [brokerHooks]
//     );

//     const setValueForBroker = useCallback(
//         (brokerId: string, value: any): void => {
//             const hook = brokerHooks[brokerId];
//             if (hook) {
//                 hook.setValue(value);
//             }
//         },
//         [brokerHooks]
//     );

//     const setBulkValue = useCallback(
//         (value: any, specificBrokerIds?: string[]): void => {
//             const targetBrokerIds = specificBrokerIds || Object.keys(brokerHooks);

//             targetBrokerIds.forEach((brokerId) => {
//                 const hook = brokerHooks[brokerId];
//                 if (hook) {
//                     hook.setValue(value);
//                 }
//             });
//         },
//         [brokerHooks]
//     );

//     const setBulkTags = useCallback(
//         (tags: string[], specificBrokerIds?: string[]): void => {
//             const targetBrokerIds = specificBrokerIds || Object.keys(brokerHooks);

//             targetBrokerIds.forEach((brokerId) => {
//                 const hook = brokerHooks[brokerId];
//                 if (hook) {
//                     hook.handleUpdateTags(tags);
//                 }
//             });
//         },
//         [brokerHooks]
//     );

//     const setBulkCategory = useCallback(
//         (category: string, specificBrokerIds?: string[]): void => {
//             const targetBrokerIds = specificBrokerIds || Object.keys(brokerHooks);

//             targetBrokerIds.forEach((brokerId) => {
//                 const hook = brokerHooks[brokerId];
//                 if (hook) {
//                     hook.handleUpdateCategory(category);
//                 }
//             });
//         },
//         [brokerHooks]
//     );

//     const setBulkSubCategory = useCallback(
//         (subCategory: string, specificBrokerIds?: string[]): void => {
//             const targetBrokerIds = specificBrokerIds || Object.keys(brokerHooks);

//             targetBrokerIds.forEach((brokerId) => {
//                 const hook = brokerHooks[brokerId];
//                 if (hook) {
//                     hook.handleUpdateSubCategory(subCategory);
//                 }
//             });
//         },
//         [brokerHooks]
//     );

//     const setBulkComments = useCallback(
//         (comments: string, specificBrokerIds?: string[]): void => {
//             const targetBrokerIds = specificBrokerIds || Object.keys(brokerHooks);

//             targetBrokerIds.forEach((brokerId) => {
//                 const hook = brokerHooks[brokerId];
//                 if (hook) {
//                     hook.handleUpdateComments(comments);
//                 }
//             });
//         },
//         [brokerHooks]
//     );

//     const saveAll = useCallback(
//         async (specificBrokerIds?: string[]): Promise<string[]> => {
//             const targetBrokerIds = specificBrokerIds || Object.keys(brokerHooks);
//             const savedRecordIds: string[] = [];

//             for (const brokerId of targetBrokerIds) {
//                 const hook = brokerHooks[brokerId];
//                 if (hook) {
//                     hook.handleSave();
//                     if (hook.recordId) {
//                         savedRecordIds.push(hook.recordId);
//                     }
//                 }
//             }

//             return savedRecordIds;
//         },
//         [brokerHooks]
//     );

//     const getAllValues = useCallback((): Record<string, any> => {
//         const values: Record<string, any> = {};

//         Object.entries(brokerHooks).forEach(([brokerId, hook]) => {
//             values[brokerId] = hook.valueEntry;
//         });

//         return values;
//     }, [brokerHooks]);

//     const filterBrokers = useCallback(
//         (predicate: (hook: BrokerValueHook) => boolean): string[] => {
//             return Object.entries(brokerHooks)
//                 .filter(([_, hook]) => predicate(hook))
//                 .map(([brokerId]) => brokerId);
//         },
//         [brokerHooks]
//     );

//     return {
//         brokerHooks,
//         getBrokerHook,
//         setValueForBroker,
//         setBulkValue,
//         setBulkTags,
//         setBulkCategory,
//         setBulkSubCategory,
//         setBulkComments,
//         saveAll,
//         getAllValues,
//         filterBrokers,
//         brokerIds: Object.keys(brokerHooks),
//         brokerCount: Object.keys(brokerHooks).length,
//     };
// };
