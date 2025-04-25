"use client";

import { Activity, CheckCircle2 } from "lucide-react";
import { useAppSelector } from "@/lib/redux";
import { selectResponseEndedByListenerId, selectTaskStreamingByListenerId } from "@/lib/redux/socket-io";

interface EventStatusIndicatorProps {
    listenerId: string;
}

export const EventStatusIndicator = ({ listenerId }: EventStatusIndicatorProps) => {
    const hasEnded = useAppSelector(selectResponseEndedByListenerId(listenerId));
    const isStreaming = useAppSelector((state) => selectTaskStreamingByListenerId(state, listenerId));

    if (!listenerId) {
        return null;
    }

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Streaming:</span>
                {isStreaming ? (
                    <Activity className="h-4 w-4 text-green-500 animate-pulse" aria-label="Currently streaming" />
                ) : (
                    <span className="h-4 w-4 inline-flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-gray-400" title="Not streaming" />
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Ended:</span>
                {hasEnded ? (
                    <CheckCircle2 className="h-4 w-4 text-blue-500" aria-label="Stream has ended" />
                ) : (
                    <span className="h-4 w-4 inline-flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-gray-400" title="Stream not ended" />
                    </span>
                )}
            </div>
        </div>
    );
};

export default EventStatusIndicator;
