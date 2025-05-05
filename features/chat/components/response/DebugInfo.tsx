import React from "react";
import { RootState, useAppSelector } from "@/lib/redux";
import {selectListenerIdsByTaskId, SocketErrorObject} from "@/lib/redux/socket-io";


export const DebugInfo: React.FC<{
    activeMessageStatus: string;
    shouldShowLoader: boolean;
    isStreaming: boolean | string;
    isStreamEnded: boolean | string;
    isStreamError: boolean | string;
    streamError: SocketErrorObject[] | null;
    streamKey: string;
    taskId: string;
    settings: any;
}> = ({ activeMessageStatus, shouldShowLoader, isStreaming, isStreamEnded, isStreamError, streamError, streamKey, taskId, settings }) => {

    const allListenerIds = useAppSelector((state: RootState) => selectListenerIdsByTaskId(state, taskId));


    return (
        <div className="fixed left-6 top-1/2 transform -translate-y-1/2 w-96 text-left p-2 my-2 bg-gray-100 dark:bg-gray-800 rounded-xl border-3 border-gray-300 dark:border-gray-600 shadow-md z-50 overflow-auto max-h-[80vh]">
            <div className="font-mono space-y-4 text-lg text-gray-700 dark:text-gray-300">
                <div>Status: {activeMessageStatus}</div>
                <div>
                    Is Streaming: <span className={isStreaming ? "text-green-500" : "text-red-500"}>{isStreaming ? "true" : "false"}</span>
                </div>
                <div>
                    Should Show Loader:{" "}
                    <span className={shouldShowLoader ? "text-green-500" : "text-red-500"}>{shouldShowLoader ? "true" : "false"}</span>
                </div>
                <div>Is Stream Ended: {isStreamEnded ? "true" : "false"}</div>
                <div>Is Stream Error: {isStreamError ? "true" : "false"}</div>
                <div>Stream Error: {JSON.stringify(streamError, null, 2)}</div>
                <div>Stream Key: {streamKey}</div>
                <div>Task Id:</div>
                <div> - {taskId}</div>
                <div>Settings:</div>
                <div> - {JSON.stringify(settings, null, 2)}</div>
                <div>All Listener Ids:</div>
                {allListenerIds && allListenerIds.length > 0 ? (
                    allListenerIds.map((id, index) => (
                        <div key={index}> - {id}</div>
                    ))
                ) : (
                    <div> - None</div>
                )}
            </div>
        </div>
    );
};

export default DebugInfo;
