// app/(authenticated)/flash-cards/components/PromptInputWithActions.tsx

"use client";

import React, { useState } from "react";
import { Button, Tooltip, ScrollShadow } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import PromptInput from "@/components/playground/next-playground/prompt-input";
import { cn } from "@/utils/cn";

interface PromptInputWithActionsProps {
    onSend: (message: string) => void;
}

const PromptInputWithActions: React.FC<PromptInputWithActionsProps> = ({ onSend }) => {
    const ideas = [
        {
            title: "Simplify this for me",
            description: "explain it in simple terms",
        },
        {
            title: "Expand on this topic",
            description: "Help me understand it better",
        },
        {
            title: "I'm totally confused about this",
            description: "Explain it in a different way",
        },
        {
            title: "Can you give me an example?",
            description: "I'd like to understand this with an example",
        },
    ];

    const [prompt, setPrompt] = useState<string>("");

    const handleSend = () => {
        if (prompt.trim()) {
            onSend(prompt);
            setPrompt("");
        }
    };

    return (
        <div className="flex w-full flex-col gap-4">
            <ScrollShadow hideScrollBar className="flex flex-nowrap gap-2" orientation="horizontal">
                <div className="flex gap-2">
                    {ideas.map(({title, description}, index) => (
                        <Button
                            key={index}
                            className="flex h-14 flex-col items-start gap-0"
                            variant="flat"
                            onClick={() => setPrompt(title)}
                        >
                            <p>{title}</p>
                            <p className="text-default-500">{description}</p>
                        </Button>
                    ))}
                </div>
            </ScrollShadow>
            <div className="flex w-full flex-col items-start rounded-medium bg-default-100 transition-colors hover:bg-default-200/70">
                <PromptInput
                    classNames={{
                        inputWrapper: "!bg-transparent shadow-none",
                        innerWrapper: "relative",
                        input: "pt-1 pl-2 pb-6 !pr-10 text-medium",
                    }}
                    endContent={
                        <div className="flex items-end gap-2">
                            <Tooltip showArrow content="Send message">
                                <Button
                                    isIconOnly
                                    color={!prompt ? "default" : "primary"}
                                    isDisabled={!prompt}
                                    radius="lg"
                                    size="sm"
                                    variant="solid"
                                    onClick={handleSend}
                                >
                                    <Icon
                                        className={cn(
                                            "[&>path]:stroke-[2px]",
                                            !prompt ? "text-default-600" : "text-primary-foreground",
                                        )}
                                        icon="solar:arrow-up-linear"
                                        width={20}
                                    />
                                </Button>
                            </Tooltip>
                        </div>
                    }
                    minRows={3}
                    radius="lg"
                    value={prompt}
                    variant="flat"
                    onValueChange={setPrompt}
                />
                <div className="flex w-full items-center justify-between gap-2 overflow-scroll px-4 pb-4">
                    <div className="flex w-full gap-1 md:gap-3">
                        <Button
                            size="sm"
                            startContent={
                                <Icon className="text-default-500" icon="solar:paperclip-linear" width={18}/>
                            }
                            variant="flat"
                        >
                            Attach
                        </Button>
                        <Button
                            size="sm"
                            startContent={
                                <Icon className="text-default-500" icon="solar:soundwave-linear" width={18}/>
                            }
                            variant="flat"
                        >
                            Voice Commands
                        </Button>
                        <Button
                            size="sm"
                            startContent={
                                <Icon className="text-default-500" icon="solar:notes-linear" width={18}/>
                            }
                            variant="flat"
                        >
                            Templates
                        </Button>
                    </div>
                    <p className="py-1 text-tiny text-default-400">{prompt.length}/2000</p>
                </div>
            </div>
        </div>
    );
}

export default PromptInputWithActions;