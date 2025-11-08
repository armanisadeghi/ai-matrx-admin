"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Edit, 
  Play, 
  Eye, 
  Trash2, 
  Calendar,
  User,
  Plus
} from 'lucide-react';
import WorkflowLoading from '@/features/workflows-xyflow/common/workflow-loading';
import { Workflow } from '@/lib/redux/workflow/types';
import { useAppDispatch } from '@/lib/redux/hooks';
import { deleteWorkflow } from '@/lib/redux/workflow/thunks';

interface WorkflowsListProps {
  workflows: Workflow[];
  isLoading: boolean;
}

export const WorkflowsList: React.FC<WorkflowsListProps> = ({ 
  workflows, 
  isLoading 
}) => {
  const dispatch = useAppDispatch();

  const handleDelete = (workflowId: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      dispatch(deleteWorkflow(workflowId));
    }
  };

  if (isLoading) {
    return (
      <WorkflowLoading 
        title="Loading Workflows"
        subtitle="Fetching your workflows from the server..."
        step1="Loading"
        step2="Fetching"
        step3="Ready"
        fullscreen={false}
      />
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No workflows yet</h3>
          <p className="text-sm">Create your first workflow to get started</p>
        </div>
        <Link href="/workflows-new/new">
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {workflows.map((workflow) => (
        <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {workflow.name || 'Untitled Workflow'}
                </h3>
                {workflow.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {workflow.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-1 ml-2">
                {workflow.is_active && (
                  <Badge variant="default" className="bg-green-500 text-white text-xs">
                    Active
                  </Badge>
                )}
                {workflow.workflow_type && (
                  <Badge variant="secondary" className="text-xs">
                    {workflow.workflow_type}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center">
                  <User className="h-3 w-3" />
                  {workflow.user_id || 'Unknown'}
                </div>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3" />
                  {new Date(workflow.updated_at).toLocaleDateString()}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                {workflow.inputs && (
                  <span>{workflow.inputs.length} input{workflow.inputs.length !== 1 ? 's' : ''}</span>
                )}
                {workflow.outputs && (
                  <span>{workflow.outputs.length} output{workflow.outputs.length !== 1 ? 's' : ''}</span>
                )}
                {workflow.category && (
                  <Badge variant="outline" className="text-xs">
                    {workflow.category}
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-2">
                <Link href={`/workflows-new/${workflow.id}`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full">
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                </Link>
                
                <Link href={`/workflows-new/${workflow.id}?mode=view`}>
                  <Button size="sm" variant="outline">
                    <Eye className="h-3 w-3" />
                  </Button>
                </Link>
                
                <Link href={`/workflows-new/${workflow.id}?mode=execute`}>
                  <Button size="sm" variant="outline">
                    <Play className="h-3 w-3" />
                  </Button>
                </Link>
                
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleDelete(workflow.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}; 