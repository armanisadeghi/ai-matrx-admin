// features/surfaces/utils/module-values.ts
//
// MODULE VALUES FROM SHELL STATE (surface declarations W1 §1b.1, §5). A module surface
// (`matrx-default/<domain>`, AI Matrx › module) declares what is true on every page beneath it;
// every page inherits the declaration. `@ai-matrx/chat`'s `registerShellValueSource` asks these
// sources for an INHERITED declared value the page and its live capture left unset — after
// `withLiveValues`. Answers come only from state the shell already holds: the active organization
// in Redux (org bootstrap) and HR's one employer resolution (`HrProvider`). No DB read, no
// per-page scope-builder edit. `undefined` = not mine / not known yet (the server then says the
// template's fallback words).
import type { ShellValueSource } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import type { RootState } from "@/lib/redux/rootReducer";
import {
  selectActiveOrganizationId,
  selectActiveOrganizationName,
} from "@/features/scopes/redux/selectors/active-context";
import type { HrContextValue } from "@/features/hr/shared/useHrContext";

/** Module surfaces live in the shared app client (W1-MODULES §0). */
export const MODULE_SURFACE_PREFIX = "matrx-default/";

const isModule = (from: string) => from.startsWith(MODULE_SURFACE_PREFIX);

const present = <T,>(value: T | null | undefined): T | undefined =>
  value === null || value === undefined || value === "" ? undefined : value;

/** The active organization, from Redux, for every module. */
export function organizationShellValues(getState: () => RootState): ShellValueSource {
  return ({ name, from }) => {
    if (!isModule(from)) return undefined;
    if (name === "active_organization_id") return present(selectActiveOrganizationId(getState()));
    if (name === "active_organization_name") return present(selectActiveOrganizationName(getState()));
    return undefined;
  };
}

export const HR_MODULE_SURFACE = "matrx-default/human-resources";

/** HR's employer context, from the `/hr` layout's one resolution (`HrProvider`). */
export function hrShellValues(read: () => HrContextValue | null): ShellValueSource {
  return ({ name, from }) => {
    if (from !== HR_MODULE_SURFACE) return undefined;
    const hr = read();
    if (!hr || hr.isLoading) return undefined;
    switch (name) {
      case "hr_scope_mode":
        return hr.scope.mode;
      case "hr_employer_names":
        return hr.scope.employers.length ? hr.scope.employers.map((e) => e.name) : undefined;
      case "hr_active_employer_name": {
        const id = hr.active?.organization_id;
        return present(id ? hr.employers.find((e) => e.organization_id === id)?.name : undefined);
      }
      case "hr_persona":
        return present(hr.persona);
      default:
        return undefined;
    }
  };
}
