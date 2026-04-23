"use client";

import React, { useState, Suspense, lazy } from "react";
import { useSelector } from "react-redux";
import { cn } from "@/lib/utils";
import {
  Monitor,
  MessageSquare,
  Mic,
  Volume2,
  Bot,
  Mail,
  Video,
  Image as ImageIcon,
  Type,
  Code,
  BookOpen,
  Gamepad2,
  Cpu,
  Zap,
  Loader2,
  Save,
  RotateCcw,
  Check,
  X,
  ChevronRight,
  Settings,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";
import {
  type UserPreferencesState,
  clearUnsavedChanges,
  resetToLoadedPreferences,
  clearError,
} from "@/lib/redux/slices/userPreferencesSlice";
import type { PreferenceTab } from "./PreferencesPage";

const DisplayPreferences = lazy(() => import("./DisplayPreferences"));
const PromptsPreferences = lazy(() => import("./PromptsPreferences"));
const VoicePreferences = lazy(() => import("./VoicePreferences"));
const TextToSpeechPreferences = lazy(() => import("./TextToSpeechPreferences"));
const AssistantPreferences = lazy(() => import("./AssistantPreferences"));
const EmailPreferences = lazy(() => import("./EmailPreferences"));
const VideoConferencePreferences = lazy(
  () => import("./VideoConferencePreferences"),
);
const PhotoEditingPreferences = lazy(() => import("./PhotoEditingPreferences"));
const ImageGenerationPreferences = lazy(
  () => import("./ImageGenerationPreferences"),
);
const TextGenerationPreferences = lazy(
  () => import("./TextGenerationPreferences"),
);
const CodingPreferences = lazy(() => import("./CodingPreferences"));
const FlashcardPreferences = lazy(() => import("./FlashcardPreferences"));
const PlaygroundPreferences = lazy(() => import("./PlaygroundPreferences"));
const AiModelsPreferences = lazy(() => import("./AiModelsPreferences"));
const MessagingPreferences = lazy(() => import("./MessagingPreferences"));
const AgentContextPreferences = lazy(() => import("./AgentContextPreferences"));

interface CategoryDef {
  value: PreferenceTab;
  label: string;
  icon: React.ElementType;
  description: string;
}

const categories: CategoryDef[] = [
  {
    value: "display",
    label: "Display",
    icon: Monitor,
    description: "Theme, dark mode, layout",
  },
  {
    value: "prompts",
    label: "Prompts",
    icon: Zap,
    description: "Default model, temperature",
  },
  {
    value: "messaging",
    label: "Messaging",
    icon: MessageSquare,
    description: "Chat & message settings",
  },
  {
    value: "voice",
    label: "Voice",
    icon: Mic,
    description: "Voice input & language",
  },
  {
    value: "textToSpeech",
    label: "Text to Speech",
    icon: Volume2,
    description: "TTS voice & playback",
  },
  {
    value: "assistant",
    label: "Assistant",
    icon: Bot,
    description: "AI assistant behaviour",
  },
  {
    value: "aiModels",
    label: "AI Models",
    icon: Cpu,
    description: "Active models & providers",
  },
  {
    value: "email",
    label: "Email",
    icon: Mail,
    description: "Email integration",
  },
  {
    value: "videoConference",
    label: "Video",
    icon: Video,
    description: "Video conferencing",
  },
  {
    value: "photoEditing",
    label: "Photo Editing",
    icon: ImageIcon,
    description: "Photo editing tools",
  },
  {
    value: "imageGeneration",
    label: "Image Gen",
    icon: ImageIcon,
    description: "Image generation",
  },
  {
    value: "textGeneration",
    label: "Text Gen",
    icon: Type,
    description: "Text generation",
  },
  {
    value: "coding",
    label: "Coding",
    icon: Code,
    description: "Code editor preferences",
  },
  {
    value: "flashcard",
    label: "Flashcards",
    icon: BookOpen,
    description: "Study settings",
  },
  {
    value: "playground",
    label: "Playground",
    icon: Gamepad2,
    description: "Playground defaults",
  },
  {
    value: "agentContext",
    label: "Agent Context",
    icon: Bot,
    description: "Agent context settings",
  },
];

const tabComponents: Record<
  PreferenceTab,
  React.LazyExoticComponent<React.ComponentType>
> = {
  display: DisplayPreferences,
  prompts: PromptsPreferences,
  voice: VoicePreferences,
  textToSpeech: TextToSpeechPreferences,
  assistant: AssistantPreferences,
  email: EmailPreferences,
  videoConference: VideoConferencePreferences,
  photoEditing: PhotoEditingPreferences,
  imageGeneration: ImageGenerationPreferences,
  textGeneration: TextGenerationPreferences,
  coding: CodingPreferences,
  flashcard: FlashcardPreferences,
  playground: PlaygroundPreferences,
  aiModels: AiModelsPreferences,
  messaging: MessagingPreferences,
  agentContext: AgentContextPreferences,
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

interface VSCodePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PreferenceTab;
}

export function VSCodePreferencesModal({
  isOpen,
  onClose,
  initialTab = "display",
}: VSCodePreferencesModalProps) {
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<PreferenceTab>(initialTab);
  const [mobileShowContent, setMobileShowContent] = useState(false);
  const preferences = useSelector(
    (state: RootState) => state.userPreferences as UserPreferencesState,
  );
  const meta = preferences._meta ?? {
    isLoading: false,
    error: null,
    lastSaved: null,
    hasUnsavedChanges: false,
  };

  const handleSave = () => {
    // Sync engine persists every mutation transparently — this button
    // now just clears the dirty indicator.
    dispatch(clearUnsavedChanges());
  };
  const handleReset = () => dispatch(resetToLoadedPreferences());

  const activeCategory = categories.find((c) => c.value === activeTab);
  const ActiveComponent = tabComponents[activeTab];

  const footer = (
    <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2.5 shrink-0">
      <div className="text-xs text-muted-foreground">
        {meta.isLoading && (
          <span className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        )}
        {meta.hasUnsavedChanges && !meta.isLoading && (
          <span className="text-amber-500">Unsaved changes</span>
        )}
        {meta.lastSaved && !meta.hasUnsavedChanges && !meta.isLoading && (
          <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Saved
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={!meta.hasUnsavedChanges || meta.isLoading}
          className="h-7 text-xs gap-1.5"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!meta.hasUnsavedChanges || meta.isLoading}
          className="h-7 text-xs gap-1.5"
        >
          {meta.isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          Save
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DrawerContent className="max-h-[92dvh] flex flex-col">
          <DrawerTitle className="sr-only">Preferences</DrawerTitle>
          {!mobileShowContent ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Preferences</span>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="pb-safe">
                  {categories.map((cat) => {
                    const Icon = cat.icon as React.FC<{ className?: string }>;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => {
                          setActiveTab(cat.value);
                          setMobileShowContent(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 active:bg-muted transition-colors border-b border-border/30 last:border-0"
                      >
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{cat.label}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {cat.description}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-3 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileShowContent(false)}
                  className="h-7 px-2 text-xs gap-1"
                >
                  <ChevronRight className="h-3 w-3 rotate-180" />
                  Back
                </Button>
                <span className="text-sm font-semibold">
                  {activeCategory?.label}
                </span>
              </div>
              <ScrollArea className="flex-1 px-4 py-3">
                <Suspense fallback={<LoadingFallback />}>
                  <ActiveComponent />
                </Suspense>
              </ScrollArea>
              {footer}
            </>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-[900px] h-[80vh] max-h-[700px] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogTitle className="sr-only">Preferences</DialogTitle>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b shrink-0">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Preferences</span>
          {activeCategory && (
            <>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-sm text-muted-foreground">
                {activeCategory.label}
              </span>
            </>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-52 shrink-0 border-r bg-muted/20 overflow-y-auto">
            {categories.map((cat) => {
              const Icon = cat.icon as React.FC<{ className?: string }>;
              const isActive = cat.value === activeTab;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveTab(cat.value)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary border-r-2 border-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
          <ScrollArea className="flex-1">
            <div className="p-5">
              <Suspense fallback={<LoadingFallback />}>
                <ActiveComponent />
              </Suspense>
            </div>
          </ScrollArea>
        </div>
        {footer}
      </DialogContent>
    </Dialog>
  );
}

export default VSCodePreferencesModal;
