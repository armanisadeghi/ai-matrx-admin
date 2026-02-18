'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectUserId } from '@/lib/redux/selectors/userSelectors';
import { supabase } from '@/utils/supabase/client';
import type { TestContext } from '../types';

export interface UseToolTestContextReturn {
  /** Authenticated user's real ID from Redux (Supabase auth) */
  userId: string | null;
  /**
   * Real Supabase JWT for the active session.
   * This is what the Python backend must receive — never a static/admin token.
   */
  authToken: string | null;
  /** Whether the session token has been loaded */
  tokenReady: boolean;
  /** Real conversation ID — null until created or provided by user */
  conversationId: string | null;
  /** Whether a conversation is ready for execution */
  conversationReady: boolean;
  /** Optional scope context (org/project/task) */
  scopeOverride: {
    organization_id?: string;
    project_id?: string;
    task_id?: string;
  };
  /** Set conversation ID directly (user-provided existing ID) */
  setConversationId: (id: string | null) => void;
  /** Create a real placeholder conversation directly via Supabase client */
  createConversation: () => Promise<void>;
  /** Whether conversation creation is in progress */
  isCreatingConversation: boolean;
  /** Set the scope override (org/project/task) */
  setScopeOverride: (scope: { organization_id?: string; project_id?: string; task_id?: string }) => void;
  /** Build the full TestContext for executeToolTest */
  buildTestContext: () => TestContext | undefined;
}

export function useToolTestContext(): UseToolTestContextReturn {
  const userId = useAppSelector(selectUserId);

  // ── Real JWT from active Supabase session ──────────────────────────────────
  // This is the only correct token for tool testing. Never use a static/admin token.
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) {
        setAuthToken(session?.access_token ?? null);
        setTokenReady(true);
      }
    };

    loadToken();

    // Keep token fresh — Supabase auto-refreshes sessions; listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setAuthToken(session?.access_token ?? null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ── Conversation state ─────────────────────────────────────────────────────
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // ── Scope state ────────────────────────────────────────────────────────────
  const [scopeOverride, setScopeOverride] = useState<{
    organization_id?: string;
    project_id?: string;
    task_id?: string;
  }>({});

  const createConversation = useCallback(async () => {
    setIsCreatingConversation(true);
    try {
      // Use the client-side Supabase instance directly — it carries the active
      // JWT so auth.uid() resolves correctly and RLS passes without a server hop.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          name: `Tool Test — ${new Date().toISOString()}`,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (convError || !conversation) {
        throw new Error(convError?.message ?? 'Failed to create conversation');
      }

      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'owner',
        });

      if (participantError) {
        // Best-effort cleanup
        await supabase.from('conversations').delete().eq('id', conversation.id);
        throw new Error(participantError.message);
      }

      setConversationId(conversation.id);
    } finally {
      setIsCreatingConversation(false);
    }
  }, []);

  const buildTestContext = useCallback((): TestContext | undefined => {
    if (!conversationId) return undefined;
    return {
      conversation_id: conversationId,
      ...scopeOverride,
    };
  }, [conversationId, scopeOverride]);

  return {
    userId,
    authToken,
    tokenReady,
    conversationId,
    conversationReady: !!conversationId,
    scopeOverride,
    setConversationId,
    createConversation,
    isCreatingConversation,
    setScopeOverride,
    buildTestContext,
  };
}
