"use client";

import React, { useState, Suspense, lazy } from "react";
import { useSelector } from "react-redux";
import { cn } from "@/lib/utils";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";
import {
  type UserPreferencesState,
  savePreferencesToDatabase,
  resetToLoadedPreferences,
} from "@/lib/redux/slices/userPreferencesSlice";
import type { PreferenceTab } from "@/components/user-preferences/PreferencesPage";

const DisplayPreferences = lazy(
  () => import("@/components/user-preferences/DisplayPreferences"),
);
const PromptsPreferences = lazy(
  () => import("@/components/user-preferences/PromptsPreferences"),
);
const VoicePreferences = lazy(
  () => import("@/components/user-preferences/VoicePreferences"),
);
const TextToSpeechPreferences = lazy(
  () => import("@/components/user-preferences/TextToSpeechPreferences"),
);
const AssistantPreferences = lazy(
  () => import("@/components/user-preferences/AssistantPreferences"),
);
const EmailPreferences = lazy(
  () => import("@/components/user-preferences/EmailPreferences"),
);
const VideoConferencePreferences = lazy(
  () => import("@/components/user-preferences/VideoConferencePreferences"),
);
const PhotoEditingPreferences = lazy(
  () => import("@/components/user-preferences/PhotoEditingPreferences"),
);
const ImageGenerationPreferences = lazy(
  () => import("@/components/user-preferences/ImageGenerationPreferences"),
);
const TextGenerationPreferences = lazy(
  () => import("@/components/user-preferences/TextGenerationPreferences"),
);
const CodingPreferences = lazy(
  () => import("@/components/user-preferences/CodingPreferences"),
);
const FlashcardPreferences = lazy(
  () => import("@/components/user-preferences/FlashcardPreferences"),
);
const PlaygroundPreferences = lazy(
  () => import("@/components/user-preferences/PlaygroundPreferences"),
);
const AiModelsPreferences = lazy(
  () => import("@/components/user-preferences/AiModelsPreferences"),
);
const MessagingPreferences = lazy(
  () => import("@/components/user-preferences/MessagingPreferences"),
);

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
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

interface UserPreferencesWindowProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PreferenceTab;
}

export default function UserPreferencesWindow({
  isOpen,
  onClose,
  initialTab = "display",
}: UserPreferencesWindowProps) {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<PreferenceTab>(initialTab);
  const preferences = useSelector(
    (state: RootState) => state.userPreferences as UserPreferencesState,
  );

  if (!isOpen) return null;

  const meta = preferences._meta ?? {
    isLoading: false,
    error: null,
    lastSaved: null,
    hasUnsavedChanges: false,
  };

  const handleSave = () => {
    const { _meta: _, ...data } = preferences;
    dispatch(savePreferencesToDatabase(data));
  };
  const handleReset = () => dispatch(resetToLoadedPreferences());

  const activeCategory = categories.find((c) => c.value === activeTab);
  const ActiveComponent = tabComponents[activeTab];

  const sidebarContent = (
    <ScrollArea className="flex-1 w-full">
      <div className="py-2">
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
    </ScrollArea>
  );

  return (
    <WindowPanel
      title="User Preferences"
      width={900}
      height={650}
      urlSyncKey="user_preferences"
      onClose={onClose}
      sidebar={sidebarContent}
      sidebarDefaultSize={22}
      sidebarMinSize={12}
      sidebarClassName="bg-muted/20"
      footer={
        <>
          <div className="text-muted-foreground">
            {meta.isLoading && (
              <span className="flex items-center gap-1.5">
                <Loader2 className="animate-spin" />
                Saving...
              </span>
            )}
            {meta.hasUnsavedChanges && !meta.isLoading && (
              <span className="text-amber-500">Unsaved changes</span>
            )}
            {meta.lastSaved && !meta.hasUnsavedChanges && !meta.isLoading && (
              <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check />
                Saved
              </span>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!meta.hasUnsavedChanges || meta.isLoading}
              className="h-5 text-xs gap-1 px-2"
            >
              <RotateCcw />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!meta.hasUnsavedChanges || meta.isLoading}
              className="h-5 text-xs gap-1 px-2"
            >
              {meta.isLoading ? <Loader2 className="animate-spin" /> : <Save />}
              Save
            </Button>
          </div>
        </>
      }
    >
      <div className="flex flex-col h-full w-full overflow-hidden bg-background">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {activeCategory && (
            <div className="flex items-center px-3 py-1.5 border-b border-border bg-muted/40 shrink-0">
              <div className="flex items-center text-sm font-medium">
                {React.createElement(activeCategory.icon, {
                  className: "h-4 w-4 mr-2 text-muted-foreground",
                })}
                {activeCategory.label}
              </div>
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-5">
              <Suspense fallback={<LoadingFallback />}>
                <ActiveComponent />
              </Suspense>
            </div>
          </ScrollArea>
        </div>
      </div>
    </WindowPanel>
  );
}
