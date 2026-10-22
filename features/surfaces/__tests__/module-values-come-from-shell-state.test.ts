/**
 * MODULE VALUES COME FROM SHELL STATE (surface declarations W1 §1b.1).
 *
 * A module surface (`matrx-default/<domain>`) declares the active organization (and, for HR, the
 * employer context) once; every page under it inherits the declaration. The host answers those
 * inherited values from state the shell already holds — Redux and the `/hr` layout's one
 * resolution — and answers nothing for a value a non-module ancestor declared.
 */
import type { RootState } from "@/lib/redux/rootReducer";
import type { HrContextValue } from "@/features/hr/shared/useHrContext";
import {
  HR_MODULE_SURFACE,
  hrShellValues,
  organizationShellValues,
} from "@/features/surfaces/utils/module-values";

const state = (organization_id: string | null, organization_name: string | null) =>
  ({ appContext: { organization_id, organization_name } }) as unknown as RootState;

const ask = (name: string, from: string) => ({ name, from, surfaceName: "matrx-user/marketing-page" });

describe("module values come from shell state", () => {
  it("answers the active organization for a module's inherited value, from Redux", () => {
    const source = organizationShellValues(() => state("org-1", "Acme Inc"));
    expect(source(ask("active_organization_id", "matrx-default/marketing"))).toBe("org-1");
    expect(source(ask("active_organization_name", "matrx-default/marketing"))).toBe("Acme Inc");
  });

  it("answers nothing for a non-module ancestor, an unknown name, or before the org loads", () => {
    expect(organizationShellValues(() => state("org-1", "Acme"))(ask("active_organization_id", "matrx-user/marketing-brand"))).toBeUndefined();
    expect(organizationShellValues(() => state("org-1", "Acme"))(ask("brand_name", "matrx-default/marketing"))).toBeUndefined();
    expect(organizationShellValues(() => state(null, null))(ask("active_organization_name", "matrx-default/marketing"))).toBeUndefined();
  });

  it("answers HR's employer context only for the HR module, only once it resolved", () => {
    const hr = {
      isLoading: false,
      employers: [
        { organization_id: "e1", name: "Acme Clinic" },
        { organization_id: "e2", name: "Beta Dental" },
      ],
      active: { organization_id: "e2" },
      persona: "manager",
      scope: { mode: "one", employers: [{ organization_id: "e2", name: "Beta Dental" }] },
    } as unknown as HrContextValue;
    const source = hrShellValues(() => hr);
    expect(source(ask("hr_active_employer_name", HR_MODULE_SURFACE))).toBe("Beta Dental");
    expect(source(ask("hr_persona", HR_MODULE_SURFACE))).toBe("manager");
    expect(source(ask("hr_scope_mode", HR_MODULE_SURFACE))).toBe("one");
    expect(source(ask("hr_employer_names", HR_MODULE_SURFACE))).toEqual(["Beta Dental"]);
    expect(source(ask("hr_persona", "matrx-default/marketing"))).toBeUndefined();
    expect(hrShellValues(() => ({ ...hr, isLoading: true }))(ask("hr_persona", HR_MODULE_SURFACE))).toBeUndefined();
    expect(hrShellValues(() => null)(ask("hr_persona", HR_MODULE_SURFACE))).toBeUndefined();
  });
});
