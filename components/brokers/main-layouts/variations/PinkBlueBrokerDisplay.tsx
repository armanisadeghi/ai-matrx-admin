'use client';

import React, { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { BrokerComponentRenderer } from '@/components/brokers/wrappers/withWrapper';
import { UsePrepareRecipeToRunReturn } from '@/hooks/run-recipe/usePrepareRecipeToRun';

interface BrokerComponentsDisplayProps {
  prepareRecipeHook: UsePrepareRecipeToRunReturn;
  recipeTitle: string;
  recipeDescription: string;
  recipeActionText: string;
  onSubmit: () => void;
}

const ComponentWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="space-y-6">
      {children}
    </div>
  );
    

export const PinkBlueBrokerDisplay = ({ prepareRecipeHook, recipeTitle, recipeDescription, recipeActionText, onSubmit }: BrokerComponentsDisplayProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleSubmit = () => {
    onSubmit();
    setIsOpen(false);
  };



  return (
    <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-pink-50 to-cyan-50 dark:from-pink-950 dark:to-cyan-950 border-2 border-pink-200 dark:border-pink-800 shadow-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full group hover:opacity-80 transition-opacity">
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-cyan-400 dark:from-pink-400 dark:to-cyan-300 bg-clip-text text-transparent">
                {recipeTitle}
              </CardTitle>
              <CardDescription className="text-pink-700 dark:text-pink-300 font-medium">
                {recipeDescription}
              </CardDescription>
            </div>
            {isOpen ? (
              <ChevronUp className="h-6 w-6 text-cyan-500 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
            ) : (
              <ChevronDown className="h-6 w-6 text-cyan-500 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
            )}
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent className="p-6 data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up">
          <ComponentWrapper>
            <BrokerComponentRenderer prepareRecipeHook={prepareRecipeHook} />

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-pink-500 to-cyan-400 hover:from-pink-600 hover:to-cyan-500 dark:from-pink-600 dark:to-cyan-500 dark:hover:from-pink-700 dark:hover:to-cyan-600 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 border-0"
              >
                {recipeActionText}
              </Button>
            </div>
          </ComponentWrapper>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};


export default PinkBlueBrokerDisplay;