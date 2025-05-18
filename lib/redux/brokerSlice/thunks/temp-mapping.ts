import { createAsyncThunk } from "@reduxjs/toolkit";
import { BrokerMapEntry, BrokerIdentifier } from "../types";
import { v4 as uuidv4 } from "uuid";
import { brokerActions } from "../index";

export interface TempBrokerConfig {
    source: string;
    count?: number;
    // Optional fixed values
    sourceId?: string;
    ids?: string[];
    brokerIds?: string[];
    // Pattern for generating IDs
    idPattern?: (index: number) => string;
    brokerIdPattern?: (index: number) => string;
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
    async (config, { dispatch, rejectWithValue }) => {
        const {
            source,
            count = 1,
            sourceId = uuidv4(),
            ids,
            brokerIds,
            idPattern = (i) => `temp-item-${Date.now()}-${i}`,
            brokerIdPattern = (i) => uuidv4(),
        } = config;

        // Validate inputs
        if (!source) {
            return rejectWithValue("Source must be a non-empty string");
        }
        if (ids) {
            const uniqueIds = new Set(ids);
            if (uniqueIds.size !== ids.length) {
                return rejectWithValue("IDs must be unique");
            }
            if (ids.some(id => !id)) {
                return rejectWithValue("IDs must be non-empty");
            }
        }
        if (brokerIds) {
            const uniqueBrokerIds = new Set(brokerIds);
            if (uniqueBrokerIds.size !== brokerIds.length) {
                return rejectWithValue("Broker IDs must be unique");
            }
        }

        // Generate entries
        const entries: BrokerMapEntry[] = [];
        const identifiers: BrokerIdentifier[] = [];

        for (let i = 0; i < count; i++) {
            const id = ids?.[i] || idPattern(i);
            const brokerId = brokerIds?.[i] || brokerIdPattern(i);

            const entry: BrokerMapEntry = {
                source,
                sourceId,
                mappedItemId: id,
                brokerId,
            };

            entries.push(entry);
            identifiers.push({ source, mappedItemId: id });
        }

        // Add to broker map
        dispatch(brokerActions.addOrUpdateRegisterEntries(entries));

        // Provide cleanup function
        const cleanup = () => {
            dispatch(brokerActions.removeRegisterEntries(identifiers));
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
        id?: string;
        brokerId?: string;
    }
>("brokerConcept/createTempBroker", async ({ source, sourceId, id, brokerId }, { dispatch }) => {
    const result = await dispatch(
        createTempBrokerMappings({
            source,
            count: 1,
            sourceId,
            ids: id ? [id] : undefined,
            brokerIds: brokerId ? [brokerId] : undefined,
        })
    ).unwrap();

    return {
        identifier: result.identifiers[0],
        entry: result.entries[0],
        cleanup: result.cleanup,
    };
});