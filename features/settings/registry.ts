import { lazy } from "react";
import {
  Palette,
  Bell,
  Keyboard,
  Code,
  Brain,
  Mic,
  Volume2,
  Bot,
  Mail,
  Video,
  Image as ImageIcon,
  Type,
  BookOpen,
  Cpu,
  ShieldCheck,
  User,
  Database,
  Globe,
  Sun,
  Layers,
  Eye,
  Settings as SettingsIcon,
  MessageSquare,
  Camera,
} from "lucide-react";
import type { SettingsTabDef, ResolvedSettingsTab } from "./types";
import type { SettingsTreeNode } from "@/components/official/settings";

/**
 * Single source of truth for every settings tab.
 *
 * Adding a setting? See .cursor/skills/settings-system/SKILL.md once Phase 9 lands.
 *
 * NOTE: tabs are typed permissively because they're lazy-loaded and have no
 * props at the call site — `ComponentType<Record<string, never>>` means "no
 * required props" but structurally any tab that uses `useSetting` internally
 * is assignable.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lazyTab = (importer: () => Promise<{ default: any }>): any =>
  lazy(importer);

// ── Placeholder (used only for category-only nodes) ──────────────────────────
const Placeholder = lazyTab(() => import("./tabs/PlaceholderTab"));

// ── Real tabs ───────────────────────────────────────────────────────────────
const MessagingTab = lazyTab(() => import("./tabs/MessagingTab"));
const AppearanceTab = lazyTab(() => import("./tabs/AppearanceTab"));
const VoiceTab = lazyTab(() => import("./tabs/VoiceTab"));
const TextToSpeechTab = lazyTab(() => import("./tabs/TextToSpeechTab"));
const AssistantTab = lazyTab(() => import("./tabs/AssistantTab"));
const EmailTab = lazyTab(() => import("./tabs/EmailTab"));
const TextGenerationTab = lazyTab(() => import("./tabs/TextGenerationTab"));
const ImageGenerationTab = lazyTab(() => import("./tabs/ImageGenerationTab"));
const PhotoEditingTab = lazyTab(() => import("./tabs/PhotoEditingTab"));
const VideoConferenceTab = lazyTab(() => import("./tabs/VideoConferenceTab"));
const CodingTab = lazyTab(() => import("./tabs/CodingTab"));
const FlashcardsTab = lazyTab(() => import("./tabs/FlashcardsTab"));
const AiModelsTab = lazyTab(() => import("./tabs/AiModelsTab"));
const AdminServerTab = lazyTab(() => import("./tabs/AdminServerTab"));

export const settingsRegistry: SettingsTabDef[] = [
  // ── General ───────────────────────────────────────────────────────────────
  {
    id: "general",
    label: "General",
    icon: SettingsIcon,
    description: "Foundational preferences for the app.",
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "general.notifications",
    label: "Notifications",
    icon: Bell,
    parentId: "general",
    description: "Desktop notifications, volume, alerts.",
    searchKeywords: ["alerts", "sound", "ping"],
    component: MessagingTab, // shares the messaging implementation
    persistence: "synced",
  },
  {
    id: "general.language",
    label: "Language & Region",
    icon: Globe,
    parentId: "general",
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "general.privacy",
    label: "Privacy",
    icon: ShieldCheck,
    parentId: "general",
    description: "Telemetry, personalization",
    component: Placeholder,
    persistence: "synced",
  },

  // ── Appearance (theme slice + display module) ─────────────────────────────
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Theme, density, accent color.",
    searchKeywords: ["dark", "light", "mode", "theme", "layout"],
    component: AppearanceTab,
    persistence: "synced",
  },
  {
    id: "appearance.theme",
    label: "Theme",
    icon: Sun,
    parentId: "appearance",
    description: "Light, dark, accent variants.",
    searchKeywords: ["dark mode", "light mode"],
    component: AppearanceTab,
    persistence: "synced",
  },
  {
    id: "appearance.density",
    label: "Density",
    icon: Layers,
    parentId: "appearance",
    component: AppearanceTab,
    persistence: "synced",
  },
  {
    id: "appearance.accent",
    label: "Accent color",
    icon: Eye,
    parentId: "appearance",
    component: AppearanceTab,
    persistence: "synced",
  },

  // ── AI & Models ───────────────────────────────────────────────────────────
  {
    id: "ai",
    label: "AI & Models",
    icon: Brain,
    description: "Models, generation, assistants.",
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "ai.models",
    label: "Models",
    icon: Cpu,
    parentId: "ai",
    description: "Choose which models appear in pickers.",
    searchKeywords: ["gpt", "claude", "llm", "provider"],
    component: AiModelsTab,
    persistence: "synced",
  },
  {
    id: "ai.assistants",
    label: "Assistants",
    icon: Bot,
    parentId: "ai",
    description: "Default assistant behaviour.",
    component: AssistantTab,
    persistence: "synced",
  },
  {
    id: "ai.textGeneration",
    label: "Text generation",
    icon: Type,
    parentId: "ai",
    component: TextGenerationTab,
    persistence: "synced",
  },
  {
    id: "ai.imageGeneration",
    label: "Image generation",
    icon: ImageIcon,
    parentId: "ai",
    component: ImageGenerationTab,
    persistence: "synced",
  },
  {
    id: "ai.photoEditing",
    label: "Photo editing",
    icon: Camera,
    parentId: "ai",
    component: PhotoEditingTab,
    persistence: "synced",
  },

  // ── Editor ────────────────────────────────────────────────────────────────
  {
    id: "editor",
    label: "Editor",
    icon: Code,
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "editor.coding",
    label: "Coding",
    icon: Code,
    parentId: "editor",
    component: CodingTab,
    persistence: "synced",
  },
  {
    id: "editor.keybindings",
    label: "Keybindings",
    icon: Keyboard,
    parentId: "editor",
    component: Placeholder,
    persistence: "synced",
  },

  // ── Voice & Audio ─────────────────────────────────────────────────────────
  {
    id: "voice",
    label: "Voice & Audio",
    icon: Mic,
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "voice.input",
    label: "Voice input",
    icon: Mic,
    parentId: "voice",
    description: "Microphone, wake word, speech speed.",
    component: VoiceTab,
    persistence: "synced",
  },
  {
    id: "voice.tts",
    label: "Text-to-speech",
    icon: Volume2,
    parentId: "voice",
    description: "Voice used to read responses aloud.",
    component: TextToSpeechTab,
    persistence: "synced",
  },

  // ── Communication ─────────────────────────────────────────────────────────
  {
    id: "communication.email",
    label: "Email",
    icon: Mail,
    component: EmailTab,
    persistence: "local-only", // stored via separate API, not unified sync yet
  },
  {
    id: "communication.video",
    label: "Video conference",
    icon: Video,
    component: VideoConferenceTab,
    persistence: "synced",
  },
  {
    id: "communication.messaging",
    label: "Messaging",
    icon: MessageSquare,
    description: "Notification sounds and desktop alerts.",
    searchKeywords: ["notifications", "sound", "volume", "alerts", "banner"],
    component: MessagingTab,
    persistence: "synced",
  },

  // ── Learning ──────────────────────────────────────────────────────────────
  {
    id: "learning.flashcards",
    label: "Flashcards",
    icon: BookOpen,
    component: FlashcardsTab,
    persistence: "synced",
  },

  // ── Profile / Account ─────────────────────────────────────────────────────
  {
    id: "account",
    label: "Profile",
    icon: User,
    component: Placeholder,
    persistence: "synced",
  },

  // ── Admin (admin-gated) ───────────────────────────────────────────────────
  {
    id: "admin",
    label: "Admin",
    icon: ShieldCheck,
    description: "Admin-only overrides.",
    requiresAdmin: true,
    component: Placeholder,
    persistence: "local-only",
  },
  {
    id: "admin.server",
    label: "Server environment",
    icon: Database,
    parentId: "admin",
    description: "Override the backend host for API calls.",
    searchKeywords: ["url", "endpoint", "localhost", "staging"],
    requiresAdmin: true,
    component: AdminServerTab,
    persistence: "local-only",
  },
];

/** Returns the registry filtered by visibility rules. */
export function getVisibleTabs(isAdmin: boolean): SettingsTabDef[] {
  return settingsRegistry.filter((t) => {
    if (t.requiresAdmin && !isAdmin) return false;
    return true;
  });
}

/** Returns the registry organized as a hierarchical array for the tree. */
export function getTabTree(isAdmin: boolean): ResolvedSettingsTab[] {
  const visible = getVisibleTabs(isAdmin);
  const byId = new Map(
    visible.map((t) => [t.id, { ...t } as ResolvedSettingsTab]),
  );
  const roots: ResolvedSettingsTab[] = [];
  for (const t of byId.values()) {
    if (t.parentId) {
      const parent = byId.get(t.parentId);
      if (parent) {
        (parent.children ??= []).push(t);
      } else {
        roots.push(t);
      }
    } else {
      roots.push(t);
    }
  }
  return roots;
}

/** Returns the registry as SettingsTreeNode[], ready for the tree components. */
export function getTabTreeNodes(isAdmin: boolean): SettingsTreeNode[] {
  const toNode = (t: ResolvedSettingsTab): SettingsTreeNode => ({
    id: t.id,
    label: t.label,
    icon: t.icon,
    description: t.description,
    searchKeywords: t.searchKeywords,
    children: t.children?.map(toNode),
  });
  return getTabTree(isAdmin).map(toNode);
}

/** Find one tab by id. */
export function findTab(id: string): SettingsTabDef | undefined {
  return settingsRegistry.find((t) => t.id === id);
}
