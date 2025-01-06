import React, { useState, useEffect } from "react";
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
import { RefManagerMethods } from '@/lib/refs';

interface EditorToolbarProps {
    editorId: string;
    refManager: RefManagerMethods;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editorId, refManager }) => {
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

  // Sync with editor's active styles
  useEffect(() => {
    const styles = refManager.call(editorId, 'getActiveStyles');
    if (styles) {
      setActiveStyles(styles);
    }
  }, [editorId, refManager]);

  const handleStyle = (style: keyof typeof activeStyles) => {
    setActiveStyles((prev) => {
      const newState = { ...prev, [style]: !prev[style] };
      refManager.call(editorId, 'formatSelection', { [style]: !prev[style] });
      return newState;
    });
  };

  const handleColorChange = (color: string) => {
    setActiveStyles((prev) => ({ ...prev, color }));
    refManager.call(editorId, 'formatSelection', { color });
  };

  const handleBackgroundColor = (color: string) => {
    setActiveStyles((prev) => ({ ...prev, backgroundColor: color }));
    refManager.call(editorId, 'formatSelection', { backgroundColor: color });
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
    refManager.call(editorId, 'resetStyles');
  };

  const commonColors = [
    "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff",
    "#ffff00", "#ff00ff", "#00ffff", "#808080", "#800000",
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleStyle('bold')}
              className={cn(activeStyles.bold && "bg-accent")}
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
              onClick={() => handleStyle('italic')}
              className={cn(activeStyles.italic && "bg-accent")}
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
              onClick={() => handleStyle('underline')}
              className={cn(activeStyles.underline && "bg-accent")}
            >
              <Underline className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Underline</TooltipContent>
        </Tooltip>

        <Popover>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Type className="h-4 w-4" style={{ color: activeStyles.color }} />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Text Color</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent className="w-40">
            <div className="grid grid-cols-5 gap-1">
              {commonColors.map((color) => (
                <button
                  key={color}
                  className="h-6 w-6 rounded border border-gray-200"
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
                  <Button variant="ghost" size="icon">
                    <PaintBucket 
                      className="h-4 w-4" 
                      style={{ color: activeStyles.backgroundColor }} 
                    />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Background Color</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent className="w-40">
            <div className="grid grid-cols-5 gap-1">
              {commonColors.map((color) => (
                <button
                  key={color}
                  className="h-6 w-6 rounded border border-gray-200"
                  style={{ backgroundColor: color }}
                  onClick={() => handleBackgroundColor(color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={resetStyles}>
              <X className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset Styles</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default EditorToolbar;