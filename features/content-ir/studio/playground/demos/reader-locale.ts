import type { PlaygroundDemo } from "../types";

/** useKindLocale: dates, numbers, money and relative time in the reader's language and time zone. */
const source = String.raw`import React from "react";
import { Globe } from "lucide-react";
import { KindHeaderBar } from "@/components/kind-kit/KindHeaderBar";
import { KindPanel } from "@/components/kind-kit/KindPanel";
import { KindPanelGrid } from "@/components/kind-kit/KindPanelGrid";
import { useKindLocale } from "@/components/kind-kit/KindLocale";
import { streamText } from "@/components/kind-kit/StreamingSkeleton";

export default function ReaderLocale({ data }) {
  const { locale, timeZone, dir } = useKindLocale();
  const when = data?.event_at ? new Date(data.event_at) : null;
  const valid = when && !Number.isNaN(when.getTime());
  const date = valid ? new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short", timeZone }).format(when) : "";
  const money = typeof data?.amount === "number" ? new Intl.NumberFormat(locale, { style: "currency", currency: data?.currency || "USD" }).format(data.amount) : "";
  const days = valid ? Math.round((when.getTime() - Date.now()) / 86400000) : 0;
  const rel = valid ? new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day") : "";
  return (
    <div className="flex flex-col gap-2">
      <KindHeaderBar title={streamText(data?.event, "Event")} icon={Globe} subtitle="Formatted for the person reading" />
      <KindPanelGrid minColumnWidth={220} gap="sm">
        <KindPanel title="When"><p data-testid="locale-date" className="text-sm text-foreground">{date}</p></KindPanel>
        <KindPanel title="Relative"><p data-testid="locale-relative" className="text-sm text-foreground">{rel}</p></KindPanel>
        <KindPanel title="Price"><p data-testid="locale-money" className="text-sm text-foreground">{money}</p></KindPanel>
        <KindPanel title="Reader">
          <p data-testid="locale-reader" className="text-sm text-foreground">{locale + " · " + timeZone + " · " + dir}</p>
        </KindPanel>
      </KindPanelGrid>
    </div>
  );
}
`;

export const READER_LOCALE_DEMO: PlaygroundDemo = {
  slug: "playground_reader_locale",
  title: "Reader language and time zone",
  covers: ["useKindLocale", "Intl.DateTimeFormat", "Intl.NumberFormat", "dir"],
  source,
  sample: {
    event: "Launch webinar",
    event_at: "2027-03-14T18:30:00Z",
    amount: 1234.5,
    currency: "EUR",
  },
};
