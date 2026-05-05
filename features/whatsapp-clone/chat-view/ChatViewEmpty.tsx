import { Lock } from "lucide-react";

export function ChatViewEmpty() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-6 bg-muted/40 px-8 text-center">
      <div className="flex h-44 w-44 items-center justify-center rounded-full bg-muted">
        <svg
          viewBox="0 0 64 64"
          className="h-20 w-20 text-muted-foreground/40"
          fill="currentColor"
          aria-hidden
        >
          <path d="M32 6c-9.94 0-18 8.06-18 18 0 4.18 1.42 8.03 3.81 11.09L14 50l15.27-3.6c.88.13 1.78.2 2.73.2 9.94 0 18-8.06 18-18S41.94 6 32 6zm0 32c-2.6 0-5.04-.66-7.17-1.81l-.5-.27-7.04 1.66 1.7-6.86-.34-.55C17.57 28.13 17 26.13 17 24c0-8.27 6.73-15 15-15s15 6.73 15 15-6.73 14-15 14z" />
        </svg>
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-light text-foreground">
          AI Matrx Messenger
        </h2>
        <p className="max-w-md text-[14px] leading-relaxed text-muted-foreground">
          Send and receive messages without keeping your browser online. Use AI
          Matrx Messenger on up to four linked devices and one phone at the
          same time.
        </p>
      </div>
      <div className="absolute bottom-8 flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Lock className="h-3 w-3" aria-hidden />
        Your personal messages are end-to-end encrypted
      </div>
    </div>
  );
}
