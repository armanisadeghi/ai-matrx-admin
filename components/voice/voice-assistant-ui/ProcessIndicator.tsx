'use client';

import {Progress} from "@/components/ui";
import React from "react";
import { ProcessState, Message, Conversation } from "@/types/voice/voiceAssistantTypes";

function ProcessIndicator({state}: { state: ProcessState }) {
    const steps = [
        {key: 'recording', label: 'Recording'},
        {key: 'processing', label: 'Processing'},
        {key: 'transcribing', label: 'Transcribing'},
        {key: 'generating', label: 'Generating Response'},
        {key: 'speaking', label: 'Speaking'},
    ];

    const activeStep = steps.findIndex(step => state[step.key as keyof ProcessState]);

    return (
        <div className="space-y-2">
            <Progress
                value={((activeStep + 1) / steps.length) * 100}
                className="h-2"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
                {steps.map((step, index) => (
                    <div
                        key={step.key}
                        className={`flex flex-col items-center ${
                            index <= activeStep ? 'text-primary' : ''
                        }`}
                    >
                        <div className={`w-3 h-3 rounded-full mb-1 ${
                            index <= activeStep ? 'bg-primary' : 'bg-muted'
                        }`}/>
                        {step.label}
                    </div>
                ))}
            </div>
        </div>
    );
}


export default ProcessIndicator;
