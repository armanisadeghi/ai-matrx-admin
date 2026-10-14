"use client";

/**
 * The known-domain proposal source's live half: one platform-admin read per poll
 * (`web.domain_proposals_for_attention`). A failed read is LOUD — silence would read as "nothing to review".
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { decideDomainProposal, fetchDomainProposals, type DomainProposal } from "@/lib/web-domains/service";
import { ATTENTION_POLL_MS } from "../poll";
import { muteItem, unmuteItem } from "../item-mute";
import type { AttentionSourceState } from "../types";
import {
  KNOWN_DOMAIN_SOURCE_ID,
  KNOWN_DOMAIN_SOURCE_LABEL,
  knownDomainItems,
  summarizeKnownDomains,
} from "./known-domain-proposals";

export const KNOWN_DOMAINS_QUERY_KEY = ["admin-attention", "known-domains"] as const;

export function useKnownDomainSource(enabled: boolean): AttentionSourceState {
  const queryClient = useQueryClient();
  const query = useQuery<DomainProposal[]>({
    queryKey: KNOWN_DOMAINS_QUERY_KEY,
    queryFn: fetchDomainProposals,
    enabled,
    refetchInterval: ATTENTION_POLL_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const refetch = () => {
    void queryClient.invalidateQueries({ queryKey: KNOWN_DOMAINS_QUERY_KEY });
  };

  const items = knownDomainItems(query.data ?? [], {
    decide: async (id, approve) => {
      await decideDomainProposal(id, approve);
      refetch();
    },
    muteLocally: (key, ms) => muteItem(key, ms),
    unmuteLocally: (key) => unmuteItem(key),
  });

  return {
    id: KNOWN_DOMAIN_SOURCE_ID,
    label: KNOWN_DOMAIN_SOURCE_LABEL,
    items,
    status: !enabled ? "idle" : query.isError ? "failed" : query.data === undefined ? "loading" : "ok",
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    loud: true,
    summarize: summarizeKnownDomains,
    review: null,
    refetch,
  };
}
