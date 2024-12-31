import React from "react";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Brain,
  BookOpen,
  Workflow,
  Bot,
} from "lucide-react";
import { cn } from "@/utils";

interface PlaygroundHeaderCenterProps {
  currentMode?: string;
  onModeChange?: (mode: string) => void;
}

const PlaygroundHeaderCenter = ({
  currentMode = "prompt",
  onModeChange = () => {},
}: PlaygroundHeaderCenterProps) => {
  return (
    <div className="flex-1 flex justify-center items-center">
      <div className="bg-elevation2 h-8 flex rounded-xl overflow-hidden">
        <Button
          variant={currentMode === "prompt" ? "default" : "ghost"}
          size="sm"
          className={cn(
            "gap-1.5 h-8 w-32 rounded-none",
            currentMode === "prompt" && "bg-primary text-primary-foreground"
          )}
          onClick={() => onModeChange("prompt")}
        >
          <MessageSquare size={16} />
          <span className="text-sm">Prompt</span>
        </Button>

        <div className="w-px bg-border" />

        <Button
          variant={currentMode === "evaluate" ? "default" : "ghost"}
          size="sm"
          className={cn(
            "gap-1.5 h-8 w-32 rounded-none",
            currentMode === "evaluate" && "bg-primary text-primary-foreground"
          )}
          onClick={() => onModeChange("evaluate")}
        >
          <Brain size={16} />
          <span className="text-sm">Evaluate</span>
        </Button>

        <div className="w-px bg-border" />

        <Button
          variant={currentMode === "train" ? "default" : "ghost"}
          size="sm"
          className={cn(
            "gap-1.5 h-8 w-32 rounded-none",
            currentMode === "train" && "bg-primary text-primary-foreground"
          )}
          onClick={() => onModeChange("train")}
        >
          <BookOpen size={16} />
          <span className="text-sm">Train</span>
        </Button>

        <div className="w-px bg-border" />

        <Button
          variant={currentMode === "recipe" ? "default" : "ghost"}
          size="sm"
          className={cn(
            "gap-1.5 h-8 w-32 rounded-none",
            currentMode === "recipe" && "bg-primary text-primary-foreground"
          )}
          onClick={() => onModeChange("recipe")}
        >
          <Workflow size={16} />
          <span className="text-sm">Recipe</span>
        </Button>

        <div className="w-px bg-border" />

        <Button
          variant={currentMode === "agent" ? "default" : "ghost"}
          size="sm"
          className={cn(
            "gap-1.5 h-8 w-32 rounded-none",
            currentMode === "agent" && "bg-primary text-primary-foreground"
          )}
          onClick={() => onModeChange("agent")}
        >
          <Bot size={16} />
          <span className="text-sm">Agent</span>
        </Button>
      </div>
    </div>
  );
};

export default PlaygroundHeaderCenter;