'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { MessageSquare, Brain, BookOpen, Workflow, Bot } from "lucide-react";
import { cn } from "@/utils";

// Prompt Button Component
export const PromptButton = ({ isActive, onClick }: { isActive: boolean; onClick: () => void }) => (
  <Button
    variant={isActive ? "default" : "ghost"}
    size="sm"
    className={cn(
      "gap-1.5 h-8 w-32 rounded-none",
      isActive && "bg-primary text-primary-foreground"
    )}
    onClick={onClick}
  >
    <MessageSquare size={16} />
    <span className="text-sm">Prompt</span>
  </Button>
);

// Evaluate Button Component
export const EvaluateButton = ({ isActive, onClick }: { isActive: boolean; onClick: () => void }) => (
  <Button
    variant={isActive ? "default" : "ghost"}
    size="sm"
    className={cn(
      "gap-1.5 h-8 w-32 rounded-none",
      isActive && "bg-primary text-primary-foreground"
    )}
    onClick={onClick}
  >
    <Brain size={16} />
    <span className="text-sm">Evaluate</span>
  </Button>
);

// Train Button Component
export const TrainButton = ({ isActive, onClick }: { isActive: boolean; onClick: () => void }) => (
  <Button
    variant={isActive ? "default" : "ghost"}
    size="sm"
    className={cn(
      "gap-1.5 h-8 w-32 rounded-none",
      isActive && "bg-primary text-primary-foreground"
    )}
    onClick={onClick}
  >
    <BookOpen size={16} />
    <span className="text-sm">Train</span>
  </Button>
);

// Recipe Button Component
export const RecipeButton = ({ isActive, onClick }: { isActive: boolean; onClick: () => void }) => (
  <Button
    variant={isActive ? "default" : "ghost"}
    size="sm"
    className={cn(
      "gap-1.5 h-8 w-32 rounded-none",
      isActive && "bg-primary text-primary-foreground"
    )}
    onClick={onClick}
  >
    <Workflow size={16} />
    <span className="text-sm">Recipe</span>
  </Button>
);

// Agent Button Component
export const AgentButton = ({ isActive, onClick }: { isActive: boolean; onClick: () => void }) => (
  <Button
    variant={isActive ? "default" : "ghost"}
    size="sm"
    className={cn(
      "gap-1.5 h-8 w-32 rounded-none",
      isActive && "bg-primary text-primary-foreground"
    )}
    onClick={onClick}
  >
    <Bot size={16} />
    <span className="text-sm">Agent</span>
  </Button>
);


interface PlaygroundNavContainerProps {
    currentMode: string;
    onModeChange: (mode: string) => void;
  }
  
  const PlaygroundNavContainer = ({
    currentMode,
    onModeChange,
  }: PlaygroundNavContainerProps) => {
    return (
      <div className="flex items-center">
        <div className="bg-elevation2 h-8 flex rounded-xl overflow-hidden">
          <PromptButton
            isActive={currentMode === "prompt"}
            onClick={() => onModeChange("prompt")}
          />
          <div className="w-px bg-border" />
          <EvaluateButton
            isActive={currentMode === "evaluate"}
            onClick={() => onModeChange("evaluate")}
          />
          <div className="w-px bg-border" />
          <TrainButton
            isActive={currentMode === "train"}
            onClick={() => onModeChange("train")}
          />
          <div className="w-px bg-border" />
          <RecipeButton
            isActive={currentMode === "recipe"}
            onClick={() => onModeChange("recipe")}
          />
          <div className="w-px bg-border" />
          <AgentButton
            isActive={currentMode === "agent"}
            onClick={() => onModeChange("agent")}
          />
        </div>
      </div>
    );
  };
  
  export default PlaygroundNavContainer;
  