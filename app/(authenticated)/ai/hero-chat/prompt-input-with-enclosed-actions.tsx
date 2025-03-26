"use client";

import React from "react";
import { Button, Tooltip, ScrollShadow } from "@heroui/react";
import { Icon } from "@iconify/react";
import { cn } from "@heroui/react";
import { ideas } from "./data";
import PromptInput from "./prompt-input";

export default function Component() {
    const [prompt, setPrompt] = React.useState<string>("");

    return (
        <div className="flex w-full flex-col gap-2">
            {/* Ideas/suggestions container - this part looks good per screenshot */}
            <ScrollShadow hideScrollBar className="w-full" orientation="horizontal">
                <div className="flex gap-2">
                    {ideas.map(({ title, description }, index) => (
                        <Button key={index} className="flex flex-col items-start justify-center h-auto py-2 px-3 bg-default-200" variant="flat">
                            <span className="text-sm font-medium">{title}</span>
                            <span className="text-xs text-default-500">{description}</span>
                        </Button>
                    ))}
                </div>
            </ScrollShadow>

            {/* Form wrapper with increased height */}
            <form className="w-full flex flex-col rounded-2xl bg-default-100 min-h-[150px] border border-default-200">
                {/* Input container with increased min-height to fit approximately 3 lines */}
                <div className="w-full relative rounded-2xl min-h-[70px]">
                    <PromptInput
                        classNames={{
                            base: "w-full min-h-[120px]",
                            inputWrapper: "shadow-none w-full min-h-[100px]",
                            innerWrapper: "px-0 w-full",
                            input: "pt-0 px-1 pb-16 text-medium border-none min-h-[100px]",
                        }}
                        minRows={3}
                        value={prompt}
                        onValueChange={setPrompt}
                    />

                </div>
                    {/* Send button container with adjusted position */}
                    <div className="absolute bottom-14 right-8 rounded-full bg-default-200">
                        <Tooltip showArrow content="Send message">
                            <Button
                                isIconOnly
                                color={!prompt ? "default" : "primary"}
                                isDisabled={!prompt}
                                radius="lg"
                                size="sm"
                                variant="solid"
                            >
                                <Icon
                                    className={cn("[&>path]:stroke-[2px]", !prompt ? "text-default-600" : "text-primary-foreground")}
                                    icon="solar:arrow-up-linear"
                                    width={20}
                                />
                            </Button>
                        </Tooltip>
                    </div>

                {/* Bottom toolbar with yellow border */}
                <div className="flex w-full items-center justify-between px-2 pr-4 py-3 border-none mt-auto">
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            startContent={<Icon className="text-default-500" icon="solar:paperclip-linear" width={18} />}
                            variant="flat"
                            className="bg-default-200 py-0"
                        >
                            Attach
                        </Button>
                        <Button
                            size="sm"
                            startContent={<Icon className="text-default-500" icon="solar:soundwave-linear" width={18} />}
                            variant="flat"
                            className="bg-default-200"
                        >
                            Voice Commands
                        </Button>
                        <Button
                            size="sm"
                            startContent={<Icon className="text-default-500" icon="solar:notes-linear" width={18} />}
                            variant="flat"
                            className="bg-default-200"
                        >
                            Templates
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}