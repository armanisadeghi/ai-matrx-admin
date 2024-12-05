'use client';

import {AlertCircle, Loader2, Mic, Volume2} from "lucide-react";
import {motion} from "framer-motion";
import React from "react";
import { ProcessState } from "@/types/voice/voiceAssistantTypes";

function StatusIndicator({vad, processState}: {
    vad: any,
    processState: ProcessState
}) {
    if (vad.loading) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin"/>
                Initializing...
            </div>
        );
    }

    if (vad.errored) {
        return (
            <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4"/>
                Error
            </div>
        );
    }

    if (processState.speaking) {
        return (
            <div className="flex items-center gap-2 text-primary">
                <Volume2 className="w-4 h-4"/>
                Speaking
            </div>
        );
    }

    if (processState.recording) {
        return (
            <motion.div
                className="flex items-center gap-2 text-destructive"
                animate={{opacity: [1, 0.5, 1]}}
                transition={{duration: 1.5, repeat: Infinity}}
            >
                <Mic className="w-4 h-4"/>
                Recording
            </motion.div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-muted-foreground">
            <Mic className="w-4 h-4"/>
            Ready
        </div>
    );
}


export default StatusIndicator;
