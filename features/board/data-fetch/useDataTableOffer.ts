"use client";

import { useQueryClient } from "@tanstack/react-query";

import { toast } from "@/lib/toast";

import { dataTableOffer } from "../../data-sources/offer";
import type { PlacedItem } from "../items/types";
import { dataSourcesKey } from "../../data-sources/hooks";
import { getDataSources } from "../../data-sources/server";
import { getDataSource } from "./tile-meta";
import { useFetchOrganizationId } from "./GetDataBody";

/**
 * After a paste or drop: when the one address belongs to a data source, offer "Get as data table"
 * (a toast action). Accepting places a Get data tile with the source and address filled in; nothing
 * is fetched until the person presses Fetch there.
 */
export function useDataTableOffer(place: (items: PlacedItem[]) => void): (text: string) => void {
  const queryClient = useQueryClient();
  const organizationId = useFetchOrganizationId();
  return (text: string) => {
    if (!organizationId || !text.trim()) return;
    // org-filter: server-call the source catalog request runs in the selected organization
    void queryClient
      .fetchQuery({
        queryKey: dataSourcesKey(organizationId), // org-filter: server-call cache partition for the selected organization request
        queryFn: ({ signal }) => getDataSources({ organizationId, signal }),
        staleTime: 5 * 60 * 1000,
      })
      .then((catalog) => {
        const offer = dataTableOffer(text, catalog.sources);
        if (!offer) return;
        const field = offer.source.input.fields[0]?.name ?? "url";
        toast(offer.source.label, {
          action: {
            label: "Get as data table",
            onClick: () =>
              place([
                {
                  title: offer.source.label,
                  source: getDataSource({ sourceKey: offer.source.key, values: { [field]: offer.url } }),
                },
              ]),
          },
        });
      })
      .catch((err: unknown) => {
        // The offer is a convenience; the paste itself already landed. Say why it is absent.
        console.warn("[board] data source offer unavailable:", err instanceof Error ? err.message : err);
      });
  };
}
