/**
 * Arman, 2026-10-17: the brand Activity tab "follows the normal rules of sharing. nothing special." Whoever can
 * view the brand reads the brand's runs, crawls and tracked accounts through the access system, and sees what it
 * grants. A viewer outside the brand's organization is no special case: the reads still run (no organization
 * check, no "visible to members" line), and a viewer who is granted nothing gets the standard empty state.
 * BBW_PATH points the same test at another copy of the component (used to prove it fails on the old one).
 */
import { renderToStaticMarkup } from "react-dom/server";

const useQueryCalls: Array<{ queryKey: unknown[]; enabled?: boolean }> = [];

jest.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryKey: unknown[]; enabled?: boolean }) => {
    useQueryCalls.push(opts);
    return { data: opts.queryKey[1] === "smart-add-setup" ? null : [], isLoading: false, isFetching: false, isError: false, isSuccess: true, error: null, refetch: jest.fn() };
  },
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("next/link", () => ({ __esModule: true, default: ({ children }: { children: unknown }) => children }));
jest.mock("@ai-matrx/data/db", () => ({ readAllRows: jest.fn() }));
jest.mock("@/components/ui/loaders/Spinner", () => ({ Spinner: () => null }));
jest.mock("@ai-matrx/design-system", () => ({ Popover: () => null, PopoverContent: () => null, PopoverTrigger: () => null }));
jest.mock("@ai-matrx/design-system/controls", () => ({ Button: () => null }));
jest.mock("@ai-matrx/design-system/data-table", () => ({
  MatrxDataTable: (p: { emptyState: { title: string }; data: unknown[] }) => (
    <div data-testid="table">{p.data.length === 0 ? p.emptyState.title : "rows"}</div>
  ),
}));
jest.mock("@ai-matrx/kit/outbound-react", () => ({ OutboundLink: () => null }));
jest.mock("@ai-matrx/kit/format", () => ({ formatCount: String, formatRelativeTime: () => "" }));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/webDb", () => ({ authenticatedWebDb: jest.fn() }));
// Redux: a signed-in viewer who belongs to NO organization of the brand, and is not an admin.
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => jest.fn(), useAppSelector: (select: () => unknown) => select() }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectIsAdmin: () => false }));
jest.mock("@/features/scopes/redux/selectors/tree", () => ({ selectOrganizationIds: () => ["some-other-org"] }));
jest.mock("@/lib/toast", () => ({ recordToast: jest.fn() }));
jest.mock("@/utils/errors", () => ({ extractErrorMessage: String }));
jest.mock("@/lib/workflows/system-runs", () => ({ lookupSystemRun: jest.fn() }));
jest.mock("@/features/workflow-runtime/run-doors", () => ({ runHref: () => "" }));
jest.mock("@/features/marketing/crawler/direct-client", () => ({ initializeSite: jest.fn() }));
jest.mock("@/features/marketing/data/hooks", () => ({
  useBrandProperties: () => ({ data: [] }),
  useBrandSites: () => ({ data: [] }),
}));
jest.mock("@/features/marketing/data/service", () => ({ countSitePages: jest.fn(), listBrandProperties: jest.fn(), listBrandSites: jest.fn() }));
jest.mock("@/features/marketing/social/server", () => ({ refreshProfile: jest.fn(), socialErrorMessage: String, trackAccount: jest.fn() }));
jest.mock("@/features/marketing/social/post-count", () => ({ rememberedMaxPostsPlain: jest.fn() }));
jest.mock("@/features/marketing/social/cost", () => ({ useSocialSpend: () => ({ postsText: () => "", postsTotalText: () => "" }) }));
jest.mock("@/lib/scoped-config/sessionKnob", () => ({ useSessionKnob: () => null }));
jest.mock("@/features/marketing/components/shared/PropertyKindMark", () => ({ PropertyKindMark: () => null }));
jest.mock("@/features/marketing/components/shared/MarketingUi", () => ({
  SectionCard: ({ children }: { children: unknown }) => <section>{children as never}</section>,
}));
jest.mock("@/features/marketing/social/row-open", () => ({ NO_RAW_ROW_WINDOW: {} }));
jest.mock("@/features/marketing/social/components/PlatformMark", () => ({ platformLabel: String }));
jest.mock("@/features/marketing/lib/routes", () => ({ marketingRoutes: {} }));
jest.mock("@/features/marketing/lib/keys", () => ({ marketingSeg: () => "brand" }));
jest.mock("../postHistoryOutcomes", () => ({ accountKey: String, loadPostHistoryNotes: jest.fn() }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/components/cost/costColumn", () => ({ costColumn: () => ({}) }));
jest.mock("@/components/cost/useCostDisplay", () => ({ useCostDisplay: () => ({}) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BrandBackgroundWork } = require(process.env.BBW_PATH ?? "../BrandBackgroundWork");

const brand = { id: "b1", organization_id: "brand-org", name: "Brand" };

describe("Brand Activity for a viewer outside the brand's organization", () => {
  it("runs its reads like anyone's and shows the standard empty state, never a special notice", () => {
    useQueryCalls.length = 0;
    const html = renderToStaticMarkup(<BrandBackgroundWork brand={brand} canEdit={false} />);
    expect(html).not.toContain("visible to members");
    expect(html).toContain("No websites or accounts yet");
    expect(useQueryCalls.length).toBeGreaterThan(0);
    expect(useQueryCalls.filter((q) => q.enabled === false)).toEqual([]);
  });
});
