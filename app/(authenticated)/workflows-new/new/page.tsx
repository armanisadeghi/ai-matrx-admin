"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Workflow } from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { selectUser } from '@/lib/redux/selectors/userSelectors';
import { createWorkflow } from '@/lib/redux/workflow/thunks';

export default function NewWorkflowPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectUser);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submissions
    if (isSubmitting || loading) {
      return;
    }
    
    setIsSubmitting(true);
    setLoading(true);
    
    if (!currentUser?.id) {
      console.error('No user found');
      setIsSubmitting(false);
      setLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      setIsSubmitting(false);
      setLoading(false);
      return;
    }

    try {
      const newWorkflowData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        workflow_type: 'workflow',
        inputs: [],
        outputs: [],
        dependencies: [],
        sources: [],
        destinations: [],
        actions: null,
        category: null,
        tags: null,
        is_active: true,
        is_deleted: false,
        auto_execute: false,
        metadata: {
          created_by: currentUser.id,
          created_at: new Date().toISOString()
        },
        viewport: { x: 0, y: 0, zoom: 1 },
        is_public: false,
        authenticated_read: true,
        public_read: false,
        user_id: currentUser.id,
      };

      const result = await dispatch(createWorkflow(newWorkflowData));
      
      if (result.payload && typeof result.payload === 'object' && 'id' in result.payload) {
        // Navigate to the new workflow - keep loading states active during navigation
        router.push(`/workflows-new/${result.payload.id}`);
      } else {
        // Reset loading states if creation failed but no error was thrown
        setIsSubmitting(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to create workflow:', error);
      // You might want to show a toast or error message here
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/workflows-new">
          <Button 
            variant="outline" 
            size="sm"
            className="border-blue-200 dark:border-blue-800 hover:border-primary/20 dark:hover:border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Workflow</h1>
          <p className="text-muted-foreground mt-1">
            Start building your automated workflow
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Workflow className="w-5 h-5 text-primary" />
            </div>
            <CardTitle>Workflow Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter workflow name..."
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                disabled={isSubmitting || loading}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this workflow does..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isSubmitting || loading}
                rows={3}
                className="w-full resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button
                type="submit"
                disabled={!formData.name.trim() || isSubmitting || loading}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/70 border border-primary hover:border-primary/90 transition-all duration-200"
              >
                {isSubmitting && !loading ? (
                  <LoadingSpinner variant="minimal" size="sm" message="Creating..." showMessage={true} />
                ) : loading ? (
                  <LoadingSpinner variant="dots" size="sm" message="Loading workflow..." showMessage={true} />
                ) : (
                  'Create Workflow'
                )}
              </Button>
              
              <Link href="/workflows-new">
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isSubmitting || loading}
                  className="border-blue-200 dark:border-blue-800 hover:border-primary/20 dark:hover:border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                >
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}