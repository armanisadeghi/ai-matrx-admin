// record-view: none — a sub-view (routes) inside a record or scope, not the record page; the record's own page carries the section
import { AuthorityRouterWorkspace } from "@/features/marketing/authority/AuthorityRouterWorkspace";

/** Where authority should flow next, route by route. */
export default function MarketingSeoAuthorityRoutesPage() {
  return <AuthorityRouterWorkspace view="routes" />;
}
