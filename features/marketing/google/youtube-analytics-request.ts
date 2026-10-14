import type { GoogleConnectionSummary } from "@/features/marketing/google/types";
import { GOOGLE_SCOPE, hasGoogleGrantedScope } from "@/lib/googleScopes";

export function canReadYouTubeAnalytics(
  connection: Pick<GoogleConnectionSummary, "scopes">,
): boolean {
  return (
    hasGoogleGrantedScope(connection.scopes, GOOGLE_SCOPE.youtubeReadonly) &&
    hasGoogleGrantedScope(
      connection.scopes,
      GOOGLE_SCOPE.youtubeAnalyticsReadonly,
    )
  );
}

export function youtubeAnalyticsWindow(today: Date = new Date()): {
  startDate: string;
  endDate: string;
} {
  const endDate = new Date(today);
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - 27);
  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
  };
}
