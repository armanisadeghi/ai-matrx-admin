// File: components/PlaygroundControls.tsx

import React from "react";
import {Selection, Select, SelectItem, SelectSection, Slider, Textarea} from "@heroui/react";
import {DEFAULT_MODELS, FINE_TUNE_MODELS} from "./constants/playground-constants";

interface PlaygroundControlsProps {
    systemMessage: string;
    setSystemMessage: (value: string) => void;
    selectedModel: React.Key | null;
    onModelChange: (keys: Selection) => void;
    temperature: number;
    setTemperature: (value: number) => void;
    maxLength: number;
    setMaxLength: (value: number) => void;
    topP: number;
    setTopP: (value: number) => void;
    frequencyPenalty: number;
    setFrequencyPenalty: (value: number) => void;
    presencePenalty: number;
    setPresencePenalty: (value: number) => void;
}

const PlaygroundControls: React.FC<PlaygroundControlsProps> = (
    {
        systemMessage,
        setSystemMessage,
        selectedModel,
        onModelChange,
        temperature,
        setTemperature,
        maxLength,
        setMaxLength,
        topP,
        setTopP,
        frequencyPenalty,
        setFrequencyPenalty,
        presencePenalty,
        setPresencePenalty,
    }) => {
    return (
        <div className="flex flex-col gap-4">
            <Textarea
                fullWidth
                label="System"
                placeholder="You are a helpful AI Matrx code assistant"
                value={systemMessage}
                onValueChange={setSystemMessage}
            />
            <Select
                label="Model"
                selectedKeys={selectedModel ? ([selectedModel] as unknown as Selection) : []}
                onSelectionChange={onModelChange}
            >
                <SelectSection showDivider title="Open AI">
                    {DEFAULT_MODELS.map((model) => (
                        <SelectItem key={model}>{model}</SelectItem>
                    ))}
                </SelectSection>
                <SelectSection title="Fine Tunes">
                    {FINE_TUNE_MODELS.map((fineTunedModel) => (
                        <SelectItem key={fineTunedModel}>{fineTunedModel}</SelectItem>
                    ))}
                </SelectSection>
            </Select>
            <Slider
                aria-label="Temperature"
                label="Temperature"
                maxValue={1}
                minValue={0}
                size="sm"
                step={0.01}
                value={temperature}
                onChange={(value) => setTemperature(value as number)}
            />
            <Slider
                aria-label="Max Length"
                label="Max Length"
                maxValue={2048}
                minValue={0}
                size="sm"
                step={1}
                value={maxLength}
                onChange={(value) => setMaxLength(value as number)}
            />
            <Slider
                aria-label="Top P"
                label="Top P"
                maxValue={1}
                minValue={0}
                size="sm"
                step={0.01}
                value={topP}
                onChange={(value) => setTopP(value as number)}
            />
            <Slider
                aria-label="Frequency Penalty"
                label="Frequency Penalty"
                maxValue={2}
                minValue={0}
                size="sm"
                step={0.01}
                value={frequencyPenalty}
                onChange={(value) => setFrequencyPenalty(value as number)}
            />
            <Slider
                aria-label="Presence Penalty"
                label="Presence Penalty"
                maxValue={2}
                minValue={0}
                size="sm"
                step={0.01}
                value={presencePenalty}
                onChange={(value) => setPresencePenalty(value as number)}
            />
        </div>
    );
};

export default PlaygroundControls;