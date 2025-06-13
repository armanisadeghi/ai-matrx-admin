"use client";

import { useMemo } from "react";
import { collectWorkflowBrokers, WorkflowBrokerCollection, BrokerInfo } from "@/features/workflows/utils/brokerCollector";
import { ConvertedWorkflowData } from "@/features/workflows/types";

export interface UseBrokerDataReturn {
    /** All broker information organized by broker ID */
    brokerCollection: WorkflowBrokerCollection;
    /** Array of all brokers for easy iteration */
    allBrokers: BrokerInfo[];
    /** Brokers that have producers (data sources) */
    producerBrokers: BrokerInfo[];
    /** Brokers that have consumers (data sinks) */
    consumerBrokers: BrokerInfo[];
    /** Brokers with no producers (orphaned) */
    orphanedBrokers: BrokerInfo[];
    /** Just the broker IDs as strings for simple use cases */
    brokerIds: string[];
    /** Producer-only broker IDs */
    producerIds: string[];
    /** Consumer-only broker IDs */
    consumerIds: string[];
    /** Check if a broker exists */
    hasBroker: (brokerId: string) => boolean;
    /** Get broker info by ID */
    getBroker: (brokerId: string) => BrokerInfo | undefined;
    /** Statistics about the broker network */
    stats: {
        total: number;
        withProducers: number;
        withConsumers: number;
        orphaned: number;
    };
}

/**
 * Custom hook to extract and organize broker data from workflow
 * @param workflowData Complete workflow data
 * @returns Organized broker information and utility functions
 */
export const useBrokerData = (workflowData?: ConvertedWorkflowData | null): UseBrokerDataReturn => {
    const brokerCollection = useMemo(() => {
        if (!workflowData) {
            return {
                allBrokers: [],
                uniqueCount: 0,
                stats: { withProducers: 0, withConsumers: 0, orphaned: 0 },
            };
        }
        return collectWorkflowBrokers(workflowData);
    }, [workflowData]);

    const derivedData = useMemo(() => {
        const allBrokers = brokerCollection.allBrokers;

        // Filter brokers by type
        const producerBrokers = allBrokers.filter((broker) => broker.producers.length > 0);
        const consumerBrokers = allBrokers.filter((broker) => broker.consumers.length > 0);
        const orphanedBrokers = allBrokers.filter((broker) => broker.producers.length === 0);

        // Extract IDs
        const brokerIds = allBrokers.map((broker) => broker.id);
        const producerIds = producerBrokers.map((broker) => broker.id);
        const consumerIds = consumerBrokers.map((broker) => broker.id);

        // Create broker lookup map
        const brokerMap = new Map(allBrokers.map((broker) => [broker.id, broker]));

        // Utility functions
        const hasBroker = (brokerId: string) => brokerMap.has(brokerId);
        const getBroker = (brokerId: string) => brokerMap.get(brokerId);

        return {
            allBrokers,
            producerBrokers,
            consumerBrokers,
            orphanedBrokers,
            brokerIds,
            producerIds,
            consumerIds,
            hasBroker,
            getBroker,
        };
    }, [brokerCollection]);

    return {
        brokerCollection,
        ...derivedData,
        stats: {
            total: brokerCollection.uniqueCount,
            withProducers: brokerCollection.stats.withProducers,
            withConsumers: brokerCollection.stats.withConsumers,
            orphaned: brokerCollection.stats.orphaned,
        },
    };
};

/**
 * Hook variant that only returns producer brokers (commonly needed for source selection)
 * @param workflowData Complete workflow data
 * @returns Only broker data for brokers that have producers
 */
export const useProducerBrokers = (workflowData?: ConvertedWorkflowData | null) => {
    const { producerBrokers, producerIds, hasBroker, getBroker } = useBrokerData(workflowData);

    return {
        brokers: producerBrokers,
        brokerIds: producerIds,
        hasBroker,
        getBroker,
        count: producerBrokers.length,
    };
};

/**
 * Hook variant that only returns consumer brokers (commonly needed for target selection)
 * @param workflowData Complete workflow data
 * @returns Only broker data for brokers that have consumers
 */
export const useConsumerBrokers = (workflowData?: ConvertedWorkflowData | null) => {
    const { consumerBrokers, consumerIds, hasBroker, getBroker } = useBrokerData(workflowData);

    return {
        brokers: consumerBrokers,
        brokerIds: consumerIds,
        hasBroker,
        getBroker,
        count: consumerBrokers.length,
    };
};
