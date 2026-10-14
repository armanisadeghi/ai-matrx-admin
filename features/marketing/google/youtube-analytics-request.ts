import type { GoogleConnectionSummary } from "@/features/marketing/google/types";
import { GOOGLE_SCOPE, hasGoogleGrantedScope } from "@/lib/googleScopes";

export interface YouTubeAnalyticsSelection {
  connectionId: string;
  channelId: string;
  startDate: string;
  endDate: string;
}

interface YouTubeAnalyticsLoadRequest {
  connectionId: string;
  organizationId: string;
  channelId: string;
  startDate: string;
  endDate: string;
}

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

export async function loadYouTubeAnalyticsReport<TResult>({
  connectionId,
  organizationId,
  channelId,
  mutate,
  reset,
  setLoadedFor,
  today,
}: {
  connectionId: string;
  organizationId: string | Promise<string>;
  channelId: string;
  mutate: (request: YouTubeAnalyticsLoadRequest) => Promise<TResult>;
  reset: () => void;
  setLoadedFor: (selection: YouTubeAnalyticsSelection | null) => void;
  today?: Date;
}): Promise<TResult> {
  setLoadedFor(null);
  reset();
  const window = youtubeAnalyticsWindow(today);
  const result = await mutate({
    connectionId,
    organizationId: await organizationId,
    channelId,
    startDate: window.startDate,
    endDate: window.endDate,
  });
  setLoadedFor({
    connectionId,
    channelId,
    startDate: window.startDate,
    endDate: window.endDate,
  });
  return result;
}
