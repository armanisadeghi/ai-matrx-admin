"use client";

import { SocialHandleValue } from "@ai-matrx/design-system";
import { formatCount } from "@ai-matrx/kit/format";
import { LiteTable, type MatrxColumnDef } from "@ai-matrx/design-system/lite-table";
import { Badge } from "@/components/ui/badge";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { KpiGrid, KpiTile } from "@ai-matrx/design-system/controls";
import type { YouTubeAnalyticsPreview } from "@/features/marketing/google/types";
import type { YouTubeAnalyticsSelection } from "@/features/marketing/google/youtube-analytics-request";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

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
  currentSelection: YouTubeAnalyticsSelection | null,
): boolean {
  return (
    currentSelection !== null &&
    loadedFor?.connectionId === currentSelection.connectionId &&
    loadedFor.channelId === currentSelection.channelId &&
    loadedFor.startDate === currentSelection.startDate &&
    loadedFor.endDate === currentSelection.endDate
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

type YouTubeDay = YouTubeAnalyticsPreview["days"][number];
type YouTubeVideo = YouTubeAnalyticsPreview["videos"][number];

const METRIC_COLUMNS = <T extends YouTubeDay | YouTubeVideo>(): MatrxColumnDef<T>[] => [
  { id: "views", header: "Views", align: "right", accessorFn: (r) => r.views, cell: (r) => formatCount(r.views) },
  {
    id: "minutes",
    header: "Watch time (min)",
    align: "right",
    accessorFn: (r) => r.estimated_minutes_watched,
    cell: (r) => formatNumber(r.estimated_minutes_watched),
  },
  { id: "subscribers", header: "Subscribers gained", align: "right", accessorFn: (r) => r.subscribers_gained, cell: (r) => `+${r.subscribers_gained}` },
];

const dayColumns: MatrxColumnDef<YouTubeDay>[] = [
  { accessorKey: "day", header: "Day", defaultSortDirection: "desc", cell: (d) => <span className="font-medium">{formatDate(d.day)}</span> },
  ...METRIC_COLUMNS<YouTubeDay>(),
];

const videoColumns: MatrxColumnDef<YouTubeVideo>[] = [
  {
    accessorKey: "video_id",
    header: "Video ID",
    sortable: false,
    cell: (video) => (
      <OutboundLink
        href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.video_id)}`}
        aria-label={`Open YouTube video ${video.video_id}`}
        className="break-all font-mono underline-offset-2 hover:underline"
      >
        {video.video_id}
      </OutboundLink>
    ),
  },
  ...METRIC_COLUMNS<YouTubeVideo>(),
];

export function YouTubeAnalyticsResult({
  report,
  loadedFor,
  currentSelection,
}: {
  report: YouTubeAnalyticsPreview | null;
  loadedFor: YouTubeAnalyticsSelection | null;
  currentSelection: YouTubeAnalyticsSelection | null;
}) {
  if (
    !report ||
    !sameSelection(loadedFor, currentSelection) ||
    !currentSelection ||
    report.channel_id !== currentSelection.channelId ||
    report.start_date !== currentSelection.startDate ||
    report.end_date !== currentSelection.endDate
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
        <span className="inline-flex min-w-0">
          <SocialHandleValue value={`https://www.youtube.com/channel/${encodeURIComponent(report.channel_id)}`} platform="youtube" />
        </span>
      </div>

      <KpiGrid className="grid-cols-2 sm:grid-cols-4 lg:grid-cols-4">
        <KpiTile
          label={`Views (${requestedDays}d)`}
          value={report.summary ? formatCount(report.summary.views) : null}
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
              ? `+${formatCount(report.summary.subscribers_gained)}`
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
          <LiteTable
            data={report.days}
            columns={dayColumns}
            getRowId={(day) => day.day}
            density="condensed"
            maxHeight="18rem"
            mobile="scroll"
            ariaLabel="Daily results"
          />
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
                <ErrorAlchemyMenu
                  error={VIDEO_ERROR_LABEL[report.video_report_error]}
                />
              </Badge>
            ) : null}
            <Badge variant="outline">{report.videos.length} returned</Badge>
          </div>
        </div>
        {report.videos.length ? (
          <LiteTable
            data={report.videos}
            columns={videoColumns}
            getRowId={(video) => video.video_id}
            density="condensed"
            maxHeight="18rem"
            mobile="scroll"
            ariaLabel="Video results"
          />
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
