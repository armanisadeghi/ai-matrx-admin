import { PromptBuiltinsManager } from '@/features/prompt-builtins/admin/PromptBuiltinsManager';

export default function PromptBuiltinsPage() {
  return (
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
      <PromptBuiltinsManager />
    </div>
  );
}

