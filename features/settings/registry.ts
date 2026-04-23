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
  Gamepad2,
  Cpu,
  ShieldCheck,
  User,
  Database,
  Sparkles,
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
 * Phase 3 deliverable: the catalog exists and is wired to `useSetting`. The
 * actual tab components are placeholders that the later phases replace with
 * primitives-based implementations.
 *
 * Adding a setting? See .cursor/skills/settings-system/SKILL.md once Phase 9 lands.
 */

// Lazy-loaded placeholder — real tabs live under features/settings/tabs/* (Phase 5+).
// Typed permissively so tabs with internal props don't fail structural checks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Placeholder = lazy(() => import("./tabs/PlaceholderTab")) as any;

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
    component: Placeholder,
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

  // ── Appearance (theme slice) ──────────────────────────────────────────────
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Theme, density, accent color.",
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "appearance.theme",
    label: "Theme",
    icon: Sun,
    parentId: "appearance",
    description: "Light, dark, system.",
    searchKeywords: ["dark mode", "light mode"],
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "appearance.density",
    label: "Density",
    icon: Layers,
    parentId: "appearance",
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "appearance.accent",
    label: "Accent color",
    icon: Eye,
    parentId: "appearance",
    component: Placeholder,
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
    searchKeywords: ["gpt", "claude", "llm"],
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "ai.prompts",
    label: "Prompts",
    icon: Sparkles,
    parentId: "ai",
    description: "Default model, temperature, thinking mode.",
    searchKeywords: ["temperature", "thinking"],
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "ai.assistants",
    label: "Assistants",
    icon: Bot,
    parentId: "ai",
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "ai.textGeneration",
    label: "Text generation",
    icon: Type,
    parentId: "ai",
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "ai.imageGeneration",
    label: "Image generation",
    icon: ImageIcon,
    parentId: "ai",
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "ai.photoEditing",
    label: "Photo editing",
    icon: Camera,
    parentId: "ai",
    component: Placeholder,
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
    component: Placeholder,
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
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "voice.tts",
    label: "Text-to-speech",
    icon: Volume2,
    parentId: "voice",
    component: Placeholder,
    persistence: "synced",
  },

  // ── Communication ─────────────────────────────────────────────────────────
  {
    id: "communication.email",
    label: "Email",
    icon: Mail,
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "communication.video",
    label: "Video conference",
    icon: Video,
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "communication.messaging",
    label: "Messaging",
    icon: MessageSquare,
    component: Placeholder,
    persistence: "synced",
  },

  // ── Learning ──────────────────────────────────────────────────────────────
  {
    id: "learning.flashcards",
    label: "Flashcards",
    icon: BookOpen,
    component: Placeholder,
    persistence: "synced",
  },
  {
    id: "learning.playground",
    label: "Playground",
    icon: Gamepad2,
    component: Placeholder,
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
    component: Placeholder,
    persistence: "local-only",
  },
];

/**
 * Returns the registry filtered by visibility rules.
 * `isAdmin` gates tabs with `requiresAdmin: true`.
 */
export function getVisibleTabs(isAdmin: boolean): SettingsTabDef[] {
  return settingsRegistry.filter((t) => {
    if (t.requiresAdmin && !isAdmin) return false;
    return true;
  });
}

/** Returns the registry organized as a hierarchical array for the tree. */
export function getTabTree(isAdmin: boolean): ResolvedSettingsTab[] {
  const visible = getVisibleTabs(isAdmin);
  const byId = new Map(visible.map((t) => [t.id, { ...t } as ResolvedSettingsTab]));
  const roots: ResolvedSettingsTab[] = [];
  for (const t of byId.values()) {
    if (t.parentId) {
      const parent = byId.get(t.parentId);
      if (parent) {
        (parent.children ??= []).push(t);
      } else {
        // Orphan — promote to root rather than drop silently
        roots.push(t);
      }
    } else {
      roots.push(t);
    }
  }
  return roots;
}

/** Returns the registry as SettingsTreeNode[], ready for SettingsTree / SettingsDrawerNav. */
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
