"use client";

interface TitleBarProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function TitleBar({ onClose, onMinimize, onMaximize }: TitleBarProps) {
  return (
    <div className="relative flex h-7 shrink-0 items-center bg-[#202c33] px-3 select-none">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="group h-3 w-3 rounded-full bg-[#ff5f57] hover:brightness-110"
        />
        <button
          type="button"
          aria-label="Minimize"
          onClick={onMinimize}
          className="group h-3 w-3 rounded-full bg-[#febc2e] hover:brightness-110"
        />
        <button
          type="button"
          aria-label="Maximize"
          onClick={onMaximize}
          className="group h-3 w-3 rounded-full bg-[#28c840] hover:brightness-110"
        />
      </div>
    </div>
  );
}
