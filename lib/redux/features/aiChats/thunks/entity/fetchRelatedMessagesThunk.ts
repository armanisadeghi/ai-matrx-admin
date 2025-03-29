import { getEntitySlice } from "@/lib/redux/entity/entitySlice";
import { FetchRelatedRecordsPayload, fetchRelatedRecordsThunk } from "@/lib/redux/entity/thunks/fetchRelatedRecordsThunk";
import { createAppThunk } from "@/lib/redux/utils";
import { MessageRecordMap } from "@/types";
import { createMessageForConversation } from "./createMessageThunk";


const INFO = true;
const DEBUG = false;
const VERBOSE = false;

interface FetchRelatedMessagesPayload {
    conversationId: string;
}

interface FetchRelatedMessagesResult {
    success: boolean;
    fetchResult: any;
    newMessageResult: {
        conversationId: string;
        messageId: string;
        messageTempKey: string;
        messageRecordKey: string;
    } | null;
    statusMessage?: string;
}

export const fetchRelatedMessagesThunk = createAppThunk<FetchRelatedMessagesResult, FetchRelatedMessagesPayload>(
    "chat/fetchRelatedMessages",
    async ({ conversationId }, { dispatch, getState }) => {
        const conversationActions = getEntitySlice("conversation").actions;
        const messageActions = getEntitySlice("message").actions;
        try {
            const payload: FetchRelatedRecordsPayload = {
                childEntity: "message",
                parentId: conversationId,
                childReferenceField: "conversation_id",
                additionalFilters: [
                    { field: "display_order", operator: "neq", value: 0 },
                    { field: "role", operator: "neq", value: "system" },
                ],
                sort: { field: "display_order", direction: "asc" },
                maxCount: 100,
            };

            const results = await dispatch(fetchRelatedRecordsThunk(payload)).unwrap();
            if (VERBOSE) console.log("FETCH_RELATED_MESSAGES: Results:", JSON.stringify(results, null, 2));

            const allMessageRecords = getState().entities["message"].records as MessageRecordMap;
            const matchingMessageRecords = Object.values(allMessageRecords).filter(
                (message) => message.conversationId === conversationId
            );

            if (VERBOSE) console.log("FETCH_RELATED_MESSAGES: Matching message records:", JSON.stringify(matchingMessageRecords, null, 2));

            let nextDisplayOrderToUse: number | undefined;
            let nextSystemOrderToUse: number | undefined;
            let statusMessage: string;
            let newMessageResult = null;

            if (matchingMessageRecords.length === 0) {
                statusMessage = "No messages found for this conversation";
            } else {
                // Filter messages to only include those with role = 'user'
                const userMessages = matchingMessageRecords.filter(message => message.role === 'user');
            
                if (userMessages.length === 0) {
                    statusMessage = "No user messages found in this conversation";
                } else {
                    const maxDisplayOrderMessage = userMessages.reduce((max, message) =>
                        message.displayOrder > max.displayOrder ? message : max,
                        userMessages[0]
                    );
            
                    if (maxDisplayOrderMessage.displayOrder < 1) {
                        statusMessage = "No valid message order found (all display orders are less than 1)";
                    } else {
                        nextDisplayOrderToUse = maxDisplayOrderMessage.displayOrder + 2;
                        nextSystemOrderToUse = maxDisplayOrderMessage.systemOrder + 2;
                        statusMessage = "Successfully calculated next message orders";
                    }
                }
            }

            if (nextDisplayOrderToUse !== undefined && nextSystemOrderToUse !== undefined) {
                const customDataParams = {
                    keyOrId: conversationId,
                    customData: {
                        nextDisplayOrderToUse,
                        nextSystemOrderToUse,
                        isNewChat: false,
                    },
                };

                if (DEBUG) console.log("FETCH_RELATED_MESSAGES: Custom data params:", JSON.stringify(customDataParams, null, 2));
                dispatch(conversationActions.updateCustomDataSmart(customDataParams));
                
                // Await the thunk and unwrap the result
                const messageResult = await dispatch(createMessageForConversation({
                    conversationId,
                    displayOrder: nextDisplayOrderToUse,
                    systemOrder: nextSystemOrderToUse
                })).unwrap();

                if (INFO) console.log("FETCH_RELATED_MESSAGES: New message result:", JSON.stringify(messageResult, null, 2));

                if (INFO) console.log("FETCH_RELATED_MESSAGES: Set Active Message to Temp Record:", messageResult.messageTempKey);
                dispatch(messageActions.setActiveRecord(messageResult.messageTempKey));

                newMessageResult = messageResult;
            }

            if (results.success) {
                if (DEBUG) console.log("FETCH_RELATED_MESSAGES: SUCCESS! New message result:", JSON.stringify(newMessageResult, null, 2));
                return {
                    success: true,
                    fetchResult: results.result,
                    newMessageResult, // Use the variable that's in scope
                    statusMessage,
                };
            } else {
                console.warn("FETCH_RELATED_MESSAGES FAILED: New message result:", JSON.stringify(newMessageResult, null, 2));
                return {
                    success: false,
                    fetchResult: null,
                    newMessageResult: null,
                    statusMessage: "Failed to fetch related messages from server",
                };
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Failed to fetch related messages";
            console.error("FETCH_RELATED_MESSAGES: Error:", errorMsg);
            return {
                success: false,
                fetchResult: null,
                newMessageResult: null,
                statusMessage: errorMsg,
            };
        }
    }
);