// record-view: none — the Memory hub, one door per section of Matrx Memory
/**
 * `/memory` — Matrx Memory's front door (Arman, 2026-10-20: Memory replaces
 * Knowledge). One group of doors per section of the Memory tree; every door is
 * a real page. Guests get the Knowledge landing, like /knowledge/hub.
 */
import KnowledgeLanding from "@/features/auth/components/module-landing/landings/KnowledgeLanding";
import { ModuleDoors } from "@/features/auth/components/module-landing/ModuleDoors";
import { MEMORY_HUB_SECTIONS } from "@/features/memory/memory-hub-sections";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";

export default async function MemoryHubPage() {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) return <KnowledgeLanding />;
  return (
    <>
      <RecordPageHeader level={{ name: "Memory" }} />
      <div className="h-full overflow-y-auto bg-textured pt-[var(--shell-header-h)]">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
          {MEMORY_HUB_SECTIONS.map((section) => (
            <section key={section.id} className="mb-8" aria-labelledby={`memory-${section.id}`}>
              <h2 id={`memory-${section.id}`} className="text-sm font-semibold text-foreground">
                {section.title}
              </h2>
              <ModuleDoors doors={section.doors} className="mt-3" />
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
