// /memory/topics — placeholder (registered promise memory.topics). Research topics live
// here AND under Research (Arman, 2026-10-20).
import { BookOpen, Database, Lightbulb, Plus, Tags } from "lucide-react";
import { ModulePromiseSurface } from "@/features/auth/components/module-landing/ModulePromiseSurface";

export default function MemoryTopicsPage() {
  return (
    <ModulePromiseSurface
      title="Topics"
      icon={Tags}
      promiseKey="memory.topics"
      doorsHeading="Works today"
      doors={[
        { href: "/research", label: "Research topics", hint: "Every topic you research", icon: BookOpen },
        { href: "/research/topics/new", label: "New research topic", hint: "Start researching a topic", icon: Plus },
        { href: "/knowledge/data-stores", label: "Data stores", hint: "Collections of sources by subject", icon: Database },
        { href: "/suggestions", label: "Suggestions", hint: "Links AI found across your work", icon: Lightbulb },
      ]}
    />
  );
}
