"use client";

// features/applets/embed/AppletInPage.tsx — ONE APPLET DRAWN LIVE INSIDE A PAGE: a Space page's `applet` block
// (the editor) and records-ui's "page built from tables" (`RecordsUiHost.applets`). Loaded on demand by
// `appletsPort.tsx`, so the Applet host never rides a page's own chunk. The Applet renders through the ONE host
// (`AppletHostMount`), mounted `embedded`: its own pages navigate in place inside the block and its writes stay live.
//
// `height` reserves the frame (no layout shift; the Applet scrolls inside it). `pagePublished`: the page is on the
// web, so an Applet that is not on the web gets one line telling the page's editor that visitors will not see it,
// with the door to publish it (the Applet's own page, where publishing states its consequence first).
// `site`: the page is a published Site read by anyone (G1/G2 guest data shipped — live on Sites, 2026-10-22). A reader
// with no account runs it on the SAME guest lane as `/applets/<slug>` (`AppletHostMount visitor`: her saves are her
// own records, kept when she signs up); a signed-in reader runs it as herself. An Applet she cannot read, or one not
// on the web, draws what the static card drew: nothing for a stranger, the Publish line for a reader who can read it.

import { Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAuthReady, selectHasAccount } from "@/lib/redux/selectors/userSelectors";
import { AppletHostMount } from "@/features/applets-host/AppletHostMount";
import { appletManageHref, readAppletCards, type AppletCardInfo } from "./appletsPort";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import type { AppletPageValues } from "@ai-matrx/applets/platform";

export interface AppletInPageProps {
  appId: string;
  /** The reserved frame height in px; absent = the Applet's natural height. */
  height?: number;
  /** The page holding the block is published to the web. */
  pagePublished?: boolean;
  /** The Applet as read (name, slug, on the web), once — so the host's menu needs no second read. */
  onInfo?: (app: AppletCardInfo) => void;
  /** A launchpad's page bus for this Applet (`AppletHostMount` `pageValues`); absent = it stands alone. */
  pageValues?: AppletPageValues | null;
  /** The page is a published Site (anyone may read it): see the header. */
  site?: boolean;
}

/** One Applet, in place: read by id under the viewer's session (row security decides). */
export default function AppletInPage({ appId, height, pagePublished = false, onInfo, pageValues, site = false }: AppletInPageProps) {
  // On a Site the host is built once, as the reader really is: wait for the session before choosing the lane.
  const authReady = useAppSelector(selectAuthReady);
  const hasAccount = useAppSelector(selectHasAccount);
  const [app, setApp] = useState<AppletCardInfo | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setApp(null);
    setFailed(null);
    readAppletCards([appId]).then(
      (cards) => {
        if (cancelled) return;
        const hit = cards.get(appId);
        if (hit) {
          setApp(hit);
          onInfo?.(hit);
        } else setFailed("This Applet has not been shared with you.");
      },
      (err: unknown) => !cancelled && setFailed(err instanceof Error ? err.message : "The Applet could not be read."),
    );
    return () => {
      cancelled = true;
    };
  }, [appId]);
  const frame = height ? { height } : undefined;
  // On a Site a stranger sees nothing broken: an Applet she cannot read takes no room (the card's answer).
  if (failed && site) return <div data-applet-in-page={appId} data-state="absent" hidden />;
  if (failed)
    return (
      <p className="text-xs text-muted-foreground" data-applet-in-page={appId} data-state="refused">
        {failed}
      </p>
    );
  if (!app || (site && !authReady))
    return (
      <div data-applet-in-page={appId} data-state="reading" className="min-h-24" style={frame}>
        <p className="text-xs text-muted-foreground">Opening the Applet…</p>
      </div>
    );
  // On a Site an Applet that is not on the web is never run: its reader sees the card's Publish line (below).
  const notOnWeb = (pagePublished || site) && !app.onTheWeb;
  if (site && notOnWeb)
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-applet-in-page={appId} data-state="not-on-web">
        <Globe size={12} aria-hidden />
        <span>Visitors cannot see {app.name}.</span>
        <OutboundLink href={appletManageHref(appId)} className="text-primary underline-offset-2 hover:underline">
          Publish
        </OutboundLink>
      </p>
    );
  return (
    <div data-applet-in-page={appId} data-state="live" data-lane={site && !hasAccount ? "guest" : "member"} className="flex flex-col gap-1">
      {notOnWeb ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-applet-notice="not-on-web">
          <Globe size={12} aria-hidden />
          <span>Visitors cannot see this Applet.</span>
          <OutboundLink href={appletManageHref(appId)} className="text-primary underline-offset-2 hover:underline">
            Publish
          </OutboundLink>
        </p>
      ) : null}
      <div className={height ? "min-h-0 overflow-auto" : "min-h-24"} style={frame}>
        <AppletHostMount appletId={appId} slug={app.slug} embedded pageValues={pageValues ?? null} visitor={site && !hasAccount} />
      </div>
    </div>
  );
}
