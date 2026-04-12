Here's the complete implementation guide for the React team.

---

# ElevenLabs Realtime Speech-to-Text: React/Next.js Implementation Guide

## Architecture

```
Browser (React)                         Server (Next.js API Route)
─────────────────                      ──────────────────────────
                                        
1. User clicks "Start"                  
2. fetch("/api/scribe-token") ────────► 3. Server calls ElevenLabs API
                                           POST /v1/single-use-token/realtime_scribe
4. Receives { token: "sutkn_..." } ◄──── Returns single-use token (expires 15 min)
5. useScribe hook opens WebSocket       
   directly to wss://api.elevenlabs.io  
   using the token (no API key exposed)
6. Microphone audio streams to ElevenLabs
7. Partial + committed transcripts stream back
```

The API key **never** touches the client. The single-use token is consumed on first WebSocket connection and can't be reused.

---

## Packages to Install

```bash
# Client-side (React hooks + WebSocket client)
npm install @elevenlabs/react @elevenlabs/client

# Server-side (token generation in API routes)
npm install @elevenlabs/elevenlabs-js
```

Exact versions from ElevenLabs' official example:
- `@elevenlabs/react`: `^0.14.1`
- `@elevenlabs/elevenlabs-js`: `^2.37.0`

---

## File 1: Server-Side Token Endpoint

**`app/api/scribe-token/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs API key not configured" },
      { status: 500 }
    );
  }

  try {
    const elevenlabs = new ElevenLabsClient({ apiKey });

    // Generates a single-use token that expires after 15 minutes
    // Token type must be "realtime_scribe" for STT
    // (The other allowed value is "tts_websocket" for TTS streaming)
    const result = await elevenlabs.tokens.singleUse.create("realtime_scribe");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
```

Add to `.env.local`:
```
ELEVENLABS_API_KEY=your_api_key_here
```

---

## File 2: React Component with `useScribe` Hook

**`app/page.tsx`** (or wherever you need transcription)

```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";

export default function RealtimeTranscription() {
  const [error, setError] = useState<string | null>(null);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [committedHistory, setCommittedHistory] = useState<string[]>([]);

  // ─── Initialize the hook ───
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,      // Auto-commit on silence
    vadSilenceThresholdSecs: 1.5,            // 0.3–3.0
    vadThreshold: 0.4,                       // 0.1–0.9
    // languageCode: "en",                   // Optional: auto-detected if omitted
    // includeTimestamps: true,              // Optional: get word-level timestamps

    onPartialTranscript: (data) => {
      setPartialTranscript(data.text || "");
    },
    onCommittedTranscript: (data) => {
      if (data.text?.trim()) {
        setCommittedHistory((prev) => [data.text, ...prev]);
      }
      setPartialTranscript("");
    },
    onError: (err) => {
      console.error("Scribe error:", err);
      setError("Connection error occurred. Please try again.");
    },
  });

  // ─── Reset partial on disconnect ───
  useEffect(() => {
    if (scribe.status === "disconnected" || scribe.status === "error") {
      setPartialTranscript("");
    }
  }, [scribe.status]);

  const isActive =
    scribe.status === "connected" || scribe.status === "transcribing";
  const isConnecting = scribe.status === "connecting";

  // ─── Start: fetch token from server, then connect ───
  const handleStart = useCallback(async () => {
    try {
      setError(null);
      setPartialTranscript("");

      // 1. Get a single-use token from our API route
      const response = await fetch("/api/scribe-token");
      if (!response.ok) throw new Error("Failed to get transcription token");
      const { token } = await response.json();

      // 2. Connect with the token + microphone config
      await scribe.connect({
        token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      console.error("Failed to start transcription:", err);
      setError("Failed to start. Check mic permissions and try again.");
    }
  }, [scribe]);

  // ─── Stop ───
  const handleStop = useCallback(() => {
    scribe.disconnect();
    setPartialTranscript("");
  }, [scribe]);

  return (
    <div>
      <div>Status: {scribe.status}</div>

      <button onClick={isActive ? handleStop : handleStart} disabled={isConnecting}>
        {isConnecting ? "Connecting..." : isActive ? "Stop" : "Start"}
      </button>

      {/* Live partial transcript */}
      {isActive && (
        <div>
          <strong>Live:</strong> {partialTranscript || "Listening..."}
        </div>
      )}

      {/* Committed transcript history */}
      {committedHistory.map((text, i) => (
        <div key={i}>{text}</div>
      ))}
    </div>
  );
}
```

