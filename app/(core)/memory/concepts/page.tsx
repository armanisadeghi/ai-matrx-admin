// /memory/concepts — placeholder (registered promise memory.concepts). The knowledge graph
// is the closest built thing.
import { Atom, BookA, Lightbulb, Network } from "lucide-react";
import { ModulePromiseSurface } from "@/features/auth/components/module-landing/ModulePromiseSurface";

export default function MemoryConceptsPage() {
  return (
    <ModulePromiseSurface
      title="Concepts"
      icon={Atom}
      promiseKey="memory.concepts"
      doorsHeading="Works today"
      parent={{ label: "Memory", href: "/memory" }}
      doors={[
        { href: "/knowledge/graph", label: "Knowledge graph", hint: "Entities and how they connect", icon: Network },
        { href: "/suggestions", label: "Suggestions", hint: "Links AI found across your work", icon: Lightbulb },
        { href: "/user-settings/voice/dictionary", label: "Dictionary", hint: "Your terms and how to say them", icon: BookA },
      ]}
    />
  );
}
