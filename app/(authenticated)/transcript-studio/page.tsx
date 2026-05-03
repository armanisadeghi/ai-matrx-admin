import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { listSessionsServer } from "@/features/transcript-studio/service/studioService";
import { StudioHydrator } from "@/features/transcript-studio/route/StudioHydrator";
import { StudioRoute } from "./_components/StudioRoute";

interface PageProps {
  searchParams: Promise<{ session?: string }>;
}

export default async function TranscriptStudioPage({ searchParams }: PageProps) {
  const { session: initialSessionId } = await searchParams;

  // Best-effort SSR seed of the session list. Failures fall through to a
  // client-side fetch in StudioView (showing the loading state briefly).
  const supabase = await createClient();
  let seeds: Awaited<ReturnType<typeof listSessionsServer>> = [];
  try {
    seeds = await listSessionsServer(supabase);
  } catch {
    seeds = [];
  }

  return (
    <>
      <StudioHydrator
        seeds={seeds}
        initialSessionId={initialSessionId ?? null}
      />
      <Suspense fallback={null}>
        <StudioRoute />
      </Suspense>
    </>
  );
}
