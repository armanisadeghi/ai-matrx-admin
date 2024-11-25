import React, {useState} from 'react';
import {Textarea} from "@/components/ui/textarea";
import {
    ProcessingResults,
    IntelligentInputProps,
    IntelligentInputState,
    TriggerData
} from "../types";
import {IntelligentTrigger} from './IntelligentTrigger';

interface EnhancedIntelligentTextareaProps extends IntelligentInputProps {
    rows?: number;
}

const IntelligentTextarea: React.FC<EnhancedIntelligentTextareaProps> = (
    {
        onProcessingComplete,
        settings,
        selectedOption,
        label = "Enter text",
        rows = 4
    }) => {
    const [state, setState] = useState<IntelligentInputState>({
        inputValue: "",
        isProcessing: false
    });
    const [isFocused, setIsFocused] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
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
                <Textarea
                    value={state.inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="pr-10 pt-4 pb-2 min-h-[100px] resize-y"
                    rows={rows}
                />
                <label
                    className={`absolute left-3 transition-all duration-200 ease-in-out pointer-events-none
                        ${(isFocused || state.inputValue)
                          ? '-top-2 text-xs text-primary before:content-[""] before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-background before:to-background/80'
                          : 'top-3 text-muted-foreground'
                    }`}
                >
                    <span className="px-1 relative z-10">{label}</span>
                </label>
                <div className="absolute top-3 right-2 flex items-center">
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

export default IntelligentTextarea;
