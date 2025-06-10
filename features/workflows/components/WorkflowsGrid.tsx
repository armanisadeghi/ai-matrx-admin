'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Workflow, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchUserWorkflows } from '../service/workflowService';
import { WorkflowCard } from './WorkflowCard';
import { selectUser, selectActiveUserName } from "@/lib/redux/selectors/userSelectors";
import { useAppSelector } from '@/lib/redux';
import { CoreWorkflowData } from '../types';

export function WorkflowsGrid() {
  const [workflows, setWorkflows] = useState<CoreWorkflowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useAppSelector(selectUser);

  useEffect(() => {
    async function loadWorkflows() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchUserWorkflows(user.id);
        setWorkflows(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workflows');
      } finally {
        setLoading(false);
      }
    }

    loadWorkflows();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading workflows...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-md mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Workflow className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No workflows yet</h3>
        <p className="text-muted-foreground mb-6">
          Get started by creating your first workflow
        </p>
        <Link href="/workflows/new">
          <Button variant="outline">
            Create Workflow
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {workflows.map((workflow) => (
        <WorkflowCard key={workflow.id} workflow={workflow} />
      ))}
    </div>
  );
} 