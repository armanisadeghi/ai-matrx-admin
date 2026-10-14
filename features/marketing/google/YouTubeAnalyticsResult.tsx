"use client";

import { Badge } from "@/components/ui/badge";
import { KpiGrid, KpiTile } from "@/components/official/kpi/KpiTile";
import type { YouTubeAnalyticsPreview } from "@/features/marketing/google/types";

export interface YouTubeAnalyticsSelection {
  connectionId: string;
  channelId: string;
}

const VIDEO_ERROR_LABEL: Record<
  NonNullable<YouTubeAnalyticsPreview["video_report_error"]>,
  string
> = {
  provider_refused: "Provider refused",
  provider_unavailable: "Provider unavailable",
  quota_exceeded: "Provider quota reached",
  invalid_provider_response: "Invalid provider response",
};

function sameSelection(
  loadedFor: YouTubeAnalyticsSelection | null,
  currentSelection: YouTubeAnalyticsSelection,
): boolean {
  return (
    loadedFor?.connectionId === currentSelection.connectionId &&
    loadedFor.channelId === currentSelection.channelId
  );
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function dayDifference(start: string, end: string): number {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  return Math.max(0, Math.round((endMs - startMs) / 86_400_000));
}

export function YouTubeAnalyticsResult({
  report,
  loadedFor,
  currentSelection,
}: {
  report: YouTubeAnalyticsPreview | null;
  loadedFor: YouTubeAnalyticsSelection | null;
  currentSelection: YouTubeAnalyticsSelection;
}) {
  if (
    !report ||
    !sameSelection(loadedFor, currentSelection) ||
    report.channel_id !== currentSelection.channelId
  ) {
    return null;
  }

  const requestedDays = dayDifference(report.start_date, report.end_date) + 1;
  const lagDays = report.data_through
    ? dayDifference(report.data_through, report.end_date)
    : null;
  const dataThroughLabel = report.data_through
    ? `Data through ${formatDate(report.data_through)}`
    : "Data through —";
  const videoStatus =
    report.video_report_status === "complete"
      ? report.videos_truncated
        ? "Capped video list"
        : "Complete video list"
      : report.video_report_status === "partial"
        ? "Partial video list"
        : "Video report unavailable";

  return (
    <div
      className="space-y-4 rounded-md border p-3"
      aria-label="YouTube Analytics report"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">{requestedDays}-day window</Badge>
        <Badge variant="secondary">
          {report.days.length}/{requestedDays} days returned
        </Badge>
        <Badge variant={lagDays === 0 ? "secondary" : "outline"}>
          {dataThroughLabel}
        </Badge>
        {lagDays && lagDays > 0 ? (
          <Badge variant="outline">{lagDays}d provider lag</Badge>
        ) : null}
        <a
          href={`https://www.youtube.com/channel/${encodeURIComponent(report.channel_id)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open YouTube channel ${report.channel_id}`}
          className="break-all rounded bg-muted px-2 py-1 font-mono text-muted-foreground underline-offset-2 hover:underline"
        >
          {report.channel_id}
        </a>
      </div>

      <KpiGrid className="grid-cols-2 sm:grid-cols-4 lg:grid-cols-4">
        <KpiTile
          label={`Views (${requestedDays}d)`}
          value={report.summary ? report.summary.views.toLocaleString() : null}
          hint={`${requestedDays}-day window`}
          title="Views returned for the selected channel and date window."
        />
        <KpiTile
          label={`Watch time (${requestedDays}d)`}
          value={
            report.summary
              ? formatNumber(report.summary.estimated_minutes_watched)
              : null
          }
          hint={`minutes · ${requestedDays}-day window`}
          title="Estimated minutes watched for the selected channel and date window."
        />
        <KpiTile
          label="Subscribers gained"
          value={
            report.summary
              ? `+${report.summary.subscribers_gained.toLocaleString()}`
              : null
          }
          hint={`${requestedDays}-day window`}
          title="Subscribers gained during the selected date window."
        />
        <KpiTile
          label="Data through"
          value={report.data_through ? formatDate(report.data_through) : null}
          hint={
            report.data_through
              ? `Requested through ${formatDate(report.end_date)}`
              : "No daily rows"
          }
          title="Latest day returned by YouTube; recent metrics can arrive later."
        />
      </KpiGrid>

      <section className="space-y-2" aria-labelledby="youtube-daily-results">
        <h3 id="youtube-daily-results" className="text-sm font-medium">
          Daily results
        </h3>
        {report.days.length ? (
          <div className="max-h-72 overflow-auto rounded border">
            <table className="w-full min-w-[36rem] text-left text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Day</th>
                  <th className="px-3 py-2 text-right font-medium">Views</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Watch time (min)
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Subscribers gained
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.days.map((day) => (
                  <tr key={day.day} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      {formatDate(day.day)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {day.views.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(day.estimated_minutes_watched)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      +{day.subscribers_gained}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded border border-dashed p-3 text-sm text-muted-foreground">
            No daily rows were returned.
          </p>
        )}
      </section>

      <section className="space-y-2" aria-labelledby="youtube-video-results">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="youtube-video-results" className="text-sm font-medium">
            Videos
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge
              variant={
                report.video_report_status === "complete"
                  ? "secondary"
                  : "outline"
              }
            >
              {videoStatus}
            </Badge>
            {report.video_report_error ? (
              <Badge variant="outline">
                {VIDEO_ERROR_LABEL[report.video_report_error]}
              </Badge>
            ) : null}
            <Badge variant="outline">{report.videos.length} returned</Badge>
          </div>
        </div>
        {report.videos.length ? (
          <div className="max-h-72 overflow-auto rounded border">
            <table className="w-full min-w-[42rem] text-left text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Video ID</th>
                  <th className="px-3 py-2 text-right font-medium">Views</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Watch time (min)
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Subscribers gained
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.videos.map((video) => (
                  <tr key={video.video_id} className="border-t">
                    <td className="px-3 py-2">
                      <a
                        href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.video_id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open YouTube video ${video.video_id}`}
                        className="break-all font-mono underline-offset-2 hover:underline"
                      >
                        {video.video_id}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {video.views.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(video.estimated_minutes_watched)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      +{video.subscribers_gained}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded border border-dashed p-3 text-sm text-muted-foreground">
            {report.video_report_status === "complete"
              ? "No videos were returned."
              : "Video results are unavailable for this report."}
          </p>
        )}
      </section>
    </div>
  );
}
