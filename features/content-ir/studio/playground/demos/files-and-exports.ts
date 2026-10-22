import type { PlaygroundDemo } from "../types";

/**
 * Lane M1 media kit: KindImage from a web address (wide and tall — never cropped), KindFile for a
 * saved file, a file the shape builds itself (download + CopyButtons export) and print.
 */
const source = String.raw`import React from "react";
import { FileDown, Printer } from "lucide-react";
import { KindHeaderBar } from "@/components/kind-kit/KindHeaderBar";
import { KindPanel } from "@/components/kind-kit/KindPanel";
import { KindPanelGrid } from "@/components/kind-kit/KindPanelGrid";
import { KindImage } from "@/components/kind-kit/KindImage";
import { KindFile } from "@/components/kind-kit/KindFile";
import { KindActionButton } from "@/components/kind-kit/KindActionButton";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { StreamingSkeleton, useStreamingValue, streamList, streamText } from "@/components/kind-kit/StreamingSkeleton";

function toCsv(rows) {
  const cell = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return ["Item,Owner,Due", ...rows.map((r) => [r.item, r.owner, r.due].map(cell).join(","))].join("\n") + "\n";
}

function toMarkdown(title, rows) {
  return ["# " + title, "", "| Item | Owner | Due |", "|---|---|---|", ...rows.map((r) => "| " + r.item + " | " + r.owner + " | " + r.due + " |")].join("\n");
}

function SavedFile({ runAction, initial }) {
  const [id, setId] = React.useState(initial?.file_id ?? "");
  const fileId = id.trim();
  return (
    <div className="flex flex-col gap-2">
      <input
        value={id}
        onChange={(e) => setId(e.target.value)}
        placeholder="Saved file id"
        aria-label="Saved file id"
        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
      />
      {fileId ? (
        <KindFile file={{ ...(initial ?? {}), file_id: fileId }} runAction={runAction} />
      ) : null}
    </div>
  );
}

export default function FilesAndExports({ data, runAction }) {
  const { value: title, arrived } = useStreamingValue(data?.title, "");
  const images = streamList(data?.images).filter((i) => i && i.url);
  const rows = streamList(data?.rows).filter((r) => r && r.item);
  if (!arrived && images.length === 0) return <StreamingSkeleton layout="cards" rows={2} />;
  const name = title || "Launch checklist";
  const exportItems = [
    { id: "csv", label: "CSV", filename: "checklist.csv", content: () => toCsv(rows) },
    { id: "md", label: "Markdown", filename: "checklist.md", content: () => toMarkdown(name, rows) },
  ];
  return (
    <div className="@container flex flex-col gap-2">
      <KindHeaderBar
        title={name}
        icon={FileDown}
        subtitle="Web images, saved files, downloads and print"
        copy={{ label: name, human: () => toMarkdown(name, rows), export: { items: exportItems } }}
      />
      <KindPanelGrid minColumnWidth={280} gap="sm">
        {images.map((img, i) => (
          <KindPanel key={i} title={streamText(img.title, "Image")}>
            <KindImage image={img.url} alt={streamText(img.title, "Image")} runAction={runAction} maxHeight={260} />
          </KindPanel>
        ))}
        <KindPanel title="Saved file">
          <SavedFile runAction={runAction} initial={data?.file} />
        </KindPanel>
        <KindPanel title="Checklist" footer={
          <div className="flex flex-wrap items-center gap-2">
            <KindActionButton
              runAction={runAction}
              action="download"
              input={() => ({ filename: "checklist.csv", content: toCsv(rows), mime: "text/csv" })}
              label="Download CSV"
              icon={FileDown}
              compact
            />
            <KindActionButton
              runAction={runAction}
              action="print"
              input={() => ({ title: name, markdown: toMarkdown(name, rows) })}
              label="Print"
              icon={Printer}
              compact
            />
            <CopyButtons label="Checklist" human={() => toMarkdown(name, rows)} export={{ items: exportItems }} size="xs" />
          </div>
        }>
          <ul className="flex flex-col gap-1 text-sm text-foreground">
            {rows.map((r, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate">{r.item}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.owner} · {r.due}</span>
              </li>
            ))}
          </ul>
        </KindPanel>
      </KindPanelGrid>
    </div>
  );
}
`;

export const FILES_AND_EXPORTS_DEMO: PlaygroundDemo = {
  slug: "playground_files_and_exports",
  title: "Web images, files, downloads, print",
  covers: ["KindImage web", "fetch_image", "KindFile", "download", "print", "Export"],
  source,
  sample: {
    title: "Launch checklist",
    images: [
      {
        title: "Wide banner",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/1280px-Fronalpstock_big.jpg",
      },
      {
        title: "Transparency test",
        url: "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
      },
    ],
    file: { name: "Saved file", mime_type: null, size: null },
    rows: [
      { item: "Final copy review", owner: "Dana", due: "Oct 24" },
      { item: "App Store screenshots", owner: "Luis", due: "Oct 26" },
      { item: "Press kit, \"embargoed\" until launch", owner: "Priya", due: "Oct 28" },
    ],
  },
};
