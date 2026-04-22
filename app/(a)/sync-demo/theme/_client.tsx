/**
 * app/(a)/sync-demo/theme/_client.tsx
 *
 * Client-side verification harness for the Phase 1 sync engine.
 *
 * Shows:
 *   - Current Redux `theme.mode` (primary source of truth)
 *   - Raw localStorage envelope at `matrx:theme` (what survives reload)
 *   - Log of inbound broadcast messages (cross-tab latency, identity leaks)
 *   - Controls: setMode(light|dark), toggleMode, force-reload
 *
 * Use alongside the manual checklist in `phase-1-verification.md`.
 */

"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setMode, toggleMode } from "@/styles/themes/themeSlice";

interface BroadcastEvent {
    at: number;
    raw: string;
}

export function ThemeDemoClient() {
    const dispatch = useAppDispatch();
    const mode = useAppSelector((s) => s.theme.mode);
    const [storageRaw, setStorageRaw] = useState<string | null>(null);
    const [events, setEvents] = useState<BroadcastEvent[]>([]);
    // Mount gate + live observer for `<html>` class so the debug field stays
    // hydration-safe (SSR renders "—") and reflects pre-paint + runtime
    // applier changes without polling.
    const [mounted, setMounted] = useState(false);
    const [htmlHasDark, setHtmlHasDark] = useState(false);

    // Poll localStorage so the on-screen envelope reflects writes in real time.
    useEffect(() => {
        const read = () => setStorageRaw(window.localStorage.getItem("matrx:theme"));
        read();
        const id = window.setInterval(read, 250);
        return () => window.clearInterval(id);
    }, []);

    // Observe `<html>` class so the "contains `dark`?" debug row stays live
    // whenever the runtime applier (or anything else) toggles it.
    useEffect(() => {
        setMounted(true);
        const read = () => setHtmlHasDark(document.documentElement.classList.contains("dark"));
        read();
        const obs = new MutationObserver(read);
        obs.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => obs.disconnect();
    }, []);

    // Tap into the BroadcastChannel directly — does NOT interfere with the
    // engine's own listener. Any ACTION message received proves cross-tab
    // sync is working end-to-end.
    useEffect(() => {
        if (typeof BroadcastChannel === "undefined") return;
        const bc = new BroadcastChannel("matrx-sync");
        bc.onmessage = (e) => {
            setEvents((prev) =>
                [{ at: Date.now(), raw: JSON.stringify(e.data) }, ...prev].slice(0, 20),
            );
        };
        return () => bc.close();
    }, []);

    return (
        <div className="flex h-[calc(100vh-2.5rem)] flex-col gap-4 overflow-y-auto bg-textured p-6">
            <header>
                <h1 className="text-2xl font-semibold text-foreground">
                    Sync Engine — Theme Demo
                </h1>
                <p className="text-sm text-muted-foreground">
                    Phase 1 verification harness. Open in multiple tabs to
                    watch broadcast propagation.
                </p>
            </header>

            <section className="rounded-md border border-border bg-card p-4">
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                    Current state
                </h2>
                <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Redux mode:</dt>
                    <dd className="font-mono">{mode}</dd>
                    <dt className="text-muted-foreground">&lt;html&gt; class contains `dark`:</dt>
                    <dd className="font-mono">{mounted ? String(htmlHasDark) : "—"}</dd>
                    <dt className="text-muted-foreground">localStorage matrx:theme:</dt>
                    <dd className="whitespace-pre-wrap break-all font-mono text-xs">
                        {storageRaw ?? "(null)"}
                    </dd>
                </dl>
            </section>

            <section className="rounded-md border border-border bg-card p-4">
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                    Controls
                </h2>
                <div className="flex flex-wrap gap-2">
                    <button
                        className="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent"
                        onClick={() => dispatch(setMode("light"))}
                    >
                        setMode(light)
                    </button>
                    <button
                        className="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent"
                        onClick={() => dispatch(setMode("dark"))}
                    >
                        setMode(dark)
                    </button>
                    <button
                        className="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent"
                        onClick={() => dispatch(toggleMode())}
                    >
                        toggleMode()
                    </button>
                    <button
                        className="rounded-md border border-border px-3 py-1 text-sm hover:bg-accent"
                        onClick={() => window.location.reload()}
                    >
                        force reload
                    </button>
                </div>
            </section>

            <section className="rounded-md border border-border bg-card p-4">
                <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                    Broadcast log (most recent first, latest 20)
                </h2>
                {events.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                        No messages yet. Open another tab of this page and
                        dispatch a toggle.
                    </p>
                ) : (
                    <ul className="space-y-1 text-xs font-mono">
                        {events.map((e) => (
                            <li key={e.at} className="whitespace-pre-wrap break-all">
                                <span className="text-muted-foreground">
                                    {new Date(e.at).toISOString().slice(11, 23)}
                                </span>{" "}
                                {e.raw}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
