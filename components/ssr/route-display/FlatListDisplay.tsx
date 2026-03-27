"use client";

import { useState } from "react";
import Link from "next/link";
import { formatTitleCase } from "@/utils/text/text-case-converter";
import { ChevronRight, Search } from "lucide-react";
import type { RouteDisplayProps } from "./types";

export default function FlatListDisplay({ data }: RouteDisplayProps) {
  const { routes, basePath } = data;
  const [search, setSearch] = useState("");

  const filtered = search
    ? routes.filter((r) => r.toLowerCase().includes(search.toLowerCase()))
    : routes;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter routes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/60 transition-all"
        />
        {search && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums">
            {filtered.length}/{routes.length}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No routes match &ldquo;{search}&rdquo;
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card divide-y divide-border/60">
          {filtered.map((route) => {
            const parts = route.split("/");
            const leaf = parts[parts.length - 1];
            const prefix = parts.length > 1 ? parts.slice(0, -1).join("/") + "/" : "";

            return (
              <Link key={route} href={`${basePath}/${route}`}>
                <div className="flex items-center justify-between px-4 py-2.5 hover:bg-accent/40 transition-colors group">
                  <div className="flex items-baseline gap-1 min-w-0">
                    {prefix && (
                      <span className="text-xs text-muted-foreground/50 font-mono shrink-0">
                        {prefix}
                      </span>
                    )}
                    <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                      {formatTitleCase(leaf)}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-3" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="text-xs text-muted-foreground text-center">
        {routes.length} route{routes.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
