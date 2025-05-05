"use client";

import StreamTextDisplay from "./StreamTextDisplay";
import ResponseDataDisplay from "./SocketResponseDataDisplay";
import { useAppSelector } from "@/lib/redux";
import { selectResponseByListenerId } from "@/lib/redux/socket-io";
import ResponseInfoDisplay from "./SocketResponseInfoDisplay";
import ResponseErrorDisplay from "./SocketResponsErrorDisplay";
import FullResponseDisplay from "./SocketFullResponseDisplay";

interface StreamMonitorPanelProps {
    listenerId: string;
}

export const StreamMonitorPanel = ({ listenerId }: StreamMonitorPanelProps) => {
    const streamingState = useAppSelector(selectResponseByListenerId(listenerId));
    const eventExists = listenerId && streamingState && !!streamingState;

    if (!listenerId) {
        return (
            <div className="w-full p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">Please select or enter an event ID to monitor.</p>
            </div>
        );
    }

    if (!eventExists) {
        return (
            <div className="w-full p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                    No data found for event ID: <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">{listenerId}</code>
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    This event ID may not exist or hasn't received any data yet.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
                {/* Text Stream */}
                <StreamTextDisplay title="Stream Text" listenerId={listenerId}/>

                {/* Stream Data */}
                <ResponseDataDisplay title="Stream Data" listenerId={listenerId} />

                {/* Info Stream */}
                <ResponseInfoDisplay title="Stream Info" listenerId={listenerId} />

                {/* Error Stream */}
                <ResponseErrorDisplay
                    title="Stream Errors"
                    listenerId={listenerId}
                />

                {/* All Stream Info */}
                <div className="md:col-span-2">
                    <FullResponseDisplay
                        title="All Response Data"
                        listenerId={listenerId}
                    />
                </div>

                {/* Stream Text Content */}
                <div className="md:col-span-2">
                    <ResponseDataDisplay
                        title="Stream Text Content"
                        listenerId={listenerId}
                    />
                </div>
            </div>
        </div>
    );
};

export default StreamMonitorPanel;