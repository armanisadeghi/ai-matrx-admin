import { useState, useEffect, useCallback, useRef } from 'react';
import type { QuizState } from '@/components/mardown-display/blocks/quiz/quiz-types';
import {
  createQuizSession,
  updateQuizSession,
  getQuizSession,
  type QuizSession
} from '@/actions/quiz.actions';

export type QuizPersistenceOptions = {
  autoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
  sessionId?: string; // If provided, loads existing session
  contentHash?: string; // Quiz content hash for duplicate detection
  metadata?: Record<string, any>; // Quiz metadata (title, category, etc)
};

export function useQuizPersistence(
  quizState: QuizState,
  options: QuizPersistenceOptions = {}
) {
  const {
    autoSave = true,
    autoSaveInterval = 10000, // 10 seconds default
    sessionId: initialSessionId,
    contentHash,
    metadata
  } = options;

  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!initialSessionId);
  const [loadedSession, setLoadedSession] = useState<QuizSession | null>(null);

  const lastSaveAttempt = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Save the current quiz state to database
   */
  const saveQuizState = useCallback(async (state: QuizState, title?: string) => {
    // Prevent rapid-fire saves
    const now = Date.now();
    if (now - lastSaveAttempt.current < 1000) {
      return;
    }
    lastSaveAttempt.current = now;

    setIsSaving(true);
    setSaveError(null);

    try {
      if (sessionId) {
        // Update existing session
        const result = await updateQuizSession(sessionId, state);
        if (result.success) {
          setLastSaved(new Date());
        } else {
          setSaveError(result.error || 'Failed to save quiz');
        }
      } else {
        // Create new session (with duplicate detection via content hash)
        const result = await createQuizSession(state, title, contentHash, metadata);
        if (result.success && result.data) {
          setSessionId(result.data.id);
          setLastSaved(new Date());
          
          // Update the quizId in the state to match the database ID
          state.quizId = result.data.id;
          
          // If this was an existing session, load its state
          if (result.existingSession) {
            setLoadedSession(result.existingSession);
          }
        } else {
          setSaveError(result.error || 'Failed to create quiz session');
        }
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
      setSaveError('Unexpected error saving quiz');
    } finally {
      setIsSaving(false);
    }
  }, [sessionId, contentHash, metadata]);

  /**
   * Load a quiz session from database
   */
  const loadQuizSession = useCallback(async (id: string) => {
    setIsLoading(true);
    setSaveError(null);

    try {
      const result = await getQuizSession(id);
      if (result.success && result.data) {
        setLoadedSession(result.data);
        setSessionId(result.data.id);
        return result.data;
      } else {
        setSaveError(result.error || 'Failed to load quiz session');
        return null;
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      setSaveError('Unexpected error loading quiz');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Manual save trigger
   */
  const saveNow = useCallback(() => {
    saveQuizState(quizState);
  }, [quizState, saveQuizState]);

  /**
   * Auto-save effect
   */
  useEffect(() => {
    if (!autoSave) return;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule next auto-save
    saveTimeoutRef.current = setTimeout(() => {
      saveQuizState(quizState);
    }, autoSaveInterval);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [quizState, autoSave, autoSaveInterval, saveQuizState]);

  /**
   * Save on completion
   */
  useEffect(() => {
    if (quizState.results) {
      // Quiz completed - save immediately
      saveQuizState(quizState);
    }
  }, [quizState.results, saveQuizState]);

  /**
   * Load initial session if provided
   */
  useEffect(() => {
    if (initialSessionId && !loadedSession) {
      loadQuizSession(initialSessionId);
    }
  }, [initialSessionId, loadedSession, loadQuizSession]);

  return {
    sessionId,
    isSaving,
    lastSaved,
    saveError,
    isLoading,
    loadedSession,
    saveNow,
    loadQuizSession
  };
}

