// core/thunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { BrokerMapEntry, BrokerIdentifier } from "../types";
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
}

export interface TempBrokerResult {
    sourceId: string;
    entries: BrokerMapEntry[];
    identifiers: BrokerIdentifier[];
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
        dispatch(brokerConceptActions.addMapEntries(entries));

        return {
            sourceId,
            entries,
            identifiers,
        };
    }
);

// Create a single temporary broker
export const createTempBroker = createAsyncThunk<
    {
        identifier: BrokerIdentifier;
        entry: BrokerMapEntry;
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
    };
});
