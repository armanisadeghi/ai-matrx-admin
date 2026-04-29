// features/administration/schema-visualizer/hooks/useSchemaQuery.ts
// React Query hook that fetches the standalone schema overview from
// /api/schema-overview. The endpoint reads Postgres directly — no entity
// system dependency — so this hook can be used in slim/standalone routes.

"use client";

import { useQuery } from "@tanstack/react-query";
import type { SchemaOverview } from "../types-standalone";

export function useSchemaQuery() {
    return useQuery({
        queryKey: ["schema-overview"],
        queryFn: async (): Promise<SchemaOverview> => {
            const response = await fetch("/api/schema-overview");
            if (!response.ok) {
                throw new Error(`Failed to load schema overview: ${response.statusText}`);
            }
            return (await response.json()) as SchemaOverview;
        },
        staleTime: 1000 * 60 * 60, // 1 hour
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
    });
}
