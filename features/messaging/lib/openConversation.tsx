"use client";

/**
 * Opening a conversation from the list, with the wait SHOWN.
 *
 * 🚨 A ROW CLICK THAT ONLY HIGHLIGHTS IS A DEAD CLICK (2026-10-15). Selecting a
 * row is instant — the package marks it active and read — but the thread is a
 * ROUTE (`/messages/<id>`), and a route change waits on a server round trip
 * before the URL or the pane moves. On a busy server that round trip measured
 * 3–17s; the row lit up, the unread count dropped, and the pane kept saying
 * "Pick or start a conversation", so every click read as broken.
 *
 * The fix is the app's navigation rule: the push runs in a transition, the
 * clicked row and the right pane say "Opening…" until the route arrives, and a
 * second click on the same row while it is opening does nothing.
 *
 * `MessagesConversationOpener` is mounted once by the `/messages` layout. Every
 * list and pane under it opens through `useOpenConversation()`; outside it the
 * hook still pushes inside a transition, it just has no one to tell.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

export const conversationHref = (conversationId: string): string =>
  `/messages/${conversationId}`;

interface ConversationOpenerValue {
  /** The conversation being opened, until its route is on screen. */
  openingId: string | null;
  open: (conversationId: string) => void;
}

const ConversationOpenerContext = createContext<ConversationOpenerValue | null>(
  null,
);

export function MessagesConversationOpener({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const openingRef = useRef<string | null>(null);

  // The route moved (to the thread, or anywhere else): nothing is opening.
  useEffect(() => {
    openingRef.current = null;
    setOpeningId(null);
  }, [pathname]);

  const open = useCallback(
    (conversationId: string) => {
      const href = conversationHref(conversationId);
      if (pathname === href || openingRef.current === conversationId) return;
      openingRef.current = conversationId;
      setOpeningId(conversationId);
      startTransition(() => router.push(href));
    },
    [pathname, router],
  );

  const value = useMemo(() => ({ openingId, open }), [openingId, open]);
  return (
    <ConversationOpenerContext.Provider value={value}>
      {children}
    </ConversationOpenerContext.Provider>
  );
}

/** Opens a conversation's thread; inside `/messages` the wait is shown. */
export function useOpenConversation(): (conversationId: string) => void {
  const opener = useContext(ConversationOpenerContext);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const fallback = useCallback(
    (conversationId: string) =>
      startTransition(() => router.push(conversationHref(conversationId))),
    [router],
  );
  return opener?.open ?? fallback;
}

/** The conversation whose route is on its way, or null. */
export function useOpeningConversationId(): string | null {
  return useContext(ConversationOpenerContext)?.openingId ?? null;
}
