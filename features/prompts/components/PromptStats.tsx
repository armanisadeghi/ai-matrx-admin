import { Clock, Zap, Hash } from "lucide-react";

interface PromptStatsProps {
    timeToFirstToken?: number;
    totalTime?: number;
    tokens?: number;
}

export function PromptStats({ timeToFirstToken, totalTime, tokens }: PromptStatsProps) {
    if (!timeToFirstToken && !totalTime && !tokens) {
        return null;
    }

    const formatTime = (ms: number) => {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        return `${(ms / 1000).toFixed(1)}s`;
    };

    return (
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {timeToFirstToken !== undefined && (
                <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{formatTime(timeToFirstToken)}</span>
                </div>
            )}
            {totalTime !== undefined && (
                <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTime(totalTime)}</span>
                </div>
            )}
            {tokens !== undefined && (
                <div className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    <span>{tokens.toLocaleString()}t</span>
                </div>
            )}
        </div>
    );
}

