'use client';

import TreeRoot from './components/TreeRoot';
import WorkflowBuilder from './components/WorkflowBuilder';

export default function Home() {
  return (
    <main className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-4">Tree Structure</h2>
        <TreeRoot />
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-4">Workflow Builder</h2>
        <WorkflowBuilder />
      </section>
    </main>
  );
}