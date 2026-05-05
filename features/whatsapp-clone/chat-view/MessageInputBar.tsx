"use client";

import { useState, type KeyboardEvent } from "react";
import { Mic, Send, Smile } from "lucide-react";
import { MessageInputAttachMenu } from "./MessageInputAttachMenu";

interface MessageInputBarProps {
  onSend: (content: string) => void;
  onRecordStart?: () => void;
  onRecordStop?: () => void;
  disabled?: boolean;
}

export function MessageInputBar({
  onSend,
  onRecordStart,
  onRecordStop,
  disabled,
}: MessageInputBarProps) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();

  const submit = () => {
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex shrink-0 items-end gap-1.5 bg-[#202c33] px-3 py-2.5">
      <MessageInputAttachMenu />
      <button
        type="button"
        aria-label="Emoji"
        className="flex h-10 w-10 items-center justify-center rounded-full text-[#aebac1] transition-colors hover:bg-[#374248] hover:text-white"
      >
        <Smile className="h-6 w-6" strokeWidth={1.75} />
      </button>

      <div className="flex min-w-0 flex-1 items-end rounded-lg bg-[#2a3942] px-3 py-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder="Type a message"
          aria-label="Message"
          disabled={disabled}
          className="max-h-32 w-full resize-none bg-transparent text-[15px] leading-5 text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none"
        />
      </div>

      {trimmed ? (
        <button
          type="button"
          onClick={submit}
          aria-label="Send"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#25d366] transition-colors hover:bg-[#374248]"
        >
          <Send className="h-5 w-5 -rotate-12" strokeWidth={2} />
        </button>
      ) : (
        <button
          type="button"
          onPointerDown={onRecordStart}
          onPointerUp={onRecordStop}
          onPointerLeave={onRecordStop}
          aria-label="Record voice message"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#aebac1] transition-colors hover:bg-[#374248] hover:text-white"
        >
          <Mic className="h-5 w-5" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}
