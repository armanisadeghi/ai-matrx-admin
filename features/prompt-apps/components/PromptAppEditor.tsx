'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Edit, Eye, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { toast } from '@/lib/toast-service';
import type { PromptApp } from '../types';

interface PromptAppEditorProps {
  app: PromptApp;
}

export function PromptAppEditor({ app }: PromptAppEditorProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePublish = async () => {
    const { error } = await supabase
      .from('prompt_apps')
      .update({ status: 'published' })
      .eq('id', app.id);

    if (error) {
      toast.error('Failed to publish app');
      return;
    }

    toast.success('App published!');
    router.refresh();
  };

  const handleUnpublish = async () => {
    const { error } = await supabase
      .from('prompt_apps')
      .update({ status: 'draft' })
      .eq('id', app.id);

    if (error) {
      toast.error('Failed to unpublish app');
      return;
    }

    toast.success('App unpublished');
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${app.name}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    const { error } = await supabase
      .from('prompt_apps')
      .delete()
      .eq('id', app.id);

    if (error) {
      toast.error('Failed to delete app');
      setIsDeleting(false);
      return;
    }

    toast.success('App deleted');
    router.push('/prompt-apps');
  };

  return (
    <div className="h-page flex flex-col overflow-hidden bg-textured">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/prompt-apps">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-foreground">{app.name}</h1>
                  <Badge variant={
                    app.status === 'published' ? 'default' :
                    app.status === 'draft' ? 'secondary' :
                    'outline'
                  }>
                    {app.status}
                  </Badge>
                </div>
                {app.tagline && (
                  <p className="text-muted-foreground mt-1">{app.tagline}</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              {/* Test/Preview Button - always available */}
              <Link href={`/preview/${app.id}`} target="_blank">
                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  {app.status === 'published' ? 'Preview' : 'Test App'}
                </Button>
              </Link>
              
              {app.status === 'published' ? (
                <>
                  <Link href={`/p/${app.slug}`} target="_blank">
                    <Button variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Public
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={handleUnpublish}>
                    Unpublish
                  </Button>
                </>
              ) : (
                <Button onClick={handlePublish}>
                  Publish App
                </Button>
              )}
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{app.total_executions}</div>
                <p className="text-xs text-muted-foreground">Total Runs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{app.unique_users_count}</div>
                <p className="text-xs text-muted-foreground">Unique Users</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{Math.round(app.success_rate * 100)}%</div>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{app.avg_execution_time_ms || 0}ms</div>
                <p className="text-xs text-muted-foreground">Avg Time</p>
              </CardContent>
            </Card>
          </div>

          {/* Details Tabs */}
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="code">Component Code</TabsTrigger>
              <TabsTrigger value="variables">Variables</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <p className="text-foreground">{app.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Slug</label>
                    <p className="text-muted-foreground font-mono">aimatrx.com/p/{app.slug}</p>
                  </div>
                  {app.description && (
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <p className="text-foreground whitespace-pre-wrap">{app.description}</p>
                    </div>
                  )}
                  {app.tags && app.tags.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {app.tags.map(tag => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="code">
              <Card>
                <CardHeader>
                  <CardTitle>Component Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm">{app.component_code}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="variables">
              <Card>
                <CardHeader>
                  <CardTitle>Variable Schema</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm">{JSON.stringify(app.variable_schema, null, 2)}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Rate Limiting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <label className="text-sm font-medium">Executions per IP</label>
                    <p className="text-foreground">{app.rate_limit_per_ip}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Window (hours)</label>
                    <p className="text-foreground">{app.rate_limit_window_hours}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Authenticated users</label>
                    <p className="text-foreground">{app.rate_limit_authenticated} per window</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Allowed Imports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(app.allowed_imports as string[] || []).map((imp: string) => (
                      <Badge key={imp} variant="outline" className="font-mono text-xs">
                        {imp}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

