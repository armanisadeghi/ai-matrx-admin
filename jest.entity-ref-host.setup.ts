/**
 * Jest only: binds `@ai-matrx/records-ui/entity-ref`'s host to the app's REAL ports
 * (features/data-tables/records-ui-host/entityRefHost.tsx), loaded on the first call — after the
 * suite's own `jest.mock` calls — so a suite that mocks next/link, the peek store or the registry sees
 * its mock inside every reference, and a suite that never draws one loads nothing.
 */
import { configureEntityRefs, type EntityRefHost } from "@ai-matrx/records-ui/entity-doors";

const load = (): EntityRefHost =>
  require("@/features/data-tables/records-ui-host/entityRefHost").entityRefHostPorts;

configureEntityRefs({
  registry: {
    canonical: (token) => load().registry.canonical(token),
    describe: (token) => load().registry.describe(token),
  },
  adminHref: (token, id) => load().adminHref?.(token, id) ?? null,
  hasPeek: (kind) => load().hasPeek?.(kind) ?? false,
  openPeek: (ask) => load().openPeek?.(ask),
  useAddress: (token, id, context) => load().useAddress?.(token, id, context) ?? null,
  Link: (props) => {
    const Link = load().Link!;
    return require("react").createElement(Link, props);
  },
  ErrorMenu: (props) => require("react").createElement(load().ErrorMenu!, props),
  Person: (props) => require("react").createElement(load().Person!, props),
});
