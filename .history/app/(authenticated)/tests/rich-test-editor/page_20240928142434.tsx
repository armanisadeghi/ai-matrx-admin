import dynamic from 'next/dynamic';

const RemirrorEditor = dynamic(() => import('@/components/rich-text-editor/RemirrorEditor'), { ssr: false });

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">Remirror Editor</h1>
      <RemirrorEditor />
    </main>
  );
}