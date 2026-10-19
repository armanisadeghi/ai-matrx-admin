// record-view: none — a sub-view (evidence) inside a record or scope, not the record page; the record's own page carries the section
import { AuthorityRouterWorkspace } from "@/features/marketing/authority/AuthorityRouterWorkspace";

/** The pages and signals the routing decisions were built from. */
export default function MarketingSeoAuthorityEvidencePage() {
  return <AuthorityRouterWorkspace view="evidence" />;
}
