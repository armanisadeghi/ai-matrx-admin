"use client";

import React, { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { BrokerComponentRenderer, BrokerSkeleton } from "@/components/brokers/wrappers/withWrapper";
import { BrokerComponentsDisplayProps } from "./types";

// Separate the inner content to prepare it independently
const BrokerContent = ({
    prepareRecipeHook,
    theme,
    recipeActionText,
    onSubmit,
    onReady,
    isOpen,
    setIsOpen
}) => {
    const { brokerComponentMetadataMap, handleSend } = prepareRecipeHook;

    useEffect(() => {
        if (brokerComponentMetadataMap && Object.keys(brokerComponentMetadataMap).length > 0) {
            onReady();
        }
    }, [brokerComponentMetadataMap, onReady]);

    // Still render the content even if not ready - this allows it to prepare
    return (
        <ComponentWrapper componentSpacing={theme.componentSpacing}>
            <BrokerComponentRenderer prepareRecipeHook={prepareRecipeHook} />
            <div className="flex justify-end">
                <Button
                    onClick={() => {
                        handleSend();
                        onSubmit();
                        setIsOpen(false);
                    }}
                    className={`
                        ${theme.buttonPrimaryBg}
                        ${theme.buttonPrimaryText}
                        ${theme.buttonShadow}
                        ${theme.buttonTransition}
                    `}
                >
                    {recipeActionText}
                </Button>
            </div>
        </ComponentWrapper>
    );
};

const ComponentWrapper: React.FC<{ children: React.ReactNode; componentSpacing: string }> = ({ children, componentSpacing }) => (
    <div className={componentSpacing}>
        {children}
    </div>
);

export const BrokerInputCard = ({
    prepareRecipeHook,
    recipeActionText = "Submit",
    theme,
    onSubmit = () => {},
}: BrokerComponentsDisplayProps) => {
    const [isOpen, setIsOpen] = useState(true);
    const [isContentReady, setIsContentReady] = useState(false);

    // Start preparing the content immediately, but hidden
    const content = (
        <div style={{ display: 'none' }}>
            <BrokerContent
                prepareRecipeHook={prepareRecipeHook}
                theme={theme}
                recipeActionText={recipeActionText}
                onSubmit={onSubmit}
                onReady={() => setIsContentReady(true)}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
            />
        </div>
    );

    // Always render the hidden content to let it prepare
    if (!isContentReady) {
        return (
            <>
                {content}
                <BrokerSkeleton />
            </>
        );
    }

    // Once ready, show the full card
    return (
        <Card
            className={`
            ${theme.containerWidth}
            ${theme.containerBg}
            ${theme.containerBorder}
            ${theme.containerShadow}
        `}
        >
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="pb-4">
                    <CollapsibleTrigger
                        className={`
                        flex items-center justify-between w-full group
                        ${theme.triggerHover}
                    `}
                    >
                        <div>
                            <CardTitle
                                className={`
                                ${theme.titleBasics}
                                ${theme.titleSize}
                                ${theme.titleText}
                            `}
                            >
                                Let's Get Started
                            </CardTitle>
                        </div>
                        {isOpen ? (
                            <ChevronUp
                                className={`
                                ${theme.iconSize}
                                ${theme.iconColor}
                                ${theme.iconHover}
                            `}
                            />
                        ) : (
                            <ChevronDown
                                className={`
                                ${theme.iconSize}
                                ${theme.iconColor}
                                ${theme.iconHover}
                            `}
                            />
                        )}
                    </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent className="p-6 data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up">
                    <BrokerContent
                        prepareRecipeHook={prepareRecipeHook}
                        theme={theme}
                        recipeActionText={recipeActionText}
                        onSubmit={onSubmit}
                        onReady={() => {}}  // Already ready when we get here
                        isOpen={isOpen}
                        setIsOpen={setIsOpen}
                    />
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
};

export default BrokerInputCard;