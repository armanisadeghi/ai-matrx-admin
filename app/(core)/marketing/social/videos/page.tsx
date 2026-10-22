// record-view: none — a cross-brand list; each card opens its brand's own project page
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { MarketingWorkspaceNav } from "@/features/marketing/components/shared/MarketingWorkspaceNav";
import { AllVideosPage } from "@/features/marketing/social/components/AllVideosPage";

/** Every brand's video projects in one place (Marketing > Social > Videos). A brand's own list is /marketing/[brand]/socials/videos. */
export default function MarketingSocialVideosPage() {
  return (
    <>
      <RouteHeader
        left={<h1 className="ml-2 truncate text-sm font-medium text-foreground">Videos</h1>}
        center={<MarketingWorkspaceNav />}
      />
      <main className="h-full overflow-y-auto bg-textured px-3 pb-6 pt-[calc(var(--shell-header-h)+0.5rem)] sm:px-4">
        <div className="mx-auto w-full max-w-[1600px]">
          <AllVideosPage />
        </div>
      </main>
    </>
  );
}
