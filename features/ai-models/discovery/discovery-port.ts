// features/ai-models/discovery/discovery-port.ts
//
// THE web port for the shared <ModelDiscovery> (@ai-matrx/agents/models/react): one resolver for the
// whole web app — the admin discovery engine (POST /admin/ai-catalog/discovery/resolve, which writes
// the ai.model_candidate row) — and Choose promotes the chosen version through the same engine. The
// Catalogs page "Add from link" dialog and the admin Discovery page both use it; nothing on the web
// resolves a model link any other way.
//
// Search goes to the person door (POST /ai-catalog/discover/search). A server without it answers 404,
// which is said in words ("not on this server yet"), never faked.

import type { DiscoveryResult, LocalModel, LocalVariant } from "@ai-matrx/agents/models";
import type { DiscoveryPort, DiscoverySearchPage, DiscoverySearchQuery } from "@ai-matrx/agents/models/react";

import { postJsonAsUser } from "@/lib/api/post-json-as-user";
import { extractErrorMessage } from "@/utils/errors";
import { type CallAuth, type Candidate, discoveryApi } from "./api";

export const SEARCH_PATH = "/ai-catalog/discover/search";

function statusOf(err: unknown): number | null {
  const s = (err as { status?: unknown } | null)?.status;
  return typeof s === "number" ? s : null;
}

/** The candidate's suggestion as the shared result shape (the maker picture comes from its media). */
export function resultOfCandidate(candidate: Candidate): DiscoveryResult {
  const s = candidate.suggested;
  const logo = (s.media ?? []).find((m) => m.kind === "maker_logo");
  return { ...(s as unknown as DiscoveryResult), maker_avatar_url: logo?.cdn_url ?? logo?.source_url ?? null };
}

export interface AdminDiscoveryPortOptions {
  /** Told after every resolve with the candidate row the server wrote. */
  onCandidate?: (candidate: Candidate) => void;
  /** Told after a promote (refresh lists, open the promoted model). */
  onPromoted?: (candidate: Candidate, variant: LocalVariant) => void;
}

/** Throws plain sentences; the shared view shows them as they are. */
export function createAdminDiscoveryPort(auth: CallAuth, options: AdminDiscoveryPortOptions = {}): DiscoveryPort {
  // The candidate each resolved repo@revision belongs to (Choose promotes that candidate).
  const candidates = new Map<string, Candidate>();
  const keyOf = (repo: string, revision: string) => `${repo}@${revision}`;

  return {
    device: null,
    runtimes: [],
    async resolve(link: string) {
      const candidate = await discoveryApi.resolve(auth, link);
      candidates.set(keyOf(candidate.suggested.repo, candidate.suggested.revision), candidate);
      options.onCandidate?.(candidate);
      return resultOfCandidate(candidate);
    },
    async search(query: DiscoverySearchQuery): Promise<DiscoverySearchPage> {
      if (!auth.baseUrl) throw new Error("No AI Matrx server address is configured.");
      if (!auth.accessToken) throw new Error("Sign in again; no session was found.");
      try {
        return await postJsonAsUser<DiscoverySearchPage>({
          baseUrl: auth.baseUrl,
          accessToken: auth.accessToken,
          organizationId: auth.organizationId,
          path: SEARCH_PATH,
          body: { query: query.query, kind: query.kind, sort: query.sort, limit: 20, cursor: query.cursor },
        });
      } catch (err) {
        if (statusOf(err) === 404 || statusOf(err) === 405) {
          throw new Error("Search is not on this server yet. Paste a link instead.");
        }
        throw new Error(extractErrorMessage(err));
      }
    },
    async onChooseVariant(_model: LocalModel, variant: LocalVariant, result: DiscoveryResult) {
      const candidate = candidates.get(keyOf(result.repo, result.revision));
      if (!candidate) throw new Error("Find this model again, then choose a version.");
      const promoted = await discoveryApi.promote(auth, candidate.id, {
        variant_keys: [variant.key],
        default_variant_key: variant.key,
      });
      options.onPromoted?.(candidate, variant);
      return `Added ${promoted.model_name} (${variant.quant || variant.key}) to the model catalog`;
    },
  };
}
