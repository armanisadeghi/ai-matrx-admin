"use client";

import type {TextAreaProps} from "@nextui-org/react";

import React from "react";
import {Textarea} from "@nextui-org/react";
import {cn} from "@nextui-org/react";
import {Button, Tooltip, Image, Badge, ScrollShadow} from "@nextui-org/react";
import {Icon} from "@iconify/react";

export default function FullPromptInput() {
    const initialImages = [
        "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/nextui-cover1.png",
        "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/nextui-cover2.png",
        "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/nextui-cover3.jpeg",
    ];

    const recipes = [
        "Generate Component Instructions",
        "Create a Reusable Component",
        "Create a Component Demo Page",
        "TypeScript Expert Check",
        "Create a Hook",
        "Create Redux Setup",
        "Connect Component to AutoMatrx"
    ];

    const [prompt, setPrompt] = React.useState<string>("");
    const [images, setImages] = React.useState<string[]>(initialImages);

    const onRemoveImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));

        if (images.length === 1) {
            setImages(initialImages);
        }
    };

    return (
        <div className="flex w-full flex-col gap-4">
            <ScrollShadow hideScrollBar className="flex flex-nowrap gap-2" orientation="horizontal">
                <div className="flex gap-2">
                    {recipes.map((idea, index) => (
                        <Button key={index} variant="flat">
                            {idea}
                        </Button>
                    ))}
                </div>
            </ScrollShadow>
            <form className="flex w-full flex-col items-start rounded-medium bg-default-100 transition-colors hover:bg-default-200/70">
                <div className="group flex gap-2 px-4 pt-4">
                    {images.map((image, index) => (
                        <Badge
                            key={index}
                            isOneChar
                            className="opacity-0 group-hover:opacity-100"
                            content={
                                <Button
                                    isIconOnly
                                    radius="full"
                                    size="sm"
                                    variant="light"
                                    onPress={() => onRemoveImage(index)}
                                >
                                    <Icon className="text-foreground" icon="iconamoon:close-thin" width={16} />
                                </Button>
                            }
                        >
                            <Image
                                alt="uploaded image cover"
                                className="h-14 w-14 rounded-small border-small border-default-200/50 object-cover"
                                src={image}
                            />
                        </Badge>
                    ))}
                </div>
                <PromptInput
                    classNames={{
                        inputWrapper: "!bg-transparent shadow-none",
                        innerWrapper: "relative",
                        input: "pt-1 pb-6 pl-2 !pr-10 text-medium",
                    }}
                    endContent={
                        <div className="absolute right-0 flex h-full flex-col items-end justify-between gap-2">
                            <Tooltip showArrow content="Speak">
                                <Button isIconOnly radius="full" size="sm" variant="light">
                                    <Icon className="text-default-500" icon="solar:microphone-3-linear" width={20} />
                                </Button>
                            </Tooltip>
                            <div className="flex items-end gap-2">
                                <p className="py-1 text-tiny text-default-400">{prompt.length}/2000</p>
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
                        </div>
                    }
                    minRows={3}
                    radius="lg"
                    startContent={
                        <Tooltip showArrow content="Add Image">
                            <Button isIconOnly radius="full" size="sm" variant="light">
                                <Icon
                                    className="text-default-500"
                                    icon="solar:gallery-minimalistic-linear"
                                    width={20}
                                />
                            </Button>
                        </Tooltip>
                    }
                    value={prompt}
                    variant="flat"
                    onValueChange={setPrompt}
                />
            </form>
        </div>
    );
}




const PromptInput = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({classNames = {}, ...props}, ref) => {
    return (
      <Textarea
        ref={ref}
        aria-label="Prompt"
        className="min-h-[40px]"
        classNames={{
          ...classNames,
          label: cn("hidden", classNames?.label),
          input: cn("py-0", classNames?.input),
        }}
        minRows={1}
        placeholder="Enter a prompt here"
        radius="lg"
        variant="bordered"
        {...props}
      />
    );
  },
);


PromptInput.displayName = "PromptInput";
