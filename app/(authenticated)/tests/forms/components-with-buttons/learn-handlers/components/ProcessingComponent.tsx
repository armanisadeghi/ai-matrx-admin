import React, {useState} from "react";
import {Loader2, Plus} from "lucide-react";
import {Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui";
import { ProcessingComponentProps, ProcessingState, ProcessingChoice, ProcessingChoices, ProcessingResults } from "../types";

const ProcessingComponent: React.FC<ProcessingComponentProps> = (
    {
        initialData,
        settings,
        onComplete,
        allowNewCreation = false
    }) => {
    const [state, setState] = useState<ProcessingState>({
        step: 1,
        loading: false,
        choices: {
            choice1: "",
            choice2: "",
            choice3: "",
        },
        newChoice: "",
        showNewChoiceInput: false
    });

    const getChoicesForOption = (): ProcessingChoice => {
        const selectedOptionData = settings.options.find(
            opt => opt.id === initialData.selectedOption
        );
        return selectedOptionData?.processingChoices || {
            choice1: [],
            choice2: [],
            choice3: []
        };
    };

    const availableChoices = getChoicesForOption();

    const handleChoiceChange = (choice: keyof ProcessingChoices, value: string) => {
        setState(prev => ({
            ...prev,
            choices: {...prev.choices, [choice]: value}
        }));
    };

    const handleNewChoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setState(prev => ({
            ...prev,
            newChoice: e.target.value
        }));
    };

    const handleAddNewChoice = () => {
        setState(prev => ({
            ...prev,
            showNewChoiceInput: true
        }));
    };

    const handleSave = () => {
        setState(prev => ({...prev, loading: true}));
        // Simulate API call
        setTimeout(() => {
            const results: ProcessingResults = {
                ...initialData,
                ...state.choices,
                ...(state.newChoice && {customChoice: state.newChoice}),
                timestamp: new Date().toISOString()
            };
            onComplete(results);
        }, 1000);
    };

    return (
        <div className="space-y-4">
            {state.loading ? (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="animate-spin"/>
                </div>
            ) : (
                 <>
                     <div className="space-y-2">
                         {(Object.keys(availableChoices) as Array<keyof ProcessingChoice>).map((choiceKey) => (
                             <Select
                                 key={choiceKey}
                                 value={state.choices[choiceKey]}
                                 onValueChange={(value) => handleChoiceChange(choiceKey, value)}
                             >
                                 <SelectTrigger>
                                     <SelectValue placeholder={`Select ${choiceKey}`}/>
                                 </SelectTrigger>
                                 <SelectContent>
                                     {availableChoices[choiceKey]?.map(choice => (
                                         <SelectItem key={choice} value={choice}>
                                             {choice}
                                         </SelectItem>
                                     ))}
                                 </SelectContent>
                             </Select>
                         ))}

                         {allowNewCreation && !state.showNewChoiceInput && (
                             <Button
                                 variant="outline"
                                 onClick={handleAddNewChoice}
                                 className="w-full"
                             >
                                 <Plus className="w-4 h-4 mr-2"/>
                                 Add Custom Choice
                             </Button>
                         )}

                         {state.showNewChoiceInput && (
                             <Input
                                 value={state.newChoice}
                                 onChange={handleNewChoiceChange}
                                 placeholder="Enter custom choice..."
                                 className="mt-2"
                             />
                         )}
                     </div>

                     <Button
                         onClick={handleSave}
                         disabled={!Object.values(state.choices).every(Boolean)}
                         className="w-full"
                     >
                         Save Choices
                     </Button>
                 </>
             )}
        </div>
    );
};

export default ProcessingComponent;
