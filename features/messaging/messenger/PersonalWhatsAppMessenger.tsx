"use client";

/** A native provider source for the existing messenger; no synthetic Matrx user/message identities. */
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, RefreshCw } from "lucide-react";
import { MessengerShell } from "@ai-matrx/chat/messenger/MessengerShell";
import type { MessengerSource } from "@ai-matrx/chat/messenger/contract";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoHint } from "@/components/official/InfoHint";
import { NativeWhatsAppAttachment } from "./NativeWhatsAppAttachment";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";
import { type PersonalWhatsAppClient, type PersonalChat, type PersonalGrant, type PersonalMessage, type PersonalMessages } from "@/features/social-connections/personal-whatsapp-service";

export function PersonalWhatsAppMessenger({ grant, client: personalWhatsApp, onSelection, onAccessFailure }: { grant: PersonalGrant; client: PersonalWhatsAppClient; onSelection: (grant: PersonalGrant) => void; onAccessFailure: (message: string) => void }) {
  const [chats, setChats] = useState<PersonalChat[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    const version = ++generation.current;
    const controller = new AbortController();
    personalWhatsApp.chats(undefined, controller.signal).then((page) => {
      if (generation.current !== version) return;
      setChats(page.items); setCursor(page.oldest_cursor); setHasMore(page.has_more);
    }).catch((cause: unknown) => {
      if (controller.signal.aborted || generation.current !== version) return;
      setChats([]); setActive(null); setHasMore(false);
      onAccessFailure(cause instanceof Error ? cause.message : "Chats could not load. Retry.");
    }).finally(() => { if (generation.current === version) setLoading(false); });
    return () => { generation.current += 1; controller.abort(); };
  }, [personalWhatsApp, onAccessFailure]);

  async function loadMore() {
    if (!cursor || loading) return;
    const version = generation.current;
    setLoading(true); setError(null);
    try {
      const page = await personalWhatsApp.chats(cursor);
      if (generation.current !== version) return;
      setChats((previous) => [...new Map([...previous, ...page.items].map((chat) => [chat.id, chat])).values()]);
      setCursor(page.oldest_cursor); setHasMore(page.has_more);
    } catch (cause) { if (generation.current === version) { setChats([]); setActive(null); setHasMore(false); onAccessFailure(cause instanceof Error ? cause.message : "Chats could not load. Retry."); } }
    finally { if (generation.current === version) setLoading(false); }
  }

  const source = useMemo<MessengerSource>(() => ({
    title: "WhatsApp", rail: [{ id: "chats", label: "Chats", icon: MessageCircle }],
    activeSpaceId: "chats", onSelectSpace: () => undefined,
    contacts: chats.map((chat) => ({ id: chat.id, name: chat.title, avatar: { kind: "monogram" } })),
    listState: { loading, error, hasMore, loadMore: () => void loadMore(), emptyLabel: "No WhatsApp chats available" },
    activeContactId: active, onSelectContact: setActive,
    header: (contact) => ({ title: contact.name }),
    headerActions: () => <span className="flex items-center gap-2"><Badge variant="outline">Read-only</Badge><InfoHint text="Shows history available in Beeper. Attachments load on this computer; unavailable files and older history can be opened in Beeper." /></span>,
    renderThread: (contact) => <NativeWhatsAppThread key={`${grant.id}:${grant.generation}:${contact.id}`} client={personalWhatsApp} onSelection={onSelection} chatId={contact.id} initiallySelected={grant.selected_chat_ids?.includes(contact.id) ?? false} onAccessFailure={onAccessFailure} />,
    renderEmpty: () => <p className="p-6 text-sm text-muted-foreground">Choose a WhatsApp conversation.</p>,
  }), [active, chats, cursor, error, grant.generation, grant.id, grant.selected_chat_ids, hasMore, loading, onAccessFailure, onSelection, personalWhatsApp]);

  return <MessengerShell source={source} />;
}

