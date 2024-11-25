'use client';

import React, {useState} from 'react';
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {MainPageState, ProcessingResults} from "../types";
import {APP_SETTINGS} from "../constants";
import IntelligentInput from './IntelligentInput';

export const MainPage: React.FC = () => {
    const [state, setState] = useState<MainPageState>({
        selectedOption: "",
        textAreaValue: "",
        currentResults: null,
        finalResults: null
    });

    const handleSelectChange = (value: string): void => {
        setState(prev => ({ ...prev, selectedOption: value }));
    };

    const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
        setState(prev => ({ ...prev, textAreaValue: e.target.value }));
    };

    const handleProcessingComplete = (results: ProcessingResults): void => {
        setState(prev => ({
            ...prev,
            currentResults: results
        }));
    };

    const handleCurrentResultChange = (key: keyof ProcessingResults, value: string): void => {
        if (!state.currentResults) return;

        setState(prev => ({
            ...prev,
            currentResults: {
                ...prev.currentResults!,
                [key]: value
            }
        }));
    };

    const handleSubmit = (): void => {
        if (!state.currentResults) return;

        setState(prev => ({
            ...prev,
            finalResults: {
                ...prev.currentResults!,
                additionalNotes: prev.textAreaValue
            }
        }));
    };

    const handleCancel = (): void => {
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
                        <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                        {APP_SETTINGS.options.map(option => (
                            <SelectItem key={option.id} value={option.id}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <IntelligentInput
                    settings={APP_SETTINGS}
                    selectedOption={state.selectedOption}
                    onProcessingComplete={handleProcessingComplete}
                    label={"Enter ID (5 digits)"}
                />

                {state.currentResults && (
                    <div className="space-y-2 p-4 border rounded-md">
                        {(Object.entries(state.currentResults) as [keyof ProcessingResults, string][]).map(([key, value]) => (
                            <div key={key} className="flex space-x-2">
                                <Input
                                    value={value}
                                    onChange={(e) => handleCurrentResultChange(key, e.target.value)}
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
                    <Button onClick={handleSubmit} disabled={!state.currentResults}>Submit</Button>
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                </div>
            </div>

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
