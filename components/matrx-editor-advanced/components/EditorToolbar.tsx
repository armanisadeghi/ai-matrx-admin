import React, { useState } from "react";
import { Bold, Italic, Underline, Type, PaintBucket, X } from "lucide-react";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MatrxEditorRef } from "../MatrxEditor";

interface ToolbarProps {
  editorRef: React.RefObject<MatrxEditorRef>;
}

export const EditorToolbar: React.FC<ToolbarProps> = ({ editorRef }) => {
  const [activeStyles, setActiveStyles] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    color?: string;
    backgroundColor?: string;
  }>({
    bold: false,
    italic: false,
    underline: false,
    color: undefined,
    backgroundColor: undefined,
  });

  const handleStyle = (style: keyof typeof activeStyles) => {
    setActiveStyles((prev) => {
      const newState = { ...prev, [style]: !prev[style] };
      editorRef.current?.formatSelection({ [style]: !prev[style] });
      return newState;
    });
  };

  const handleColorChange = (color: string) => {
    setActiveStyles((prev) => ({ ...prev, color }));
    editorRef.current?.formatSelection({ color });
  };

  const handleBackgroundColor = (color: string) => {
    setActiveStyles((prev) => ({ ...prev, backgroundColor: color }));
    editorRef.current?.formatSelection({ backgroundColor: color });
  };

  const resetStyles = () => {
    const resetState = {
      bold: false,
      italic: false,
      underline: false,
      color: undefined,
      backgroundColor: undefined,
    };
    setActiveStyles(resetState);
    editorRef.current?.formatSelection(resetState);
  };

  const commonColors = [
    "#000000",
    "#ffffff",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ff00ff",
    "#00ffff",
    "#808080",
    "#800000",
  ];

  return (
    <div className="flex items-center space-x-1 p-1.5 border rounded-md bg-background">
      <div className="flex items-center space-x-1 border-r pr-1 mr-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", activeStyles.bold && "bg-muted")}
              onClick={() => handleStyle("bold")}
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bold</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", activeStyles.italic && "bg-muted")}
              onClick={() => handleStyle("italic")}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Italic</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", activeStyles.underline && "bg-muted")}
              onClick={() => handleStyle("underline")}
            >
              <Underline className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Underline</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center space-x-1">
        <Popover>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Type className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Text Color</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent className="w-64 p-3">
            <div className="grid grid-cols-5 gap-2">
              {commonColors.map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded-md border shadow-sm"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <PaintBucket className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Background Color</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent className="w-64 p-3">
            <div className="grid grid-cols-5 gap-2">
              {commonColors.map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded-md border shadow-sm"
                  style={{ backgroundColor: color }}
                  onClick={() => handleBackgroundColor(color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="border-l pl-1 ml-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={resetStyles}
            >
              <X className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset Styles</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default EditorToolbar;
