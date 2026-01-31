"use client";

import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { setConversations, setLoading, setError, setMessagingAvailable } from "../redux/messagingSlice";
import { useConversations } from "@/hooks/useSupabaseMessaging";

/**
 * MessagingInitializer - Loads conversations on mount and syncs to Redux
 * 
 * Uses auth.users.id (UUID) for user identification.
 * This component should be rendered once at the root layout level.
 * It doesn't render any UI, just handles data loading.
 */
export function MessagingInitializer() {
  const dispatch = useAppDispatch();

  // Get user from Redux - use auth.users.id (UUID)
  const user = useAppSelector((state) => state.user);
  const userId = user?.id;

  // Load conversations
  const { conversations, isLoading, error } = useConversations(userId || null);

  // Mark messaging as available
  useEffect(() => {
    dispatch(setMessagingAvailable(true));
    return () => {
      dispatch(setMessagingAvailable(false));
    };
  }, [dispatch]);

  // Sync conversations to Redux
  useEffect(() => {
    dispatch(setConversations(conversations));
  }, [conversations, dispatch]);

  useEffect(() => {
    dispatch(setLoading(isLoading));
  }, [isLoading, dispatch]);

  useEffect(() => {
    dispatch(setError(error));
  }, [error, dispatch]);

  // This component doesn't render anything
  return null;
}

export default MessagingInitializer;
