// File Location: app/(authenticated)/tests/rich-text-editor/page.tsx

import dynamic from 'next/dynamic';

const RemirrorEditor = dynamic(() => import('@/components/rich-text-editor/RemirrorEditor'), { ssr: false });
const MarkdownDualDisplay = dynamic(() => import('@/components/rich-text-editor/MarkdownDualDisplay'), { ssr: false });

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col space-y-8 p-4">
      <RemirrorEditor />
      <MarkdownDualDisplay />
    </main>
  );
}