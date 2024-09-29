import dynamic from 'next/dynamic';

const RemirrorEditor = dynamic(() => import('./components/RemirrorEditor'), { ssr: false });
const MarkdownDualDisplay = dynamic(() => import('./components/MarkdownDualDisplay'), { ssr: false });

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">Remirror Editor</h1>
      <RemirrorEditor />
      <h2 className="text-3xl font-bold mt-12 mb-8">Markdown Dual Display</h2>
      <MarkdownDualDisplay />
    </main>
  );
}