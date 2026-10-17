"use client";

/**
 * RecordsMapCanvas — the Map layout's picture for a table view (@ai-matrx/records-ui `mapCanvas` port).
 *
 * The SAME Leaflet, tiles, pin and fit-to-bounds as the chat MapBlock (`MapCanvas.tsx` exports them) —
 * no second map library. What it adds is what a table needs: a pin opens its record, and pins that
 * crowd merge into a numbered badge (records-ui's `clusterPins`, re-run on every zoom) that zooms into
 * its members when pressed. Loaded only through `next/dynamic ssr:false` (see recordsMapPorts.tsx).
 */

import { useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { MapCanvasProps } from "@ai-matrx/records-ui";
import { useRecordsUiModule } from "@/features/data-tables/records-ui-host/recordsUiLazy";

import { FitBounds, InvalidateOnResize, OsmTiles, PIN, bubbleIcon } from "./MapCanvas";

function Pins({ pins, onOpen, selectedId }: Pick<MapCanvasProps, "pins" | "onOpen" | "selectedId">) {
  // Drawn by records-ui's MapLayout (the `mapCanvas` port) inside the lazy table page, so
  // `clusterPins` comes from the front door's loaded module.
  const { clusterPins } = useRecordsUiModule("RecordsMapCanvas");
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const clusters = useMemo(() => clusterPins(pins, zoom), [pins, zoom, clusterPins]);
  return (
    <>
      {clusters.map((c) =>
        c.pins.length === 1 ? (
          <Marker key={c.key} position={[c.lat, c.lng]} icon={c.pins[0]!.id === selectedId ? bubbleIcon({ text: "●", className: "bg-primary text-primary-foreground border-primary" }) : PIN} eventHandlers={{ click: () => onOpen(c.pins[0]!.id as never) }}>
            <Tooltip direction="top" offset={[0, -28]}>
              {c.pins[0]!.title}
            </Tooltip>
          </Marker>
        ) : (
          <Marker
            key={c.key}
            position={[c.lat, c.lng]}
            icon={bubbleIcon({ text: String(c.pins.length), className: "bg-primary text-primary-foreground border-background" })}
            eventHandlers={{ click: () => map.fitBounds(L.latLngBounds(c.pins.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 18 }) }}
          />
        ),
      )}
    </>
  );
}

export default function RecordsMapCanvas({ pins, onOpen, selectedId, className }: MapCanvasProps) {
  const markers = useMemo(() => pins.map((p) => ({ lat: p.lat, lng: p.lng })), [pins]);
  return (
    <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={false} className={className} style={{ height: "100%", width: "100%" }}>
      <OsmTiles />
      <Pins pins={pins} onOpen={onOpen} selectedId={selectedId} />
      <FitBounds markers={markers} hasExplicitCenter={false} />
      <InvalidateOnResize />
    </MapContainer>
  );
}
