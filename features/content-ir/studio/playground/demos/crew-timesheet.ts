import type { PlaygroundDemo } from "../types";

/** xlsx: a workbook built from data, previewed as a table and exported. */
const source = String.raw`import { Sheet } from "lucide-react";
import * as XLSX from "xlsx";
import { KindHeaderBar } from "@/components/kind-kit/KindHeaderBar";
import { KindPanel } from "@/components/kind-kit/KindPanel";
import { StreamingSkeleton, useStreamingValue, streamList } from "@/components/kind-kit/StreamingSkeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CrewTimesheet({ data }) {
  const { value: week, arrived } = useStreamingValue(data?.week, "");
  const rows = streamList(data?.rows).filter((row) => row && row.name);
  if (!arrived && rows.length === 0) return <StreamingSkeleton layout="table" rows={4} />;
  const sheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const hours = rows.reduce((sum, row) => sum + (Number(row.hours) || 0), 0);
  return (
    <div className="@container flex flex-col gap-2">
      <KindHeaderBar
        title={week || "Timesheet"}
        icon={Sheet}
        stats={[{ label: "people", value: rows.length }, { label: "hours", value: hours }]}
        copy={{
          label: "Crew timesheet",
          human: () => csv,
          json: () => data,
          export: { items: [{ id: "csv", label: "CSV (from workbook)", filename: "timesheet.csv", content: () => csv }] },
        }}
      />
      <KindPanel title="Workbook preview" icon={Sheet} count={rows.length} variant="bare">
        <div className="max-h-72 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.name + index}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.role ?? ""}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.hours ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </KindPanel>
    </div>
  );
}
`;

export const CREW_TIMESHEET_DEMO: PlaygroundDemo = {
  slug: "playground_crew_timesheet",
  title: "Crew timesheet",
  covers: ["xlsx", "Table", "Export"],
  source,
  sample: {
    week: "Week of June 8 — Elm Street remodel",
    rows: [
      { name: "Marisol Quintero", role: "Lead carpenter", hours: 42 },
      { name: "Marco Ruiz", role: "Electrician", hours: 31.5 },
      { name: "Priya Natarajan", role: "Tile setter", hours: 28 },
      { name: "Sam Okafor", role: "Apprentice", hours: 40 },
    ],
  },
};
