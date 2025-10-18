import React from "react";
import { RootState, useAppSelector } from "@/lib/redux";
import {selectListenerIdsByTaskId, SocketErrorObject} from "@/lib/redux/socket-io";
import {
    selectResponseTextByListenerId,
    selectResponseEndedByListenerId,
    selectResponseDataByListenerId,
    selectResponseInfoByListenerId,
    selectResponseErrorsByListenerId,
    selectResponseToolUpdatesByListenerId,
} from "@/lib/redux/socket-io";
import { selectTaskFirstListenerId } from "@/lib/redux/socket-io/selectors/socket-task-selectors";

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
    const firstListenerId = useAppSelector((state) => selectTaskFirstListenerId(state, taskId));
    const infoResponse = useAppSelector(selectResponseInfoByListenerId(firstListenerId));
    const toolUpdatesResponse = useAppSelector(selectResponseToolUpdatesByListenerId(firstListenerId));


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
                <div>Stream Error:</div>
                {streamError ? (
                    <div className="pl-2">
                        <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(streamError, null, 2)}</pre>
                    </div>
                ) : (
                    <div> - None</div>
                )}
                <div>Stream Key: {streamKey}</div>
                <div>Task Id:</div>
                <div> - {taskId}</div>
                <div>Settings:</div>
                {settings ? (
                    <div className="pl-2">
                        <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(settings, null, 2)}</pre>
                    </div>
                ) : (
                    <div> - None</div>
                )}
                <div>All Listener Ids:</div>
                {allListenerIds && allListenerIds.length > 0 ? (
                    allListenerIds.map((id, index) => (
                        <div key={index}> - {id}</div>
                    ))
                ) : (
                    <div> - None</div>
                )}
                <div>Info Response:</div>
                {infoResponse && infoResponse.length > 0 ? (
                    <div className="pl-2">
                        <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(infoResponse, null, 2)}</pre>
                    </div>
                ) : (
                    <div> - None</div>
                )}
                <div className="border-t-2 border-yellow-500 dark:border-yellow-400 pt-2 mt-2">
                    <div className="font-bold text-yellow-600 dark:text-yellow-400">Tool Updates (NEW):</div>
                </div>
                {toolUpdatesResponse && toolUpdatesResponse.length > 0 ? (
                    <div className="pl-2">
                        <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">
                            Count: {toolUpdatesResponse.length}
                        </div>
                        <pre className="text-xs whitespace-pre-wrap break-words bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                            {JSON.stringify(toolUpdatesResponse, null, 2)}
                        </pre>
                    </div>
                ) : (
                    <div className="text-gray-500 dark:text-gray-400"> - None (waiting for tool_update events...)</div>
                )}
            </div>
        </div>
    );
};

export default DebugInfo;
