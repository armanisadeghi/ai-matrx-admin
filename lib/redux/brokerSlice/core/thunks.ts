// core/thunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { BrokerMapEntry, BrokerIdentifier } from "./types";
import { v4 as uuidv4 } from "uuid";
import { brokerConceptActions } from "../index";

export interface TempBrokerConfig {
    source: string;
    count?: number;
    // Optional fixed values
    sourceId?: string;
    itemIds?: string[];
    brokerIds?: string[];
    // Pattern for generating IDs
    itemIdPattern?: (index: number) => string;
    brokerIdPattern?: (index: number) => string;
    // Whether to auto-cleanup on unmount
    autoCleanup?: boolean;
}

export interface TempBrokerResult {
    sourceId: string;
    entries: BrokerMapEntry[];
    identifiers: BrokerIdentifier[];
    cleanup: () => void;
}

// Create temporary broker mappings
export const createTempBrokerMappings = createAsyncThunk<TempBrokerResult, TempBrokerConfig>(
    "brokerConcept/createTempMappings",
    async (config, { dispatch }) => {
        const {
            source,
            count = 1,
            sourceId = uuidv4(),
            itemIds,
            brokerIds,
            itemIdPattern = (i) => `temp-item-${Date.now()}-${i}`,
            brokerIdPattern = (i) => uuidv4(),
        } = config;

        // Generate entries
        const entries: BrokerMapEntry[] = [];
        const identifiers: BrokerIdentifier[] = [];

        for (let i = 0; i < count; i++) {
            const itemId = itemIds?.[i] || itemIdPattern(i);
            const brokerId = brokerIds?.[i] || brokerIdPattern(i);

            const entry: BrokerMapEntry = {
                source,
                sourceId,
                itemId,
                brokerId,
            };

            entries.push(entry);
            identifiers.push({ source, itemId });
        }

        // Add to broker map
        const action = await dispatch(brokerConceptActions.addMapEntries(entries));

        // Create cleanup function
        const cleanup = () => {
            identifiers.forEach((id) => {
                dispatch(
                    brokerConceptActions.removeMapEntry({
                        source: id.source,
                        itemId: id.itemId,
                    })
                );
            });
        };

        return {
            sourceId,
            entries,
            identifiers,
            cleanup,
        };
    }
);

// Create a single temporary broker
export const createTempBroker = createAsyncThunk<
    {
        identifier: BrokerIdentifier;
        entry: BrokerMapEntry;
        cleanup: () => void;
    },
    {
        source: string;
        sourceId?: string;
        itemId?: string;
        brokerId?: string;
    }
>("brokerConcept/createTempBroker", async ({ source, sourceId, itemId, brokerId }, { dispatch }) => {
    const result = await dispatch(
        createTempBrokerMappings({
            source,
            count: 1,
            sourceId,
            itemIds: itemId ? [itemId] : undefined,
            brokerIds: brokerId ? [brokerId] : undefined,
        })
    ).unwrap();

    return {
        identifier: result.identifiers[0],
        entry: result.entries[0],
        cleanup: result.cleanup,
    };
});
