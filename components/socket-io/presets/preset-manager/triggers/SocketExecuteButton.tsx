"use client";

import React, { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { useAppDispatch } from "@/lib/redux";
import { createTaskFromPresetQuick } from "@/lib/redux/socket-io/thunks/createTaskFromPreset";
import { Play, Zap } from "lucide-react";

interface SocketExecuteButtonProps extends Omit<ButtonProps, 'onClick'> {
    presetName: string;
    sourceData: any;
    buttonText?: string;
    onExecuteStart?: (data: any) => void;
    onExecuteComplete?: (taskId: string) => void;
    onExecuteError?: (error: string) => void;
}

export const SocketExecuteButton: React.FC<SocketExecuteButtonProps> = ({
    presetName,
    sourceData,
    buttonText = "Execute",
    onExecuteStart,
    onExecuteComplete,
    onExecuteError,
    ...buttonProps
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
        <Button 
            onClick={handleClick}
            disabled={isExecuting}
            {...buttonProps}
        >
            {isExecuting ? (
                <>
                    <Zap className="w-4 h-4 mr-2 animate-spin" />
                    Executing...
                </>
            ) : (
                <>
                    <Play className="w-4 h-4 mr-2" />
                    {buttonText}
                </>
            )}
        </Button>
    );
}; 