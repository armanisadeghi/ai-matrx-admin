"use client";

import React, { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { BrokerComponentRenderer } from "@/components/brokers/wrappers/withWrapper";
import { BrokerComponentsDisplayProps } from "./types";


export const BrokerComponentsDisplay = ({
    prepareRecipeHook,
    recipeTitle = "Let's Get Started",
    recipeDescription = "Please provide the following information to get started.",
    recipeActionText = "Submit",
    onSubmit = () => {},
}: BrokerComponentsDisplayProps) => {
    const [isOpen, setIsOpen] = useState(true);

    const handleSubmit = () => {
        onSubmit();
        setIsOpen(false);
      };
    
    return (
        <Card className="w-full max-w-2xl mx-auto">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="pb-4">
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                        <div>
                            <CardTitle className="text-2xl">{recipeTitle}</CardTitle>
                            <CardDescription>{recipeDescription}</CardDescription>
                        </div>
                        {isOpen ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                    </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent className="p-4 space-y-6 data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up">
                    <div className="grid gap-4">
                        <BrokerComponentRenderer prepareRecipeHook={prepareRecipeHook} />

                        <div className="flex justify-end">
                            <Button onClick={handleSubmit} className="mt-4">
                                {recipeActionText}
                            </Button>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
};

export default BrokerComponentsDisplay;
