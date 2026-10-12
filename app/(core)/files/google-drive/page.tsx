import { GoogleDriveLogo } from "@/components/icons/google-brand";
import { redirect } from "next/navigation";
import { GoogleDriveLibrary } from "@/features/files/google-drive/GoogleDriveLibrary";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";

/** Restricted whole-Drive metadata review lives inside the authenticated Files area. */
export default async function GoogleDriveFilesPage() {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) redirect("/files");
  return (
    <>
      <RouteHeader
        left={
          <>
            <ChevronLeftTapButton href="/files" ariaLabel="Back to Files" />
            <GoogleDriveLogo className="ml-2 size-4 shrink-0" />
            <span className="ml-2 truncate text-sm font-medium text-foreground">
              Google Drive
            </span>
          </>
        }
      />
      <GoogleDriveLibrary />
    </>
  );
}
