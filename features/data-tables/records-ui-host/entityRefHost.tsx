// features/data-tables/records-ui-host/entityRefHost.tsx
//
// THE APP'S ENTITY-REF HOST: what `@ai-matrx/records-ui/entity-ref` (EntityRef, doors, TextWithDoors,
// toastDoor, NewTabLink, RecordStamps) needs from this app, bound ONCE at module load. Imported for
// side effect by providers/chatUiRegistrationBase.ts (the shell's eager graph, which already draws
// EntityRef) and, lazily, by jest.entity-ref-host.setup.ts. The package names every port and its
// announcing default in its src/entity-ref/slot.ts.

import React, { type ComponentType } from "react";
import {
  configureEntityRefs,
  type EntityAddress,
  type EntityRefHost,
  type EntityRefLinkProps,
} from "@ai-matrx/records-ui/entity-doors";
import { AppLink } from "@/components/navigation/AppLink";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { UserIdentity } from "@/components/user/UserIdentity";
import { resolveEntityToken, tryGetEntityInfo } from "@/features/scopes/registry/entityRegistry";
import { adminTwinHref } from "@/features/scopes/registry/adminTwins";
import { hasPeek } from "@/features/organizations/peek/kinds-list";
import { openResourcePeek } from "@/features/organizations/peek/resourcePeekStore";
import { useTeamHref } from "@/features/organizations/addressing/useTeamHref";
import { useAgentHref } from "@ai-matrx/chat/agents/addressing/useAgentHref";

/**
 * Agents and teams: their address depends on facts an id alone does not hold (an agent's kind and
 * version, a team's organization). Both hooks run on every render with a null id for other tokens.
 */
function useAppAddress(token: string, id: string | null, context: string): EntityAddress | null {
  const agent = useAgentHref({ id: token === "agent" ? id : null, context });
  const team = useTeamHref({ id: token === "team" ? id : null });
  if (!id) return null;
  const door = token === "agent" ? agent : token === "team" ? team : null;
  if (!door) return null;
  if (door.state === "ready") return { state: "ready", href: door.href };
  if (door.state === "resolving") return { state: "resolving", href: door.href };
  return { state: "refused", reason: door.reason };
}

export const entityRefHostPorts: EntityRefHost = {
  registry: {
    canonical: resolveEntityToken,
    describe: (token) => {
      const info = tryGetEntityInfo(token);
      return info
        ? {
            label: info.label,
            Icon: info.Icon,
            hrefFor: info.hrefFor ?? null,
            titleColumn: info.titleColumn ?? null,
            listCandidatesOnly: Boolean(info.listCandidates),
          }
        : null;
    },
  },
  adminHref: (token, id) => adminTwinHref(token, id) ?? null,
  hasPeek,
  openPeek: (ask) => {
    openResourcePeek(ask);
  },
  useAddress: useAppAddress,
  Link: AppLink as unknown as ComponentType<EntityRefLinkProps>,
  ErrorMenu: ({ error }) => <ErrorAlchemyMenu error={error} />,
  Person: ({ user, className }) => (
    <UserIdentity user={user} size="xs" subtitle={false} className={className} />
  ),
};

configureEntityRefs(entityRefHostPorts);
