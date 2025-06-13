"use client";
import React, { useState } from "react";
import { useAppDispatch } from "@/lib/redux";
import { createTaskFromPresetQuick } from "@/lib/redux/socket-io/thunks/createTaskFromPreset";
import { Play, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SocketExecuteButtonProps {
    presetName: string;
    sourceData: any;
    buttonText?: string;
    tooltipText?: string;
    onExecuteStart?: (data: any) => void;
    onExecuteComplete?: (taskId: string) => void;
    onExecuteError?: (error: string) => void;
    className?: string;
}

export const SocketExecuteButton: React.FC<SocketExecuteButtonProps> = ({
    presetName,
    sourceData,
    buttonText = "",
    tooltipText = "Execute",
    onExecuteStart,
    onExecuteComplete,
    onExecuteError,
    className = "",
}) => {
    const dispatch = useAppDispatch();
    const [isExecuting, setIsExecuting] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent event bubbling to parent elements
        setIsExecuting(true);
        try {
            onExecuteStart?.(sourceData);
                        
            const taskId = await dispatch(createTaskFromPresetQuick({
                presetName,
                sourceData
            })).unwrap();
            
            onExecuteComplete?.(taskId);
                        
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            onExecuteError?.(errorMessage);
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className={`inline-flex items-center ${className}`}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={handleClick}
                        disabled={isExecuting}
                        className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExecuting ? (
                            <Zap className="w-4 h-4 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent className="px-2 py-1">
                    {tooltipText}
                </TooltipContent>
            </Tooltip>
            {buttonText && (
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {buttonText}
                </span>
            )}
        </div>
    );
};