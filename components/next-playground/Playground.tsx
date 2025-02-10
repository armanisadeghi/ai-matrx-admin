"use client";

import type {Selection} from "@nextui-org/react";

import React from "react";
import {
    Button,
    Select,
    SelectItem,
    SelectSection,
    Slider,
    Textarea,
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@nextui-org/react";
import {Icon} from "@iconify/react";

import PromptContainerWithConversation from "./prompt-container-with-conversation";
import {DEFAULT_MODELS_DEMO, fineTuneModelsDemo, PlaygroundPreset, presetsDemo} from "./data";
const presets = presetsDemo;
const DEFAULT_MODELS = DEFAULT_MODELS_DEMO
const fineTuneModels = fineTuneModelsDemo

export default function Playground() {
    const [selectedPreset, setSelectedPreset] = React.useState<PlaygroundPreset | null>(null);
    const [selectedModel, setSelectedModel] = React.useState<React.Key | null>("gpt-4o-mini");
    const [systemMessage, setSystemMessage] = React.useState<string>("");
    const [temperature, setTemperature] = React.useState<number>(0.5);
    const [maxLength, setMaxLength] = React.useState<number>(1024);
    const [topP, setTopP] = React.useState<number>(0.5);
    const [frequencyPenalty, setFrequencyPenalty] = React.useState<number>(0);
    const [presencePenalty, setPresencePenalty] = React.useState<number>(0);

    const onSelectedPresetChange = (key: React.Key) => {
        const preset = presets.find((preset) => preset.id === key);
        console.log("Client Side Page: GROQ_API_KEY: ",process.env.GROQ_API_KEY);
        console.log("Client Side Page: NEXT_PUBLIC_GROQ_API_KEY: ",process.env.NEXT_PUBLIC_GROQ_API_KEY);
        console.log("Client Side Page: NEXT_PUBLIC_SUPABASE_URL: ",process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log("Client Side Page: HUME_API_KEY: ",process.env.HUME_API_KEY);
        console.log("Client Side Page: CUSTOM_MESSAGE: ",process.env.CUSTOM_MESSAGE);

        if (!preset) {
            return;
        }

        setSelectedPreset(preset);
    };

    const onModelChange = (keys: Selection) => {
        const newModel = Array.from(keys)[0];

        if (newModel) {
            setSelectedModel(newModel);
        }
    };

    const controlsContent = (
        <>
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
                    {fineTuneModels.map((fineTunedModel) => (
                        <SelectItem key={fineTunedModel}>{fineTunedModel}</SelectItem>
                    ))}
                </SelectSection>
            </Select>
            <div className="mt-2 flex w-full flex-col gap-6 px-1">
                <Slider
                    aria-label="Temperature"
                    label="Temperature"
                    maxValue={1}
                    minValue={0}
                    size="sm"
                    step={0.01}
                    value={temperature}
                    onChange={(value) => {
                        setTemperature(value as number);
                    }}
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
                    onChange={(value) => {
                        setTopP(value as number);
                    }}
                />
                <Slider
                    aria-label="Frequency Penalty"
                    label="Frequency Penalty"
                    maxValue={2}
                    minValue={0}
                    size="sm"
                    step={0.01}
                    value={frequencyPenalty}
                    onChange={(value) => {
                        setFrequencyPenalty(value as number);
                    }}
                />
                <Slider
                    aria-label="Presence Penalty"
                    label="Presence Penalty"
                    maxValue={2}
                    minValue={0}
                    size="sm"
                    step={0.01}
                    value={presencePenalty}
                    onChange={(value) => {
                        setPresencePenalty(value as number);
                    }}
                />
            </div>
        </>
    );

    return (
        <section className="h-full w-full">
            <header className="flex w-full flex-col items-center gap-4 pb-6 lg:flex-row lg:justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="text-large font-medium">Playground</h1>
                    <Popover>
                        <PopoverTrigger>
                            <Button isIconOnly className="flex lg:hidden" radius="full" size="sm" variant="flat">
                                <Icon icon="solar:menu-dots-bold" width={24} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="fle-col flex max-h-[40vh] w-[300px] justify-start gap-3 overflow-scroll p-4">
                            {controlsContent}
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        aria-label="Saved presets"
                        className="w-[200px] max-w-[120px] lg:max-w-[230px]"
                        labelPlacement="outside"
                        placeholder="Select a preset"
                        selectedKeys={selectedPreset ? [selectedPreset.id] : []}
                        size="sm"
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            onSelectedPresetChange(e.target.value);
                        }}
                    >
                        {presets.map((preset) => (
                            <SelectItem key={preset.id}>{preset.name}</SelectItem>
                        ))}
                    </Select>
                    <Button size="sm" variant="flat">
                        Save
                    </Button>
                    <Button size="sm" variant="flat">
                        Update
                    </Button>
                    <Button color="danger" size="sm" variant="flat">
                        Delete
                    </Button>
                </div>
            </header>
            <main className="flex">
                {/* Controls */}
                <div className="hidden w-1/4 flex-none flex-col gap-4 lg:flex">{controlsContent}</div>
                {/* Chat */}
                <div className="relative flex w-full flex-col gap-2 lg:w-3/4">
                    <PromptContainerWithConversation
                        className="max-w-full px-0 lg:pl-10"
                        scrollShadowClassname="h-[40vh] lg:h-[50vh]"
                    />
                </div>
            </main>
        </section>
    );
}
