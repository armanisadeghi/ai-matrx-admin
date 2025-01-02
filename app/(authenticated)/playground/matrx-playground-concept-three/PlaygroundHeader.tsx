import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Sidebar,
  Plus,
  History,
  GitBranch,
  MessageSquare,
  Brain,
  Workflow,
  Bot,
  Grid3x3,
  Settings,
  Code,
  Play,
  MoreVertical,
  Trash2,
  Copy,
  Download,
  Share2,
  BookOpen,
  Database,
  TrendingUpDown,
} from "lucide-react";
import { cn } from "@/utils";
import QuickRefSearchableSelect from "@/app/entities/quick-reference/dynamic-quick-ref/QuickRefSearchableSelect";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";

interface PlaygroundHeaderProps {
  initialSettings?: {
    recipe?: QuickReferenceRecord;
    version?: number;
    provider?: QuickReferenceRecord;
    model?: QuickReferenceRecord;
    endpoint?: QuickReferenceRecord;
  };    
  onToggleBrokers: () => void;
  onToggleSettings: () => void;
  onShowCode: () => void;
  currentMode: string;
  onModeChange: (mode: string) => void;
  onVersionChange: (version: number) => void;
  onPlay: () => void;
  isLeftCollapsed?: boolean;
  isRightCollapsed?: boolean;
  openLeftPanel?: () => void;
  openRightPanel?: () => void;
}

const PlaygroundHeader = ({
  initialSettings = {
    recipe: undefined,
    version: 1,
    provider: undefined,
    model: undefined,
    endpoint: undefined,
  },
  onToggleBrokers,
  onToggleSettings,
  isLeftCollapsed,
  isRightCollapsed,
  openLeftPanel,
  openRightPanel,
  onShowCode,
  currentMode,
  onModeChange,
  onVersionChange,
  onPlay,
}: PlaygroundHeaderProps) => {
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);


  const [selectedRecipe, setSelectedRecipe] = useState<
    QuickReferenceRecord | undefined
  >(initialSettings?.recipe);

  const handleRecipeChange = (record: QuickReferenceRecord) => {
    setSelectedRecipe(record);
  };



  const modes = [
    { id: "prompt", icon: <MessageSquare size={16} />, label: "Prompt" },
    { id: "evaluate", icon: <Brain size={16} />, label: "Evaluate" },
    { id: "train", icon: <BookOpen size={16} />, label: "Train" },
    { id: "recipe", icon: <Workflow size={16} />, label: "Recipe" },
    { id: "agent", icon: <Bot size={16} />, label: "Agent" },
    { id: "hypermatrix", icon: <Grid3x3 size={16} />, label: "HyperMatrix" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center bg-elevation1 border-border h-12"
    >
      {/* Left Section - Now with consistent spacing */}
      <div className="flex items-center px-2 gap-1">
        <Button
          variant="ghost"
          size="md"
          onClick={onToggleBrokers}
          className="h-8 w-8 p-0"
          title={isLeftCollapsed ? "Open Brokers Panel" : "Close Brokers Panel"}
        >
          <TrendingUpDown size={18} />
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="md" className="h-8 w-8 p-0">
            <Plus size={16} />
          </Button>
          <Button
            variant="ghost"
            size="md"
            className="h-8 w-8 p-0"
            onClick={() => setIsHistoryOpen(true)}
          >
            <History size={16} />
          </Button>
        </div>
        
          <QuickRefSearchableSelect
            entityKey="recipe"
            initialSelectedRecord={selectedRecipe}
            onRecordChange={handleRecipeChange}
          />

        <Select
          value={initialSettings.version.toString()}
          onValueChange={(v) => onVersionChange(parseInt(v))}
        >
          <SelectTrigger className="h-8 w-24">
            <div className="flex items-center gap-2">
              <span className="text-sm">Version {initialSettings.version}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Select Version</SelectLabel>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((v) => (
                <SelectItem key={v} value={v.toString()}>
                  Version {v}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Center Section - Now exactly centered */}
      <div className="flex-1 flex justify-center items-center">
        <div className="bg-elevation2 h-8 flex rounded-xl overflow-hidden">
          {modes.slice(0, 5).map((mode, index) => (
            <React.Fragment key={mode.id}>
              <Button
                variant={currentMode === mode.id ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "gap-1.5 h-8 w-32 rounded-none",
                  currentMode === mode.id &&
                    "bg-primary text-primary-foreground"
                )}
                onClick={() => onModeChange(mode.id)}
              >
                {mode.icon}
                <span className="text-sm">{mode.label}</span>
              </Button>
              {index < 4 && <div className="w-px bg-border" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right Section - Matched with left section spacing */}
      <div className="flex items-center px-2 gap-1">
        <Button
          size="sm"
          className="gap-2 bg-primary hover:bg-primaryHover h-8 px-4"
          onClick={onPlay}
        >
          <Play size={16} className="fill-current" />
          <span className="text-sm">Run</span>
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowCode}
            className="h-8 w-8 p-0"
          >
            <Code size={18} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSettings}
            className="h-8 w-8 p-0"
            title={
              isRightCollapsed ? "Open Settings Panel" : "Close Settings Panel"
            }
          >
            <Settings size={18} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                <MoreVertical size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                <span>Duplicate</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                <span>Export</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="mr-2 h-4 w-4" />
                <span>Share</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CommandDialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <CommandInput placeholder="Search playground history..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Recent">
            <CommandItem className="flex items-center gap-2">
              <MessageSquare size={14} />
              <span>GPT-4 Temperature Analysis</span>
              <Badge variant="secondary" className="ml-auto">
                2h ago
              </Badge>
            </CommandItem>
            <CommandItem className="flex items-center gap-2">
              <Bot size={14} />
              <span>Claude Agent Experiment</span>
              <Badge variant="secondary" className="ml-auto">
                5h ago
              </Badge>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </motion.div>
  );
};

export default PlaygroundHeader;
