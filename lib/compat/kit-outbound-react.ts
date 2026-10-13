"use client";

/**
 * Client boundary for `@ai-matrx/kit/outbound-react`. kit@0.44.x publishes that
 * entry WITHOUT a "use client" directive, so a Server Component rendering
 * <OutboundLink> passes onClick/onAuxClick to a plain <a> and the route 500s
 * ("Event handlers cannot be passed to Client Component props"). The aliases in
 * next.config.js route the specifier here; remove once kit ships the directive.
 * The relative path (not the package specifier) avoids an alias loop.
 */
export {
  OutboundLink,
  OutboundMarkdownLink,
  installOutboundReferralDecorator,
  outboundMarkdownComponents,
  tagAnchorForNavigation,
} from "../../node_modules/@ai-matrx/kit/dist/outbound-react.js";
