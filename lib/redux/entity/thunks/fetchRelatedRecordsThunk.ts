import { createAppThunk, getTypedEntityActions } from "@/lib/redux/utils";
import { EntityKeys, MatrxRecordId } from "@/types";
import { callbackManager } from "@/utils/callbackManager";
import { FilterCondition, SortPayload } from "../types/stateTypes";
import { FetchRecordsPayload } from "../actions";

export interface FetchRelatedRecordsPayload {
    childEntity: EntityKeys;
    childReferenceField: string;
    parentId: string;
    additionalFilters?: FilterCondition[];
    sort?: SortPayload;
    maxCount?: number;
}

interface FetchRelatedRecordsResult {
    success: boolean;
    result: any;
}

interface FetchCallbackResult {
    success: boolean;
    entityName: EntityKeys;
    result: any;
    requestData: any;
    originalPayload: FetchRecordsPayload;
}


const INFO = true;
const DEBUG = false;
const VERBOSE = false;


export const fetchRelatedRecordsThunk = createAppThunk<
    FetchRelatedRecordsResult,
    FetchRelatedRecordsPayload,
    { rejectValue: string }
>(
    "entities/fetchRelatedRecordsThunk",
    async (
        { childEntity, parentId, childReferenceField, additionalFilters = [], sort, maxCount },
        { dispatch, rejectWithValue }
    ) => {
        try {
            const actions = getTypedEntityActions(childEntity);

            const callbackId = callbackManager.register((data: FetchCallbackResult) => {
            });

            const payload: FetchRecordsPayload = {
                page: 1,
                pageSize: maxCount,
                callbackId: callbackId,
                options: {
                    filters: {
                        conditions: [
                            {
                                field: childReferenceField,
                                operator: "eq",
                                value: parentId,
                            },
                            ...additionalFilters,
                        ],
                        replace: true,
                    },
                    ...(sort ? { sort } : {}),
                },
            };

            if (VERBOSE) console.log("\x1b[34m[FETCH_RELATED_RECORDS] Payload:\x1b[0m", JSON.stringify(payload, null, 2));

            dispatch(actions.fetchRecords(payload));

            const callbackData: FetchCallbackResult = await new Promise((resolve, reject) => {
                const listener = (data: FetchCallbackResult) => {
                    resolve(data);
                };

                const success = callbackManager.subscribe(callbackId, listener);


                if (!success) {
                    const errorMsg = `Failed to subscribe to callback ${callbackId}`;
                    console.error(`FETCH_RELATED_RECORDS: ${errorMsg}`);
                    reject(new Error(errorMsg));
                }
            });

            if (callbackData.success) {
                if (DEBUG) console.log("\x1b[34m[FETCH_RELATED_RECORDS] Results:\x1b[0m", JSON.stringify(callbackData, null, 2));
                return {
                    success: true,
                    result: callbackData.result,
                };
            } else {
                console.error('FETCH_RELATED_RECORDS: Failed with callback data:', callbackData);
                throw new Error("Failed to fetch related records");
            }

        } catch (error) {
            return rejectWithValue(
                error instanceof Error ? error.message : "Failed to fetch related records"
            );
        }
    }
);