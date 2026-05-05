"use client";

interface TitleBarProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function TitleBar({ onClose, onMinimize, onMaximize }: TitleBarProps) {
  return (
    <div className="relative flex h-7 shrink-0 select-none items-center border-b border-border bg-muted px-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="h-3 w-3 rounded-full bg-[#ff5f57] hover:brightness-110"
        />
        <button
          type="button"
          aria-label="Minimize"
          onClick={onMinimize}
          className="h-3 w-3 rounded-full bg-[#febc2e] hover:brightness-110"
        />
        <button
          type="button"
          aria-label="Maximize"
          onClick={onMaximize}
          className="h-3 w-3 rounded-full bg-[#28c840] hover:brightness-110"
        />
      </div>
    </div>
  );
}
