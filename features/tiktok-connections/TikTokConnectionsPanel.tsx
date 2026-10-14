"use client";

import { formatCount } from "@ai-matrx/kit/format";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { components } from "@ai-matrx/api/types";
import { ErrorNotice } from "@ai-matrx/design-system";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { attachTikTokAccount, discoverTikTokAccount, disconnectTikTokConnection, finishTikTokAuthorization,
  listTikTokConnections, listTikTokVideos, refreshTikTokConnection, startTikTokAuthorization } from "./service";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

function tikTokLink(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password &&
        (url.hostname === "tiktok.com" || url.hostname.endsWith(".tiktok.com"))) return url.href;
  } catch { /* A malformed provider link is not navigable. */ }
  return undefined;
}

export function TikTokConnectionsPanel() {
  const userId = useAppSelector(selectUserId);
  const organizationId = useAppSelector(selectOrganizationId); // org-filter: server-call TikTok connection requests run in the selected organization
  return <TikTokConnectionContents key={`${userId}:${organizationId}`} />;
}

function TikTokConnectionContents() {
  const userId = useAppSelector(selectUserId);
  const organizationId = useAppSelector(selectOrganizationId); // org-filter: server-call TikTok connection requests run in the selected organization
  const params = useSearchParams();
  const [connections, setConnections] = useState<Awaited<ReturnType<typeof listTikTokConnections>> | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [callbackFailure, setCallbackFailure] = useState<string | null>(() => {
    const status = params?.get("oauth_status");
    return status === "denied" ? "Reconnect TikTok to grant access." : status === "failed" ? "TikTok could not finish connecting." : null;
  });
  const [busy, setBusy] = useState(false);
  const [discovery, setDiscovery] = useState<{ connectionId: string; account: components["schemas"]["TikTokDiscoveryResponse"] } | null>(null);
  const [videos, setVideos] = useState<components["schemas"]["TikTokVideosResponse"] | null>(null);
  const finishing = useRef<string | null>(null);
  const load = useCallback(async () => {
    try { setConnections(await listTikTokConnections()); setFailure(null); }
    catch (error) { setConnections(null); setFailure(extractErrorMessage(error)); }
  }, []);
  useEffect(() => {
    let active = true;
    void listTikTokConnections().then(rows => { if (active) { setConnections(rows); setFailure(null); } })
      .catch(error => { if (active) { setConnections(null); setFailure(extractErrorMessage(error)); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const status = params?.get("oauth_status");
    if (status === "denied" || status === "failed") {
      const url = new URL(window.location.href);
      url.searchParams.delete("oauth_status");
      replaceAddressWithoutNavigating(url);
      return;
    }
    const state = params?.get("tiktok_state"), code = params?.get("tiktok_code");
    if (!state || !code || !userId || !organizationId || finishing.current === state) return;
    finishing.current = state;
    // Remove the temporary authorization code before notifications/navigation.
    const url = new URL(window.location.href);
    url.searchParams.delete("tiktok_state"); url.searchParams.delete("tiktok_code");
    replaceAddressWithoutNavigating(url);
    void Promise.resolve().then(async () => {
      setBusy(true);
      return finishTikTokAuthorization(state, code, userId, organizationId);
    })
      .then(async () => { toast.success("TikTok connected. Select your account to track it."); await load(); })
      .catch(error => setCallbackFailure(extractErrorMessage(error))).finally(() => setBusy(false));
  }, [params, userId, organizationId, load]);

  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try { await action(); await load(); }
    catch (error) { setFailure(extractErrorMessage(error)); }
    finally { setBusy(false); }
  };
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><h3 className="font-medium">TikTok accounts</h3><Badge variant="secondary">Approved testers</Badge></div>
    <p className="text-sm text-muted-foreground">Read your profile and public videos.</p>
    <p className="text-sm text-muted-foreground">Sandbox testers only until TikTok approves access.</p>
    {(callbackFailure ?? failure) && <ErrorNotice error={callbackFailure ?? failure} size="compact" />}
    <Button disabled={busy || !userId || !organizationId} onClick={() => void act(async () => {
      setCallbackFailure(null);
      if (!userId || !organizationId) throw new Error("Choose an organization to connect TikTok.");
      const started = await startTikTokAuthorization(userId, organizationId);
      window.location.assign(started.authorization_url);
    })}>Connect TikTok</Button>
    {connections === null && !failure && <RegionSkeleton shape="rows" count={1} aria-label="Loading your TikTok accounts" />}
    {connections?.map(connection => <div key={connection.id} className="rounded-md border p-3 space-y-2">
      <div className="flex justify-between gap-2"><span>{connection.account_name ?? "TikTok account"}</span><Badge variant="outline">{connection.status}</Badge></div>
      {connection.last_error && <ErrorNotice error={connection.last_error} size="compact" />}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy || connection.status !== "connected"} onClick={() => void act(async () => {
          setDiscovery(null); setVideos(null);
          setDiscovery({ connectionId: connection.id, account: await discoverTikTokAccount(connection.id) });
        })}>Select account</Button>
        <Button variant="outline" disabled={busy} onClick={() => void act(() => refreshTikTokConnection(connection.id))}>Refresh access</Button>
        <Button variant="outline" disabled={busy} onClick={() => void act(async () => {
          if (!await confirm({ title: "Disconnect TikTok?", description: "Access stops. Collected history stays.", confirmLabel: "Disconnect", variant: "destructive" })) return;
          await disconnectTikTokConnection(connection.id); setDiscovery(null); setVideos(null);
        })}>Disconnect</Button>
      </div>
    </div>)}
    {discovery && <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center gap-3">
        <Avatar><AvatarImage src={discovery.account.profile.avatar_url ?? undefined} alt="" /><AvatarFallback>TT</AvatarFallback></Avatar>
        <div className="min-w-0">
          <p className="font-medium">{discovery.account.display_name ?? "TikTok account"}</p>
          {discovery.account.profile.username && <p className="text-sm text-muted-foreground">@{discovery.account.profile.username}</p>}
        </div>
        {discovery.account.profile.is_verified === true && <Badge variant="secondary">Verified</Badge>}
      </div>
      {discovery.account.profile.bio_description && <p className="text-sm whitespace-pre-wrap break-words">{discovery.account.profile.bio_description}</p>}
      {tikTokLink(discovery.account.profile.profile_deep_link) && <OutboundLink className="text-sm underline" href={tikTokLink(discovery.account.profile.profile_deep_link)}>View on TikTok</OutboundLink>}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
        {([
          ["Followers", discovery.account.profile.follower_count],
          ["Following", discovery.account.profile.following_count],
          ["Likes", discovery.account.profile.likes_count],
          ["Videos", discovery.account.profile.video_count],
        ] as const).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{formatCount(value)}</dd></div>)}
      </dl>
      <p className="text-sm text-muted-foreground">Updates automatically after you select Track account.</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void act(async () => {
          await attachTikTokAccount(discovery.connectionId, discovery.account.resource_ref);
          toast.success("Account added to Social Accounts.");
        })}>Track account</Button>
        <Button variant="outline" disabled={busy || !discovery.account.granted_scopes.includes("video.list")} onClick={() => void act(async () => {
          setVideos(await listTikTokVideos(discovery.connectionId));
        })}>Public videos</Button>
      </div>
      {videos && <div className="space-y-3 border-t pt-3">
        {videos.videos.length === 0 && <p className="text-sm text-muted-foreground">No public videos</p>}
        {videos.videos.map(video => <div key={video.id} className="space-y-1">
          {tikTokLink(video.share_url)
            ? <OutboundLink className="text-sm font-medium underline" href={tikTokLink(video.share_url)}>{video.title || video.video_description || "Untitled video"}</OutboundLink>
            : <p className="text-sm font-medium">{video.title || video.video_description || "Untitled video"}</p>}
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {([["Views", video.view_count], ["Likes", video.like_count], ["Comments", video.comment_count], ["Shares", video.share_count]] as const).map(([label, value]) => <div key={label} className="flex gap-1"><dt>{label}</dt><dd>{formatCount(value)}</dd></div>)}
          </dl>
        </div>)}
        {videos.has_more && videos.cursor != null && <Button variant="outline" disabled={busy} onClick={() => void act(async () => {
          const next = await listTikTokVideos(discovery.connectionId, videos.cursor ?? undefined);
          setVideos({ ...next, videos: [...videos.videos, ...next.videos] });
        })}>Load more</Button>}
      </div>}
    </div>}
  </div>;
}
