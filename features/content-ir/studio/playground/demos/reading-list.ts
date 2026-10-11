import type { PlaygroundDemo } from "../types";

/** Applets helpers: sortRows, rowLabel, cellText over rows from data. */
const source = String.raw`import React from "react";
import { BookOpen, ArrowDownUp } from "lucide-react";
import { sortRows, rowLabel, cellText } from "@ai-matrx/applets/react";
import { KindHeaderBar } from "@/components/kind-kit/KindHeaderBar";
import { KindPanel } from "@/components/kind-kit/KindPanel";
import { StreamingSkeleton, useStreamingValue, streamList } from "@/components/kind-kit/StreamingSkeleton";
import { Button } from "@/components/ui/button";

export default function ReadingList({ data }) {
  const { value: club, arrived } = useStreamingValue(data?.club, "");
  const books = streamList(data?.books).filter(Boolean);
  const [field, setField] = React.useState("title");
  if (!arrived && books.length === 0) return <StreamingSkeleton layout="list" rows={4} />;
  const sorted = sortRows(books, field, "asc");
  return (
    <div className="@container flex flex-col gap-2">
      <KindHeaderBar
        title={club || "Reading list"}
        icon={BookOpen}
        stats={[{ label: "books", value: books.length }]}
        copy={{ label: "Reading list", human: () => sorted.map((b) => rowLabel(b, "title") + " — " + cellText(b.author)).join("\n"), json: () => data }}
        actions={
          <Button variant="quiet" icon={<ArrowDownUp className="h-4 w-4" />} onClick={() => setField(field === "title" ? "month" : "title")}>
            {field === "title" ? "By title" : "By month"}
          </Button>
        }
      />
      <KindPanel title="Books" icon={BookOpen} count={sorted.length}>
        <ul className="flex flex-col divide-y divide-border text-sm">
          {sorted.map((book, index) => (
            <li key={index} className="flex flex-col gap-0.5 py-1.5 @md:flex-row @md:items-baseline @md:justify-between">
              <span className="font-medium text-foreground">{rowLabel(book, "title")}</span>
              <span className="text-xs text-muted-foreground">{cellText(book.author)} · {cellText(book.month)}</span>
            </li>
          ))}
        </ul>
      </KindPanel>
    </div>
  );
}
`;

export const READING_LIST_DEMO: PlaygroundDemo = {
  slug: "playground_reading_list",
  title: "Reading list",
  covers: ["Applets helpers", "Container queries"],
  source,
  sample: {
    club: "Maple Street book club, 2026",
    books: [
      { title: "The Overstory", author: "Richard Powers", month: "2026-01" },
      { title: "Piranesi", author: "Susanna Clarke", month: "2026-02" },
      { title: "Braiding Sweetgrass", author: "Robin Wall Kimmerer", month: "2026-03" },
      { title: "Klara and the Sun", author: "Kazuo Ishiguro", month: "2026-04" },
      { title: null, author: "Anonymous", month: "2026-05" },
    ],
  },
};
