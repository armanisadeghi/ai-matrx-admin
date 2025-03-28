import React, { useRef, useEffect } from "react";
import { Database, BookText, FileText, Briefcase } from "lucide-react";

interface MessageOptionsMenuProps {
  content: string;
  onClose: () => void;
}

const MessageOptionsMenu: React.FC<MessageOptionsMenuProps> = ({ content, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const menuOptions = [
    { icon: <Database size={16} />, label: "Save to data", action: () => console.log("Save to data") },
    { icon: <Briefcase size={16} />, label: "Convert to broker", action: () => console.log("Convert to broker") },
    { icon: <BookText size={16} />, label: "Add to docs", action: () => console.log("Add to docs") },
    { icon: <FileText size={16} />, label: "Save as file", action: () => console.log("Save as file") }
  ];

  return (
    <div 
      ref={menuRef}
      className="absolute left-0 bottom-8 z-10 bg-white dark:bg-zinc-800 shadow-lg rounded-md min-w-48 py-1 border border-zinc-200 dark:border-zinc-700"
    >
      {menuOptions.map((option, index) => (
        <button
          key={index}
          className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          onClick={() => {
            option.action();
            onClose();
          }}
        >
          <span className="mr-2">{option.icon}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default MessageOptionsMenu;