---

## `useScribe` Hook — Full API Reference

### Options (`ScribeHookOptions`)

| Parameter | Type | Default | Description |
|---|---|---|---|
| `modelId` | `string` | — | `"scribe_v2_realtime"` |
| `token` | `string` | — | Can be passed here or in `connect()` |
| `commitStrategy` | `CommitStrategy` | `MANUAL` | `CommitStrategy.VAD` (auto) or `CommitStrategy.MANUAL` |
| `vadSilenceThresholdSecs` | `number` | `1.5` | 0.3–3.0. Silence before auto-commit |
| `vadThreshold` | `number` | `0.4` | 0.1–0.9. Voice activity sensitivity |
| `minSpeechDurationMs` | `number` | `100` | 50–2000 |
| `minSilenceDurationMs` | `number` | `100` | 50–2000 |
| `languageCode` | `string` | auto | ISO 639-1/3 code |
| `audioFormat` | `AudioFormat` | `PCM_16000` | One of: `PCM_8000`, `PCM_16000`, `PCM_22050`, `PCM_24000`, `PCM_44100`, `PCM_48000`, `ULAW_8000` |
| `sampleRate` | `number` | — | Override sample rate |
| `includeTimestamps` | `boolean` | `false` | Get word-level timestamps in committed transcripts |
| `autoConnect` | `boolean` | `false` | Auto-connect on mount |
| `microphone` | `object` | — | `{ deviceId?, echoCancellation?, noiseSuppression?, autoGainControl?, channelCount? }` |

### Callbacks (passed as options)

| Callback | Data | Description |
|---|---|---|
| `onSessionStarted` | — | WebSocket session established |
| `onPartialTranscript` | `{ text }` | Real-time partial (updates as user speaks) |
| `onCommittedTranscript` | `{ text }` | Finalized segment |
| `onCommittedTranscriptWithTimestamps` | `{ text, words[] }` | Finalized with word-level timing |
| `onError` | `Error \| Event` | Any error |
| `onAuthError` | `{ error }` | Token invalid/expired |
| `onQuotaExceededError` | `{ error }` | Plan quota exceeded |
| `onConnect` | — | Connected |
| `onDisconnect` | — | Disconnected |

### Return Value (`UseScribeReturn`)

| Property | Type | Description |
|---|---|---|
| `status` | `ScribeStatus` | `"disconnected"` \| `"connecting"` \| `"connected"` \| `"transcribing"` \| `"error"` |
| `isConnected` | `boolean` | Shorthand |
| `isTranscribing` | `boolean` | Shorthand |
| `partialTranscript` | `string` | Current partial text |
| `committedTranscripts` | `TranscriptSegment[]` | All committed segments |
| `error` | `string \| null` | Last error message |
| `connect(options?)` | `Promise<void>` | Start session. Pass `{ token, microphone }` here |
| `disconnect()` | `void` | End session |
| `sendAudio(base64, opts?)` | `void` | Manually send audio (if not using mic) |
| `commit()` | `void` | Manually commit (if `MANUAL` strategy) |
| `clearTranscripts()` | `void` | Clear transcript history |
| `getConnection()` | `RealtimeConnection \| null` | Raw WebSocket connection |

---

## Key Implementation Notes for the Team

**Token lifecycle:** Each token is single-use and expires after 15 minutes. Generate a fresh one every time the user clicks "Start." Don't cache or reuse tokens.

**Two commit strategies:** With `CommitStrategy.VAD`, the system auto-detects when the user stops speaking and commits the transcript segment automatically. With `CommitStrategy.MANUAL`, your code must call `scribe.commit()` explicitly (useful for push-to-talk UIs).

**The hook manages the microphone.** When you call `scribe.connect({ token, microphone: {...} })`, the hook handles `getUserMedia`, the AudioContext, PCM encoding, and streaming to the WebSocket. You don't need to manually capture or send audio unless you specifically want to via `sendAudio()`.

**No `@elevenlabs/client` direct import needed** in React components — `@elevenlabs/react` re-exports `CommitStrategy`, `AudioFormat`, and `RealtimeEvents` from it. You only need `@elevenlabs/client` if you're doing something outside of React (like a vanilla JS implementation).

**`@elevenlabs/elevenlabs-js` is server-only.** It's the Node SDK used in API routes for token generation. Never import it in client components.