import type { PlaygroundDemo } from "../types";

/** recharts, date-fns, lodash, container-query layout. */
const source = String.raw`import { TrendingUp, BarChart3 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import { groupBy, sumBy } from "lodash";
import { KindHeaderBar } from "@/components/kind-kit/KindHeaderBar";
import { KindPanel } from "@/components/kind-kit/KindPanel";
import { StreamingSkeleton, useStreamingValue, streamList } from "@/components/kind-kit/StreamingSkeleton";

export default function SignupMetrics({ data }) {
  const { value: title, arrived } = useStreamingValue(data?.title, "");
  const days = streamList(data?.days).filter((day) => day && typeof day.date === "string" && typeof day.signups === "number");
  if (!arrived && days.length === 0) return <StreamingSkeleton layout="table" rows={4} />;

  const points = days.map((day) => ({ ...day, label: format(parseISO(day.date), "MMM d") }));
  const byChannel = Object.entries(groupBy(days, "channel")).map(([channel, rows]) => ({ channel, signups: sumBy(rows, "signups") }));
  const total = sumBy(days, "signups");

  return (
    <div className="@container flex flex-col gap-2">
      <KindHeaderBar
        title={title || "Signups"}
        icon={TrendingUp}
        stats={[{ label: "signups", value: total }, { label: "days", value: days.length }]}
        copy={{
          label: "Signup metrics",
          human: () => points.map((p) => p.label + ": " + p.signups + " (" + p.channel + ")").join("\n"),
          json: () => data,
          export: { items: [{ id: "csv", label: "CSV", filename: "signups.csv", content: () => "date,channel,signups\n" + days.map((d) => d.date + "," + d.channel + "," + d.signups).join("\n") }] },
        }}
      />
      <div className="grid grid-cols-1 gap-2 @2xl:grid-cols-2">
        <KindPanel title="Daily signups" icon={TrendingUp}>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
                <Line type="monotone" dataKey="signups" stroke="var(--primary)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </KindPanel>
        <KindPanel title="By channel" icon={BarChart3} count={byChannel.length}>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byChannel} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="channel" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
                <Bar dataKey="signups" fill="var(--primary)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </KindPanel>
      </div>
    </div>
  );
}
`;

const CHANNELS = ["Search", "Referral", "Podcast", "Search", "Referral", "Search", "Podcast"];
const SIGNUPS = [42, 55, 38, 61, 74, 69, 88, 92, 81, 97, 103, 99, 118, 126];

export const SIGNUP_METRICS_DEMO: PlaygroundDemo = {
  slug: "playground_signup_metrics",
  title: "Signup metrics",
  covers: ["recharts", "date-fns", "lodash", "Container queries", "CSV export"],
  source,
  sample: {
    title: "Trial signups, first two weeks of March",
    days: SIGNUPS.map((signups, index) => ({
      date: `2026-03-${String(index + 1).padStart(2, "0")}`,
      channel: CHANNELS[index % CHANNELS.length],
      signups,
    })),
  },
};
