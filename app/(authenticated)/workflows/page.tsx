import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { WorkflowsGrid } from '@/features/workflows/components/WorkflowsGrid';

export default function WorkflowsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Build and manage your automated workflows
          </p>
        </div>
        
        <Link href="/workflows/new">
          <Button size="lg" className="gap-2">
            <Plus className="w-4 h-4" />
            New Workflow
          </Button>
        </Link>
      </div>

      {/* Workflows Grid */}
      <WorkflowsGrid />
    </div>
  );
}
