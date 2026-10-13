import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { APPLET_LAYOUT_KINDS, type AppletLayoutKind } from "@ai-matrx/applets";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { loginHref } from "@/utils/auth/auth-destination";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { LayoutAppletStart } from "@/features/applets-host/builder/LayoutAppletStart";

/**
 * /applets/build/layout — start an Applet from a stock layout (CONTRACTS amendment 2.12): pick a layout and the
 * agent or workflow it runs, then create it with no code, or open the builder seeded with both.
 * `?kind=<layout>` preselects a layout (the template gallery's cards link here).
 */
export const metadata: Metadata = { title: "Start from a layout | Applets" };

export default async function LayoutAppletPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { isAuthenticated } = await getSessionVerdict();
  const { kind } = await searchParams;
  const here = kind ? `/applets/build/layout?kind=${encodeURIComponent(kind)}` : "/applets/build/layout";
  if (!isAuthenticated) redirect(loginHref(here));
  const initialKind = (APPLET_LAYOUT_KINDS as readonly string[]).includes(kind ?? "") ? (kind as AppletLayoutKind) : null;
  return (
    <>
      <RecordPageHeader
        backHref="/applets/build"
        parents={[
          { label: "Applets", href: "/applets" },
          { label: "Build", href: "/applets/build" },
        ]}
        record={{ name: "Start from a layout" }}
      />
      <div className="h-full overflow-y-auto bg-textured pt-[var(--shell-header-h)]">
        <LayoutAppletStart initialKind={initialKind} />
      </div>
    </>
  );
}
