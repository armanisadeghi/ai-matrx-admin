'use client';

import React, {useState, useEffect} from 'react';
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter} from "@/components/ui/sheet";
import {Textarea} from "@/components/ui/textarea";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {ArrowRight, Loader2, Plus} from "lucide-react";

// Enhanced settings with nested options that influence ProcessingComponent
const APP_SETTINGS = {
    sheetTitle: "Configure Your Selection",
    sheetDescription: "Please complete the following steps",
    options: [
        {
            id: "opt1",
            label: "Option 1",
            processingChoices: {
                choice1: ["Premium A", "Premium B", "Premium C"],
                choice2: ["Gold Plan", "Platinum Plan"],
                choice3: ["Priority Support", "Standard Support"]
            }
        },
        {
            id: "opt2",
            label: "Option 2",
            processingChoices: {
                choice1: ["Basic A", "Basic B"],
                choice2: ["Silver Plan", "Bronze Plan"],
                choice3: ["Email Support", "Chat Support", "No Support"]
            }
        }
    ],
    validIdPattern: /^\d{5}$/,
};

const ProcessingComponent = (
    {
        initialData,
        settings,
        onComplete,
        allowNewCreation = false
    }) => {
    const [state, setState] = useState({
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

    // Get available choices based on the selected option
    const getChoicesForOption = () => {
        const selectedOptionData = settings.options.find(
            opt => opt.id === initialData.selectedOption
        );
        return selectedOptionData?.processingChoices || {};
    };

    const availableChoices = getChoicesForOption();

    const handleChoiceChange = (choice, value) => {
        setState(prev => ({
            ...prev,
            choices: {...prev.choices, [choice]: value}
        }));
    };

    const handleNewChoiceChange = (e) => {
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
            const results = {
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
                         <Select
                             value={state.choices.choice1}
                             onValueChange={(value) => handleChoiceChange("choice1", value)}
                         >
                             <SelectTrigger>
                                 <SelectValue placeholder="Select choice 1"/>
                             </SelectTrigger>
                             <SelectContent>
                                 {availableChoices.choice1?.map(choice => (
                                     <SelectItem key={choice} value={choice}>{choice}</SelectItem>
                                 ))}
                             </SelectContent>
                         </Select>

                         <Select
                             value={state.choices.choice2}
                             onValueChange={(value) => handleChoiceChange("choice2", value)}
                         >
                             <SelectTrigger>
                                 <SelectValue placeholder="Select choice 2"/>
                             </SelectTrigger>
                             <SelectContent>
                                 {availableChoices.choice2?.map(choice => (
                                     <SelectItem key={choice} value={choice}>{choice}</SelectItem>
                                 ))}
                             </SelectContent>
                         </Select>

                         <Select
                             value={state.choices.choice3}
                             onValueChange={(value) => handleChoiceChange("choice3", value)}
                         >
                             <SelectTrigger>
                                 <SelectValue placeholder="Select choice 3"/>
                             </SelectTrigger>
                             <SelectContent>
                                 {availableChoices.choice3?.map(choice => (
                                     <SelectItem key={choice} value={choice}>{choice}</SelectItem>
                                 ))}
                             </SelectContent>
                         </Select>

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

// IntelligentTrigger component remains mostly the same
const IntelligentTrigger = ({
                                settings,
                                inputValue,
                                selectedOption,
                                onTriggerAction,
                                isProcessing,
                                onProcessingComplete
                            }) => {
    const [state, setState] = useState({
        isActive: false,
        isProcessing: false
    });

    useEffect(() => {
        setState(prev => ({
            ...prev,
            isActive: settings.validIdPattern.test(inputValue) && selectedOption
        }));
    }, [inputValue, selectedOption, settings.validIdPattern]);

    const handleClick = () => {
        setState(prev => ({...prev, isProcessing: true}));
        onTriggerAction({
            inputValue,
            selectedOption,
            timestamp: new Date().toISOString()
        });
    };

    const handleProcessingComplete = (results) => {
        setState(prev => ({...prev, isProcessing: false}));
        onProcessingComplete(results);
    };

    return (
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
    );
};

const ConfigurationSheet = (
    {
        isOpen,
        onClose,
        settings,
        initialData,
        onProcessingComplete
    }) => {
    const [state, setState] = useState({
        isProcessing: false,
        results: null,
        allowNewCreation: false
    });

    const handleProcessingComplete = (results) => {
        setState(prev => ({
            ...prev,
            isProcessing: false,
            results
        }));
        onProcessingComplete(results);
        onClose();
    };

    const handleAllowNewCreationToggle = (checked) => {
        setState(prev => ({
            ...prev,
            allowNewCreation: checked
        }));
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{settings.sheetTitle}</SheetTitle>
                    <SheetDescription>{settings.sheetDescription}</SheetDescription>
                </SheetHeader>
                <div className="mt-4 flex-1">
                    <ProcessingComponent
                        initialData={initialData}
                        settings={settings}
                        onComplete={handleProcessingComplete}
                        allowNewCreation={state.allowNewCreation}
                    />
                </div>
                <SheetFooter className="mt-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={state.allowNewCreation}
                            onCheckedChange={handleAllowNewCreationToggle}
                        />
                        <Label>Allow Custom Choices</Label>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};

const MainPage = () => {
    const [state, setState] = useState({
        selectedOption: "",
        inputValue: "",
        textAreaValue: "",
        isSheetOpen: false,
        isProcessing: false,
        currentResults: null,
        finalResults: null
    });

    const handleSelectChange = (value) => {
        setState(prev => ({...prev, selectedOption: value}));
    };

    const handleInputChange = (e) => {
        setState(prev => ({...prev, inputValue: e.target.value}));
    };

    const handleTextAreaChange = (e) => {
        setState(prev => ({...prev, textAreaValue: e.target.value}));
    };

    const handleTriggerAction = (triggerData) => {
        setState(prev => ({
            ...prev,
            isSheetOpen: true,
            isProcessing: true
        }));
    };

    const handleSheetClose = () => {
        setState(prev => ({...prev, isSheetOpen: false}));
    };

    const handleProcessingComplete = (results) => {
        setState(prev => ({
            ...prev,
            isProcessing: false,
            currentResults: results
        }));
    };

    const handleSubmit = () => {
        setState(prev => ({
            ...prev,
            finalResults: {
                ...prev.currentResults,
                additionalNotes: prev.textAreaValue
            }
        }));
    };

    const handleCancel = () => {
        setState(prev => ({
            ...prev,
            currentResults: null,
            textAreaValue: ""
        }));
    };

    return (
        <div className="space-y-6 p-4 max-w-2xl mx-auto">
            <div className="space-y-4">
                <Select value={state.selectedOption} onValueChange={handleSelectChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select an option"/>
                    </SelectTrigger>
                    <SelectContent>
                        {APP_SETTINGS.options.map(option => (
                            <SelectItem key={option.id} value={option.id}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="relative">
                    <Input
                        value={state.inputValue}
                        onChange={handleInputChange}
                        placeholder="Enter ID (5 digits)"
                        className="pr-10"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                        <IntelligentTrigger
                            settings={APP_SETTINGS}
                            inputValue={state.inputValue}
                            selectedOption={state.selectedOption}
                            onTriggerAction={handleTriggerAction}
                            isProcessing={state.isProcessing}
                            onProcessingComplete={handleProcessingComplete}
                        />
                    </div>
                </div>

                {state.currentResults && (
                    <div className="space-y-2 p-4 border rounded-md">
                        {Object.entries(state.currentResults).map(([key, value]) => (
                            <div key={key} className="flex space-x-2">
                                <Input
                                    //@ts-ignore
                                    value={value}
                                    onChange={(e) => {
                                        setState(prev => ({
                                            ...prev,
                                            currentResults: {
                                                ...prev.currentResults,
                                                [key]: e.target.value
                                            }
                                        }));
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}

                <Textarea
                    value={state.textAreaValue}
                    onChange={handleTextAreaChange}
                    placeholder="Additional notes..."
                />

                <div className="flex space-x-2">
                    <Button onClick={handleSubmit}>Submit</Button>
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                </div>
            </div>

            <ConfigurationSheet
                isOpen={state.isSheetOpen}
                onClose={handleSheetClose}
                settings={APP_SETTINGS}
                initialData={{
                    inputValue: state.inputValue,
                    selectedOption: state.selectedOption
                }}
                onProcessingComplete={handleProcessingComplete}
            />

            {state.finalResults && (
                <div className="p-4 border rounded-md bg-muted">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(state.finalResults, null, 2)}
          </pre>
                </div>
            )}
        </div>
    );
};

export default MainPage;
