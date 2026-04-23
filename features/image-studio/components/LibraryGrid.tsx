import React from "react";
import Link from "next/link";
import { Calendar, FileImage, FolderOpen, Hash } from "lucide-react";
import type { LibrarySession } from "../server/library";
import { formatBytes } from "../utils/format-bytes";

interface LibraryGridProps {
    sessions: LibrarySession[];
}

export function LibraryGrid({ sessions }: LibraryGridProps) {
    if (sessions.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
                <div className="mx-auto h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <FolderOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-base">Your library is empty</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Generate variants in the Convert tool and click{" "}
                    <span className="font-medium text-foreground">
                        Save all to library
                    </span>{" "}
                    — they&rsquo;ll show up here with public URLs.
                </p>
                <Link
                    href="/image-studio/convert"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    Start converting
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {sessions.map((session) => (
                <LibrarySessionBlock key={session.id} session={session} />
            ))}
        </div>
    );
}

function LibrarySessionBlock({ session }: { session: LibrarySession }) {
    const totalBytes = session.variants.reduce((sum, v) => sum + v.size, 0);
    const updated = session.updatedAt
        ? new Date(session.updatedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "—";

    return (
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <header className="flex items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Hash className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-mono truncate" title={session.id}>
                            {session.id}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {updated}
                            </span>
                            <span>·</span>
                            <span>{session.variants.length} variants</span>
                            <span>·</span>
                            <span>{formatBytes(totalBytes)}</span>
                        </p>
                    </div>
                </div>
            </header>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-3">
                {session.variants.map((v) => (
                    <a
                        key={v.path}
                        href={v.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded-lg border border-border bg-background hover:border-primary/40 overflow-hidden"
                        title={`${v.presetName ?? "Variant"} · ${v.name}`}
                    >
                        <div
                            className="relative bg-muted/40 flex items-center justify-center"
                            style={{
                                aspectRatio:
                                    v.width && v.height
                                        ? `${v.width} / ${v.height}`
                                        : "1 / 1",
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={v.publicUrl}
                                alt={v.presetName ?? v.name}
                                className="max-w-full max-h-full object-contain"
                                loading="lazy"
                            />
                        </div>
                        <div className="p-2 text-xs space-y-0.5">
                            <div className="flex items-center gap-1 text-[11px]">
                                <FileImage className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate font-mono">{v.name}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>{v.presetName ?? "Unknown preset"}</span>
                                <span className="font-mono">{formatBytes(v.size)}</span>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </section>
    );
}

export function LibrarySummaryBar({
    totalVariants,
    totalBytes,
    sessionCount,
}: {
    totalVariants: number;
    totalBytes: number;
    sessionCount: number;
}) {
    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/50 px-4 py-2.5 text-sm">
            <Stat label="Sessions" value={sessionCount} />
            <Stat label="Variants" value={totalVariants} />
            <Stat label="Size" value={formatBytes(totalBytes)} />
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground text-xs uppercase tracking-wider">
                {label}
            </span>
            <span className="font-mono tabular-nums font-medium">{value}</span>
        </div>
    );
}
