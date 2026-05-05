import { createClient } from "@/utils/supabase/server";
import { WhatsAppDemoClient } from "./WhatsAppDemoClient";

interface PageProps {
  searchParams: Promise<{ mock?: string }>;
}

export default async function WhatsAppDemoPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialMode = params.mock === "0" ? "live" : "mock";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <WhatsAppDemoClient
      initialMode={initialMode}
      userName={
        (user?.user_metadata?.full_name as string | undefined) ??
        (user?.email?.split("@")[0] as string | undefined) ??
        "Armani"
      }
      userAvatarUrl={
        (user?.user_metadata?.avatar_url as string | undefined) ?? null
      }
    />
  );
}
