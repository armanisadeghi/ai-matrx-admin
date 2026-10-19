"use client";

import { AdvancedReadResult } from "./AdvancedReadResult";
import { readEntry, useReadVersion } from "./store";

/** Every page of a batch the advanced reader answered (read or not), each under its address. Absent until one answers. */
export function AdvancedReadResults({ urls, className }: { urls: readonly string[]; className?: string }) {
  const version = useReadVersion();
  const done = [...new Set(urls)].flatMap((url) => {
    const e = readEntry(url, version);
    return e?.status === "done" ? [{ url, item: e.item }] : [];
  });
  if (done.length === 0) return null;
  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`} data-advanced-read-results="">
      {done.map(({ url, item }) => (
        <div key={url} className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-card p-3">
          <span className="truncate text-sm font-medium text-foreground" title={url}>
            {item.title ?? url}
          </span>
          <AdvancedReadResult item={item} />
        </div>
      ))}
    </div>
  );
}
