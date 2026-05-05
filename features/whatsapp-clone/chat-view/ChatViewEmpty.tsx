import { Lock } from "lucide-react";

export function ChatViewEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-[#222e35] px-8 text-center">
      <div className="flex h-44 w-44 items-center justify-center rounded-full bg-[#2a3942]">
        <svg
          viewBox="0 0 64 64"
          className="h-20 w-20 text-[#3b4a54]"
          fill="currentColor"
        >
          <path d="M32 6c-9.94 0-18 8.06-18 18 0 4.18 1.42 8.03 3.81 11.09L14 50l15.27-3.6c.88.13 1.78.2 2.73.2 9.94 0 18-8.06 18-18S41.94 6 32 6zm0 32c-2.6 0-5.04-.66-7.17-1.81l-.5-.27-7.04 1.66 1.7-6.86-.34-.55C17.57 28.13 17 26.13 17 24c0-8.27 6.73-15 15-15s15 6.73 15 15-6.73 14-15 14zM43.43 28.85l-1.86-.35c-.38-.07-.75.06-.93.4-.18.34-.92 1.32-1.13 1.59-.21.27-.4.31-.78.13-2.21-1.12-3.66-2-5.13-4.51-.39-.67.39-.62 1.13-2.06.13-.27.07-.5-.03-.7-.1-.2-.93-2.24-1.27-3.06-.34-.82-.69-.71-.93-.72-.24-.01-.5-.01-.77-.01-.27 0-.7.1-1.07.5-.37.4-1.4 1.37-1.4 3.34 0 1.97 1.43 3.87 1.63 4.14.2.27 2.83 4.32 6.86 6.06 4.03 1.74 4.03 1.16 4.76 1.09.73-.07 2.36-.96 2.69-1.89.33-.93.33-1.73.23-1.89-.1-.16-.37-.25-.74-.42z" />
        </svg>
      </div>
      <div className="space-y-3 text-[#aebac1]">
        <h2 className="text-3xl font-light text-[#e9edef]">
          AI Matrx Messenger
        </h2>
        <p className="max-w-md text-[14px] leading-relaxed">
          Send and receive messages without keeping your browser online. Use AI
          Matrx Messenger on up to four linked devices and one phone at the
          same time.
        </p>
      </div>
      <div className="absolute bottom-8 flex items-center gap-1.5 text-[12px] text-[#8696a0]">
        <Lock className="h-3 w-3" />
        Your personal messages are end-to-end encrypted
      </div>
    </div>
  );
}
