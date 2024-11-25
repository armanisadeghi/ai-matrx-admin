import React, {useState} from 'react';
import {Input} from "@/components/ui/input";
import {
    ProcessingResults,
    IntelligentInputProps,
    IntelligentInputState,
    TriggerData
} from "../types";
import {IntelligentTrigger} from './IntelligentTrigger';


const IntelligentInput: React.FC<IntelligentInputProps> = (
    {
        onProcessingComplete,
        settings,
        selectedOption,
        label = "Enter Info"
    }) => {
    const [state, setState] = useState<IntelligentInputState>({
        inputValue: "",
        isProcessing: false
    });
    const [isFocused, setIsFocused] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setState(prev => ({...prev, inputValue: e.target.value}));
    };

    const handleTriggerAction = (triggerData: TriggerData): void => {
        setState(prev => ({...prev, isProcessing: true}));
        console.log("Trigger action:", triggerData);
    };

    const handleProcessingComplete = (results: ProcessingResults): void => {
        setState(prev => ({...prev, isProcessing: false}));
        onProcessingComplete(results);
    };

    return (
        <div className="relative">
            <div className="relative">
                <Input
                    value={state.inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="pr-10 pt-2 pb-2"
                />
                <label
                    className={`absolute left-3 transition-all duration-200 ease-in-out pointer-events-none
                        ${(isFocused || state.inputValue)
                          ? '-top-2 text-xs text-primary before:content-[""] before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-background before:to-background/80'
                          : 'top-2 text-muted-foreground'
                    }`}
                >
                    {label}
                </label>
                <div className="absolute inset-y-0 right-0 flex items-center">
                    <IntelligentTrigger
                        settings={settings}
                        inputValue={state.inputValue}
                        selectedOption={selectedOption}
                        onProcessingComplete={handleProcessingComplete}
                        onTriggerAction={handleTriggerAction}
                    />
                </div>
            </div>
        </div>
    );
};

export default IntelligentInput;
