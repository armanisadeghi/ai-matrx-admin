"use client";

/**
 * The host's half of records-ui's Map layout: the picture (the app's one Leaflet map, loaded only when a Map
 * view draws) and the address lookup (the server's POST /geo/validate-address — OpenStreetMap Nominatim,
 * free, cached server-side, so no points are spent). A looked-up place is saved on the record by the layout.
 */
import dynamic from "next/dynamic";

import { Skeleton } from "@ai-matrx/design-system";
import type { MapCanvasProps, RecordsUiHost } from "@ai-matrx/records-ui";

import { postJson } from "@/lib/python-client";

const RecordsMapCanvas = dynamic<MapCanvasProps>(() => import("@/components/mardown-display/blocks/map/RecordsMapCanvas"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const { data } = await postJson<{ status: string; lat: number | null; lng: number | null; reachable?: boolean }>("/geo/validate-address", { address });
  if (data.reachable === false) throw new Error("The address lookup is unreachable right now");
  return typeof data.lat === "number" && typeof data.lng === "number" ? { lat: data.lat, lng: data.lng } : null;
}

export const RECORDS_MAP_PORTS: Pick<RecordsUiHost, "mapCanvas" | "geocodeAddress"> = { mapCanvas: RecordsMapCanvas, geocodeAddress };
