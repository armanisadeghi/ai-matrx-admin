import { useDataBrokersWithFetch, useBrokerValuesWithFetch, useDataInputComponentsWithFetch } from "@/lib/redux/entity/hooks/useAllData";
import { useValueBrokersData } from "./useValueBrokers";

export function useBrokersAssociations() {
    const dataBrokerHook = useDataBrokersWithFetch();
    const brokerValueHook = useBrokerValuesWithFetch();
    const dataInputComponentHook = useDataInputComponentsWithFetch();

    const valueBrokerHook = useValueBrokersData({
        dataBrokerHook,
        brokerValueHook,
    });
    const {
        createBrokerValue,
        initializedRecords,
        dataBrokerRecords,
        brokerToValueAssociation,
        isInitialized,
        currentValue,
        setValue,
        isReady,
    } = valueBrokerHook;

    return {
        dataBrokerHook,
        brokerValueHook,
        dataInputComponentHook,
        valueBrokerHook,
        createBrokerValue,
        initializedRecords,
        dataBrokerRecords,
        brokerToValueAssociation,
        isInitialized,
        currentValue,
        setValue,
        isReady,
    };
}

export type BrokerAssociations = ReturnType<typeof useBrokersAssociations>;
