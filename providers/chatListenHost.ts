// providers/chatListenHost.ts
//
// This app's answers to the Summarize & listen window's host seam (@ai-matrx/chat
// window-panels/windows/listen/listen-host): the window lives in the package; the web adds its
// app-root streaming speaker (speak the summary AS it is written) and its audio-session registry
// (the transport controls follow whichever TTS session the window started).

import { configureListenHost, type ListenTransport } from "@ai-matrx/chat/window-panels/windows/listen/listen-host";
import { useAudioSessions } from "@/features/audio/session/useAudioSessions";
import {
  clearVoicePlaybackRequestFor,
  getVoicePlaybackRequest,
  requestVoicePlayback,
  stopVoicePlayback,
} from "@/features/transcript-studio/state/voicePlaybackBus";

/** The TTS sources a listening session can be (the streaming speaker, the queue, chat read-aloud). */
const LISTEN_SOURCES = new Set(["auto-voice", "queue", "chat-tts"]);

function useWebListenTransport(engaged: boolean): ListenTransport {
  const { currentPlayback, control } = useAudioSessions();
  const session = engaged && currentPlayback && LISTEN_SOURCES.has(currentPlayback.source) ? currentPlayback : null;
  const raw = session?.status ?? null;
  const status = raw === "active" || raw === "paused" ? raw : raw === "loading" || raw === "queued" ? "loading" : null;
  return {
    status,
    pause: () => session && control(session.id, "pause"),
    resume: () => session && control(session.id, "resume"),
    stop: () => session && control(session.id, "stop"),
  };
}

configureListenHost({
  streamSpeech: (conversationId) => {
    // includeActive: the run and the read-aloud request are ONE gesture; the app-root speaker
    // speaks this turn even when it mounts after the request already exists.
    requestVoicePlayback({ conversationId, enabled: true, includeActive: true });
    return {
      stop: () => {
        if (getVoicePlaybackRequest().conversationId === conversationId) {
          stopVoicePlayback();
          clearVoicePlaybackRequestFor(conversationId);
        }
      },
    };
  },
  useTransport: useWebListenTransport,
});