function NativeWhatsAppThread({ chatId, initiallySelected, client: personalWhatsApp, onSelection, onAccessFailure }: { chatId: string; client: PersonalWhatsAppClient; onSelection: (grant: PersonalGrant) => void; initiallySelected: boolean; onAccessFailure: (message: string) => void }) {
  const [page, setPage] = useState<PersonalMessages | null>(null);
  const [messages, setMessages] = useState<PersonalMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState(initiallySelected);
  const context = useRef(0);

  useEffect(() => {
    const version = ++context.current;
    const controller = new AbortController();
    async function open() {
      setBusy(true); setError(null);
      if (!initiallySelected) {
        const receipt = await personalWhatsApp.selectChat(chatId);
        if (context.current !== version) return;
        onSelection(receipt);
        return;
      }
      if (context.current !== version) return;
      setSelected(true);
      const current = await personalWhatsApp.messages(chatId, undefined, controller.signal);
      if (context.current === version) { setPage(current); setMessages(current.items); }
    }
    void open().catch((cause: unknown) => {
      if (controller.signal.aborted || context.current !== version) return;
      setError(cause instanceof Error ? cause.message : "Conversation could not open. Retry.");
      setPage(null); setMessages([]);
      onAccessFailure(cause instanceof Error ? cause.message : "WhatsApp access failed. Check connection.");
    }).finally(() => { if (context.current === version) setBusy(false); });
    return () => { context.current += 1; controller.abort(); };
  }, [chatId, initiallySelected, personalWhatsApp, onSelection, onAccessFailure]);

  async function read(older = false) {
    if (!selected || busy) return;
    const version = context.current;
    setBusy(true); setError(null);
    try {
      const current = await personalWhatsApp.messages(chatId, older && page ? page.oldest_cursor : undefined);
      if (context.current !== version) return;
      setPage(current);
      setMessages((previous) => [...new Map([...previous, ...current.items].map((message) => [message.id, message])).values()]
        .sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at)));
    } catch (cause) {
      if (context.current !== version) return;
      setPage(null); setMessages([]); setError(cause instanceof Error ? cause.message : "WhatsApp access failed. Check connection.");
      onAccessFailure(cause instanceof Error ? cause.message : "WhatsApp access failed. Check connection.");
    } finally { if (context.current === version) setBusy(false); }
  }

  return <div className="flex h-full min-h-0 flex-col">
    <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">Available history<InfoHint text="History is read from Beeper on this computer and is not copied into an organization inbox." /></span>
      <Button variant="quiet" disabled={busy || !selected} onClick={() => void read()}><RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh</Button>
    </div>
    {error && <div className="p-3"><ErrorNotice size="inline" message={error} /></div>}
    <div className="min-h-0 flex-1 overflow-auto p-4">
      {page?.has_more && <Button variant="outline" disabled={busy} onClick={() => void read(true)}>Older messages</Button>}
      {busy && messages.length === 0 && <p className="text-sm text-muted-foreground">Loading messages…</p>}
      {!error && !busy && page && messages.length === 0 && <p className="text-sm text-muted-foreground">No messages available in Beeper.</p>}
      <ol className="space-y-3">{messages.map((message) => <li key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[85%] rounded-lg px-3 py-2 ${message.direction === "outbound" ? "bg-primary/10" : "bg-muted"}`}>
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{message.direction === "outbound" ? "You" : message.sender_name || "Contact"}</span><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time></div>
          {message.content.parts.map((part) => <MarkdownRenderer key={part.id} content={part.text} role="user" type="message" fontSize={14} showSource />)}
          {message.attachments?.map((item) => <NativeWhatsAppAttachment key={`${message.id}:${item.revision}`} client={personalWhatsApp} chatId={chatId} messageId={message.id} attachment={item} />)}
        </div>
      </li>)}</ol>
    </div>
  </div>;
}
