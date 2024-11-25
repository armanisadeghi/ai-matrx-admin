import React, {useState, useEffect} from 'react';
import {Button} from "@/components/ui/button";
import {ArrowRight, Loader2} from "lucide-react";
import {
    TriggerProps,
    ProcessingResults,
    IntelligentTriggerState
} from "../types";
import {ConfigurationSheet} from './ConfigurationSheet';


const IntelligentTrigger: React.FC<TriggerProps> = (
    {
        settings,
        inputValue,
        selectedOption,
        onProcessingComplete,
        onTriggerAction
    }) => {
    const [state, setState] = useState<IntelligentTriggerState>({
        isActive: false,
        isProcessing: false,
        isSheetOpen: false
    });

    useEffect(() => {
        setState(prev => ({
            ...prev,
            isActive: settings.validIdPattern.test(inputValue) && Boolean(selectedOption)
        }));
    }, [inputValue, selectedOption, settings.validIdPattern]);

    const handleClick = (): void => {
        setState(prev => ({
            ...prev,
            isProcessing: true,
            isSheetOpen: true
        }));
        onTriggerAction({
            inputValue,
            selectedOption,
            timestamp: new Date().toISOString()
        });
    };

    const handleSheetClose = (): void => {
        setState(prev => ({
            ...prev,
            isSheetOpen: false,
            isProcessing: false
        }));
    };

    const handleProcessingComplete = (results: ProcessingResults): void => {
        setState(prev => ({
            ...prev,
            isProcessing: false,
            isSheetOpen: false
        }));
        onProcessingComplete(results);
    };

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                disabled={!state.isActive}
                onClick={handleClick}
                className={`${state.isActive ? 'text-primary' : 'text-muted-foreground'}`}
            >
                {state.isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin"/>
                ) : (
                     <ArrowRight className="h-4 w-4"/>
                 )}
            </Button>

            <ConfigurationSheet
                isOpen={state.isSheetOpen}
                onClose={handleSheetClose}
                settings={settings}
                initialData={{
                    inputValue,
                    selectedOption
                }}
                onProcessingComplete={handleProcessingComplete}
            />
        </>
    );
};

export {IntelligentTrigger};
