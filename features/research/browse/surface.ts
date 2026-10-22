// features/research/browse/surface.ts
//
// The `matrx-user/research-topics` runtime for the topic list: the ONE pure
// state → scope mapper (reads the list controller the shell already holds;
// never fetches) and the create / update / delete handlers, built with the
// shared collection helper so they save through the page's own paths.

import { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import type {
  EntityListSurface,
  EntityListSurfaceController,
} from "@/lib/entity-list/components/EntityListPage";
import { collectionWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/collection-write-targets";
import { makeScope } from "@/lib/list-scope/types";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import {
  RESEARCH_TOPICS_SURFACE_NAME,
  createResearchTopicsScope,
} from "@/features/surfaces/manifests/research-topics.manifest";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { isOrganizationRequiredError } from "@ai-matrx/auth/organizations";
import { createTopic, updateTopic, updateTopicMeta } from "../service";
import { archiveTopic, restoreTopic } from "./actions";
import type { ResearchTopicListRow } from "./types";
import { buildTopicListXml } from "./topicListBundle";
import {
  parseCreateTopics,
  parseDeleteTopics,
  parseUpdateTopics,
  parseListView,
  rememberTouchedTopic,
  rowsWithTouched,
  type CreatePlan,
  type TouchedTopics,
  type UpdatePlan,
} from "./topicAgentWrites";

type List = EntityListSurfaceController<ResearchTopicListRow>;

// Topics this page's agent writes changed (restored, archived, renamed), kept so
// a topic that just left the visible list can still be acted on by id. The map
// is owned by the MOUNTED page (useResearchTopicsSurface) and passed in — never
// module state, which would outlive a route change or a sign-out/in.

// ── Read half ────────────────────────────────────────────────────────────────

export function createResearchTopicsSurfaceScope(list: List) {
  const scope = list.query.scope;
  // A failed read reports its status and nothing else: no rows, no counts that
  // would contradict the error the person is looking at.
  const failed = list.error != null;
  const loaded = !list.isLoading && !failed;
  return createResearchTopicsScope({
    list_scope: scope.kind,
    search_query: list.query.search,
    active_filters: list.query.filters,
    sort: `${list.view.sort}-${list.view.direction}`,
    // The list's organization filter (absent = All organizations).
    ...(list.query.orgId ? { list_scope_organization_id: list.query.orgId } : {}),
    ...(failed ? { load_error: list.error?.message ?? "The topics could not be read." } : {}),
    list_archived: list.query.archived,
    ...(loaded
      ? {
          topic_list: buildTopicListXml({
            rows: list.rows,
            total: list.total,
            scope: scope.kind,
            search: list.query.search,
            archived: list.query.archived,
          }),
          topics: list.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            status: row.status,
            autonomy_level: row.autonomy_level,
            project_id: row.project_id,
            project_name: row.project_name,
            organization_id: row.organization_id,
            organization_name: row.organization_name,
            archived_at: row.archived_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
          })),
          total_count: list.total,
        }
      : {}),
    ...(!failed && !list.countsLoading && !list.countsError
      ? {
          scope_counts: {
            mine: list.counts.byKind.mine,
            orgs: list.counts.byKind.orgs,
          },
        }
      : {}),
  });
}

// ── Write half ───────────────────────────────────────────────────────────────

export function createResearchTopicsWriteHandlers(list: List, touched: TouchedTopics) {
  const handlers = collectionWriteHandlers(
    {
      plural: "topics",
      singular: "topic",
      create: {
        parse: parseCreateTopics,
        run: async (plan: CreatePlan) => {
          const organizationId = await ensureOrgId(null);
          const { topic } = await createTopic(organizationId, {
            name: plan.name,
            description: plan.description,
            autonomy_level: plan.autonomy_level,
            template_id: null,
          });
          list.refresh();
          return { id: topic.id, name: topic.name };
        },
        nameOf: (plan: CreatePlan) => plan.name,
        refusalFor: (error: unknown) =>
          isOrganizationRequiredError(error)
              ? "No organization is selected, so no topics were created. Ask the person to choose the organization the topics belong in, then create them again."
              : undefined,
      },
      update: {
        parse: (value: unknown) =>
          parseUpdateTopics(value, rowsWithTouched(list.rows, touched)),
        run: async (plan: UpdatePlan) => {
          if (plan.name !== undefined || plan.description !== undefined)
            await updateTopicMeta(plan.id, {
              ...(plan.name !== undefined ? { name: plan.name } : {}),
              ...(plan.description !== undefined ? { description: plan.description } : {}),
            });
          if (plan.autonomy_level !== undefined)
            await updateTopic(plan.id, { autonomy_level: plan.autonomy_level });
          if (plan.archived === true) await archiveTopic(plan.id);
          if (plan.archived === false) await restoreTopic(plan.id);
          const before = rowsWithTouched(list.rows, touched).find(
            (r) => r.id === plan.id,
          );
          if (before) rememberTouchedTopic(touched, before, plan);
          list.refresh();
          return { id: plan.id, name: plan.name ?? plan.previousName };
        },
        nameOf: (plan: UpdatePlan) => plan.previousName,
        changedOf: (plan: UpdatePlan) => plan.changed,
      },
      delete: {
        parse: (value: unknown) =>
          parseDeleteTopics(value, rowsWithTouched(list.rows, touched)),
        run: async (row: ResearchTopicListRow) => {
          // A person's records are archived, never destroyed: delete_topics
          // ARCHIVES (restorable with update_topics archived:false).
          await archiveTopic(row.id);
          rememberTouchedTopic(touched, row, { archived: true });
          list.removeRow(row.id);
          return { id: row.id, name: row.name };
        },
        nameOf: (row: ResearchTopicListRow) => row.name,
      },
    },
    refuseSurfaceWrite,
  );
  return {
    ...handlers,
    // UI state only: which topics the list shows (no record changes).
    list_view: {
      validate: (value: unknown) => {
        parseListView(value);
      },
      apply: (value: unknown) => {
        const plan = parseListView(value);
        list.patchQuery({
          ...(plan.scope ? { scope: makeScope(plan.scope) } : {}),
          ...(plan.archived ? { archived: plan.archived } : {}),
          ...(plan.search !== undefined ? { search: plan.search } : {}),
        });
        return {
          summary: `The list now shows ${[
            plan.scope ? `scope ${plan.scope}` : "",
            plan.archived ? `${plan.archived} topics` : "",
            plan.search !== undefined ? `search "${plan.search}"` : "",
          ]
            .filter(Boolean)
            .join(", ")}. Read topic_list again once it has loaded.`,
        };
      },
    },
  };
}

/** The surface over one page's own touched-topics map. */
export function createResearchTopicsSurface(
  touched: TouchedTopics,
): EntityListSurface<ResearchTopicListRow> {
  return {
    surfaceName: RESEARCH_TOPICS_SURFACE_NAME,
    getScope: createResearchTopicsSurfaceScope,
    getWriteHandlers: (list: List) => createResearchTopicsWriteHandlers(list, touched),
  };
}

/**
 * The topic list page's surface. The touched-topics map lives as long as the
 * mounted page and is cleared when it unmounts or the signed-in person changes.
 */
export function useResearchTopicsSurface(): EntityListSurface<ResearchTopicListRow> {
  const userId = useAppSelector(selectUserId);
  const [touched] = useState<TouchedTopics>(() => new Map());
  const [surface] = useState(() => createResearchTopicsSurface(touched));
  useEffect(() => () => touched.clear(), [touched, userId]);
  return surface;
}
