// // lib\redux\socket\hooks\task-socket-hooks\useScraperSocket.ts

// "use client";
// import { Overrides, BrokerValues, SOCKET_TASKS } from "@/constants/socket-constants";
// import { useSocket } from "@/lib/redux/socket/hooks/useSocket";
// import { useEffect, useCallback, useMemo, useState } from "react";
// import { useSocketConnection } from "../../useSocketConnection";

// interface RunRecipeSocketProps {
//     recipeId: string;
// }

// interface BrokerValueBatch {
//     brokerId: string;
//     value: string;
// }

// export const useRunRecipeSocketNew = ({ recipeId }: RunRecipeSocketProps) => {
//     const [brokerValues, setBrokerValues] = useState<BrokerValues[]>([]);
//     const [overrides, setOverrides] = useState<Overrides>({});
//     const [readyToSubmit, setReadyToSubmit] = useState(false);

//     const addBrokerValue = (brokerId: string, value: string) => {
//         setBrokerValues([...brokerValues, { id: brokerId, name: brokerId, value: value, ready: true }]);
//     };

//     const addBrokerValueBatch = (newBrokerValues: BrokerValueBatch[]) => {
//         setBrokerValues((prevValues) => {
//             const mappedNewValues = newBrokerValues.map((broker) => ({
//                 id: broker.brokerId,
//                 name: broker.brokerId,
//                 value: broker.value,
//                 ready: true,
//             }));

//             const filteredPrevValues = prevValues.filter((prev) => !mappedNewValues.some((newVal) => newVal.id === prev.id));

//             return [...filteredPrevValues, ...mappedNewValues];
//         });
//     };

//     const setModelOverride = (modelOverride: string) => {
//         setOverrides({ ...overrides, model_override: modelOverride });
//     };



//     const socketHook = useSocketConnection();
//     const {
//         socketManager,
//         isConnected,
//         isAuthenticated
//     } = socketHook;

//     useEffect(() => {
//         setNamespace("UserSession");
//         setService("simple_recipe");
//         setTaskType("run_recipe");
//     }, []);

//     const taskSchema = useMemo(() => SOCKET_TASKS.run_recipe, []);

//     const handleSubmit = useCallback((): void => {
//         setTaskData({
//             recipe_id: recipeId,
//             broker_values: brokerValues,
//             overrides: overrides,
//             stream: true,
//         });
//         setReadyToSubmit(true);
//     }, [recipeId, brokerValues, overrides]);

//     useEffect(() => {
//         if (readyToSubmit) {
//             handleSend();
//         }
//         setReadyToSubmit(false);
//     }, [readyToSubmit, handleSend]);

//     return {
//         handleSubmit,
//         clearResults: handleClear,
//         socketHook,
//         taskSchema,
//         addBrokerValue,
//         addBrokerValueBatch,
//         setModelOverride,
//     };
// };

// export type RunRecipeSocketNewHook = ReturnType<typeof useRunRecipeSocketNew>;
