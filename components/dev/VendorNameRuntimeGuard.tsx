"use client";

/**
 * DEV-ONLY runtime guard: our data vendors are our business, never the customer's.
 * Logs console.error when rendered text contains a vendor name on a customer route.
 * Renders nothing; does nothing in production or on admin/dev routes.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VENDOR_CI = /scrape\s?creators?|bright\s?data|ensemble\s?data|apify|data\s?for\s?seo|serp\s?api|firecrawl|twilio|\btreg(\.to)?\b|tik\s?hub|just\s?one\s?api|\badyntel\b|\bcloro\b|\bcrawl4ai\b|lite\s?scrape|\btomba\b|\bprospeo\b|\bmillion\s?verifier\b|\bscraping\s?bee\b|\bserper\b|\boxylabs\b|\brapid\s?api\b|\bscraper\s?api\b|\btavily\b|\btrestle(?:iq)?\b|\bhlr\s?lookup\b|\bcompany\s?enrich\b|\bdrop\s?leads\b|\blima\s?data\b|\bse\s?ranking\b|\bolostep\b|\bsearch1api\b|\btiny\s?fish\b|\bkeenable\b|\bzen\s?prospect\b|\bany\s?api\b/i;
const VENDOR_CS = /\bBrave\b|\bHunter(?:\.io)?\b(?= (?:API|key|finds|MCP))|\bHunter\.io\b/;
const EXEMPT_PATH = /^\/(administration|demos|dev|admin|privacy-policy|terms|sms)(\/|$)/;

/** Admin surfaces that may name vendors (the Builder panel window, or anything marked `data-admin-surface`). Customer screens stay strict. */
export const ADMIN_SURFACE_SELECTOR = '[data-admin-surface], [data-window-id="builder-panel-window"]';

/** What a person wrote or saved themselves (a vault item named "DataForSEO login"): their words, never our vendor leaking. */
export const USER_CONTENT_SELECTOR = "[data-user-content]";

export function findVendorName(text: string): string | null {
  return text.match(VENDOR_CI)?.[0] ?? text.match(VENDOR_CS)?.[0] ?? null;
}

export default function VendorNameRuntimeGuard() {
  const pathname = usePathname() ?? "";
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || EXEMPT_PATH.test(pathname)) return;
    const seen = new Set<string>();
    const check = (root: Node) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const parent = n.parentElement;
        if (!parent || /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(parent.tagName)) continue;
        if (parent.closest(ADMIN_SURFACE_SELECTOR) || parent.closest(USER_CONTENT_SELECTOR)) continue;
        const text = n.textContent ?? "";
        const hit = text.length < 2000 ? findVendorName(text) : null;
        if (hit && !seen.has(text)) {
          seen.add(text);
          console.error(`[vendor-name] "${hit}" is rendered on a customer screen (${pathname}): ${text.trim().slice(0, 120)}`);
        }
      }
    };
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((a) => check(a));
        if (m.type === "characterData" && m.target.parentElement) check(m.target.parentElement);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, [pathname]);
  return null;
}
