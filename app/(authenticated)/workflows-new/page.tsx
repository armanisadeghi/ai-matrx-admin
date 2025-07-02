"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { WorkflowsList } from '@/features/workflows-xyflow/common/WorkflowsList';
import { selectUserId } from '@/lib/redux/selectors/userSelectors';
import { fetchAll } from '@/lib/redux/workflow/thunks';
import { workflowSelectors } from '@/lib/redux/workflow/selectors';


export default function WorkflowsNewPage() {
  const dispatch = useAppDispatch();
  const workflows = useAppSelector(workflowSelectors.allWorkflowsArray);
  const isLoading = useAppSelector(workflowSelectors.loading);
  const userId = useAppSelector(selectUserId);

  // Load workflows on mount
  React.useEffect(() => {
    if (userId) {
      dispatch(fetchAll(userId));
    }
  }, [dispatch, userId]);

  return (
    <div className="container mx-auto py-4 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Workflows (New System)</h1>
        </div>
        
        <Link href="/workflows-new/new">
          <Button 
            size="lg" 
            variant="outline"
            className="gap-2 border-blue-200 dark:border-blue-800 hover:border-primary/20 dark:hover:border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </Button>
        </Link>
      </div>

      {/* Workflows List */}
      <WorkflowsList 
        workflows={workflows}
        isLoading={isLoading}
      />
    </div>
  );
}
