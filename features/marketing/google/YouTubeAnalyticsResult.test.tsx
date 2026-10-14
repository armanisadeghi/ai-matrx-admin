import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { YouTubeAnalyticsPreview } from "@/features/marketing/google/types";
import { YouTubeAnalyticsResult } from "@/features/marketing/google/YouTubeAnalyticsResult";
import {
  canReadYouTubeAnalytics,
  youtubeAnalyticsWindow,
} from "@/features/marketing/google/youtube-analytics-request";
import { GOOGLE_SCOPE } from "@/lib/googleScopes";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const REPORT = {
  channel_id: "UCgreenhomebuilds123456789",
  start_date: "2026-09-17",
  end_date: "2026-10-14",
  days: [
    {
      day: "2026-10-12",
      views: 820,
      estimated_minutes_watched: 321.5,
      average_view_duration_seconds: 93.4,
      subscribers_gained: 11,
    },
    {
      day: "2026-10-13",
      views: 1020,
      estimated_minutes_watched: 409.25,
      average_view_duration_seconds: 88.1,
      subscribers_gained: 14,
    },
  ],
  summary: {
    views: 1840,
    estimated_minutes_watched: 730.75,
    subscribers_gained: 25,
  },
  data_through: "2026-10-13",
  videos: [
    {
      video_id: "air-sealing-attic-2026",
      views: 1120,
      estimated_minutes_watched: 502.5,
      subscribers_gained: 17,
    },
    {
      video_id: "heat-pump-sizing-2026",
      views: 720,
      estimated_minutes_watched: 228.25,
      subscribers_gained: 8,
    },
  ],
  videos_truncated: true,
  video_report_status: "complete",
  video_report_error: null,
  access_mode: "read_only_non_monetary",
} satisfies YouTubeAnalyticsPreview;

const SELECTION = {
  connectionId: "google-green-home-studio",
  channelId: REPORT.channel_id,
};

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function renderResult(
  report: YouTubeAnalyticsPreview = REPORT,
  loadedFor = SELECTION,
  currentSelection = SELECTION,
) {
  await act(async () => {
    root.render(
      <YouTubeAnalyticsResult
        report={report}
        loadedFor={loadedFor}
        currentSelection={currentSelection}
      />,
    );
  });
  return container.textContent ?? "";
}

describe("YouTube Analytics report", () => {
  it("shows exact window totals, returned-day coverage, lag, truncation, and source IDs", async () => {
    const text = await renderResult();

    expect(text).toContain("28-day window");
    expect(text).toContain("2/28 days returned");
    expect(text).toContain("1d provider lag");
    expect(text).toContain("1,840");
    expect(text).toContain("730.8");
    expect(text).toContain("+25");
    expect(text).toContain("Capped video list");
    expect(text).toContain(REPORT.channel_id);
    expect(text).toContain("air-sealing-attic-2026");
    expect(text).toContain("heat-pump-sizing-2026");
    expect(
      container.querySelector<HTMLAnchorElement>(
        `a[href="https://www.youtube.com/channel/${REPORT.channel_id}"]`,
      ),
    ).not.toBeNull();
    expect(
      container.querySelector<HTMLAnchorElement>(
        'a[href="https://www.youtube.com/watch?v=air-sealing-attic-2026"]',
      ),
    ).not.toBeNull();
  });

  it("keeps collected video rows while naming a partial provider result", async () => {
    const partial = {
      ...REPORT,
      videos: REPORT.videos.slice(0, 1),
      videos_truncated: true,
      video_report_status: "partial",
      video_report_error: "provider_unavailable",
    } satisfies YouTubeAnalyticsPreview;

    const text = await renderResult(partial);

    expect(text).toContain("Partial video list");
    expect(text).toContain("Provider unavailable");
    expect(text).toContain("1 returned");
    expect(text).toContain("air-sealing-attic-2026");
  });

  it("refuses to render a prior account or channel result", async () => {
    const text = await renderResult(REPORT, SELECTION, {
      connectionId: "google-passive-house-studio",
      channelId: "UCpassivehouse1234567890",
    });

    expect(text).toBe("");
  });

  it("renders missing daily coverage as unmeasured instead of zero", async () => {
    const noDailyRows = {
      ...REPORT,
      days: [],
      summary: null,
      data_through: null,
      videos: [],
      videos_truncated: true,
      video_report_status: "unavailable",
      video_report_error: "invalid_provider_response",
    } satisfies YouTubeAnalyticsPreview;

    const text = await renderResult(noDailyRows);

    expect(text).toContain("0/28 days returned");
    expect(text).toContain("Data through —");
    expect(text).toContain("Invalid provider response");
    expect(text).toContain("Video results are unavailable for this report.");
    expect(text).not.toContain("1,840");
    expect(container.textContent?.match(/—/g)?.length).toBeGreaterThanOrEqual(
      4,
    );
  });
});

describe("the report request window", () => {
  it.each([
    ["2026-10-14T23:45:00Z", "2026-09-17", "2026-10-14"],
    ["2028-03-01T00:15:00Z", "2028-02-03", "2028-03-01"],
  ])(
    "sends exactly 28 inclusive UTC dates for %s",
    (today, startDate, endDate) => {
      expect(youtubeAnalyticsWindow(new Date(today))).toEqual({
        startDate,
        endDate,
      });
    },
  );

  it("accepts the two YouTube read scopes without unrelated Google products", () => {
    expect(
      canReadYouTubeAnalytics({
        scopes: [
          GOOGLE_SCOPE.youtubeReadonly,
          GOOGLE_SCOPE.youtubeAnalyticsReadonly,
        ],
      }),
    ).toBe(true);
  });

  it.each([
    [[GOOGLE_SCOPE.youtubeReadonly]],
    [[GOOGLE_SCOPE.youtubeAnalyticsReadonly]],
    [[GOOGLE_SCOPE.calendarEventsOwnedReadonly, GOOGLE_SCOPE.tasksReadonly]],
  ])("refuses an incomplete YouTube grant: %j", (scopes) => {
    expect(canReadYouTubeAnalytics({ scopes })).toBe(false);
  });
});
