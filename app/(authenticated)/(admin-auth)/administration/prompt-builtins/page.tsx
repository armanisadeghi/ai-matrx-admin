import { ShortcutsTableManager } from '@/features/prompt-builtins/admin/ShortcutsTableManager';

export default function PromptBuiltinsPage() {
  return (
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
      <ShortcutsTableManager />
    </div>
  );
}

