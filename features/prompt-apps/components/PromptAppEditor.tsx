'use client';

import { useState, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ExternalLink, Eye, Trash2, ArrowLeft, Save, Play, Code2, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client';
import { toast } from '@/lib/toast-service';
import { AICodeEditorModal } from '@/components/code-editor/AICodeEditorModal';
import type { PromptApp } from '../types';

// Lazy-load CodeBlock to avoid circular dependency with Providers
const CodeBlock = lazy(() => import('@/components/mardown-display/code/CodeBlock'));

interface PromptAppEditorProps {
  app: PromptApp;
}

type EditorMode = 'view' | 'edit' | 'run';

export function PromptAppEditor({ app: initialApp }: PromptAppEditorProps) {
  const router = useRouter();
  
  const [app, setApp] = useState(initialApp);
  const [mode, setMode] = useState<EditorMode>('view');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAIEditor, setShowAIEditor] = useState(false);
  
  // Editable fields
  const [editName, setEditName] = useState(app.name);
  const [editSlug, setEditSlug] = useState(app.slug);
  const [editTagline, setEditTagline] = useState(app.tagline || '');
  const [editDescription, setEditDescription] = useState(app.description || '');
  const [editComponentCode, setEditComponentCode] = useState(app.component_code);
  const [editTags, setEditTags] = useState(app.tags.join(', '));
  const [editRateLimitPerIp, setEditRateLimitPerIp] = useState(app.rate_limit_per_ip.toString());
  const [editRateLimitWindowHours, setEditRateLimitWindowHours] = useState(app.rate_limit_window_hours.toString());
  const [editRateLimitAuthenticated, setEditRateLimitAuthenticated] = useState(app.rate_limit_authenticated.toString());

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
      
      const { error } = await supabase
        .from('prompt_apps')
        .update({
          name: editName,
          slug: editSlug,
          tagline: editTagline || null,
          description: editDescription || null,
          component_code: editComponentCode,
          tags: tagsArray,
          rate_limit_per_ip: parseInt(editRateLimitPerIp),
          rate_limit_window_hours: parseInt(editRateLimitWindowHours),
          rate_limit_authenticated: parseInt(editRateLimitAuthenticated),
          updated_at: new Date().toISOString(),
        })
        .eq('id', app.id);

      if (error) {
        toast.error('Failed to save changes: ' + error.message);
        return;
      }

      // Update local state
      const updatedApp = {
        ...app,
        name: editName,
        slug: editSlug,
        tagline: editTagline || undefined,
        description: editDescription || undefined,
        component_code: editComponentCode,
        tags: tagsArray,
        rate_limit_per_ip: parseInt(editRateLimitPerIp),
        rate_limit_window_hours: parseInt(editRateLimitWindowHours),
        rate_limit_authenticated: parseInt(editRateLimitAuthenticated),
      };
      setApp(updatedApp);
      
      toast.success('Changes saved successfully!');
      setMode('view');
      router.refresh();
    } catch (error) {
      toast.error('Failed to save changes');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    const { error } = await supabase
      .from('prompt_apps')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', app.id);

    if (error) {
      toast.error('Failed to publish app');
      return;
    }

    toast.success('App published!');
    setApp({ ...app, status: 'published' });
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
    setApp({ ...app, status: 'draft' });
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

  const handleCancelEdit = () => {
    // Reset all edit fields to current app values
    setEditName(app.name);
    setEditSlug(app.slug);
    setEditTagline(app.tagline || '');
    setEditDescription(app.description || '');
    setEditComponentCode(app.component_code);
    setEditTags(app.tags.join(', '));
    setEditRateLimitPerIp(app.rate_limit_per_ip.toString());
    setEditRateLimitWindowHours(app.rate_limit_window_hours.toString());
    setEditRateLimitAuthenticated(app.rate_limit_authenticated.toString());
    setMode('view');
  };

  return (
    <div className="h-page flex flex-col overflow-hidden bg-textured">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
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
              {mode === 'edit' ? (
                <>
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  {app.status === 'published' && (
                    <Link href={`/p/${app.slug}`} target="_blank">
                      <Button variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Public
                      </Button>
                    </Link>
                  )}
                  {app.status === 'published' ? (
                    <Button variant="outline" onClick={handleUnpublish}>
                      Unpublish
                    </Button>
                  ) : (
                    <Button onClick={handlePublish}>
                      Publish App
                    </Button>
                  )}
                  <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'view' ? 'default' : 'outline'}
              onClick={() => setMode('view')}
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
            <Button
              variant={mode === 'edit' ? 'default' : 'outline'}
              onClick={() => setMode('edit')}
              disabled={isSaving}
            >
              <Code2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant={mode === 'run' ? 'default' : 'outline'}
              onClick={() => setMode('run')}
            >
              <Play className="w-4 h-4 mr-2" />
              Run
            </Button>
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

          {/* Mode Content */}
          {mode === 'view' && (
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
                    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
                      <CodeBlock
                        code={app.component_code}
                        language={app.component_language || 'tsx'}
                        showLineNumbers={true}
                      />
                    </Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="variables">
                <Card>
                  <CardHeader>
                    <CardTitle>Variable Schema</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
                      <CodeBlock
                        code={JSON.stringify(app.variable_schema, null, 2)}
                        language="json"
                        showLineNumbers={true}
                      />
                    </Suspense>
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
          )}

          {mode === 'edit' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="My Awesome App"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">aimatrx.com/p/</span>
                      <Input
                        id="slug"
                        value={editSlug}
                        onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                        placeholder="my-awesome-app"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      value={editTagline}
                      onChange={(e) => setEditTagline(e.target.value)}
                      placeholder="Short description of your app"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Detailed description of what your app does"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="ai, productivity, writing"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>Component Code</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAIEditor(true)}
                    className="ml-auto"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Edit
                  </Button>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
                    <CodeBlock
                      code={editComponentCode}
                      language={app.component_language || 'tsx'}
                      showLineNumbers={true}
                      onCodeChange={(newCode) => setEditComponentCode(newCode)}
                    />
                  </Suspense>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rate Limiting</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rate_limit_ip">Executions per IP</Label>
                    <Input
                      id="rate_limit_ip"
                      type="number"
                      value={editRateLimitPerIp}
                      onChange={(e) => setEditRateLimitPerIp(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate_limit_window">Window (hours)</Label>
                    <Input
                      id="rate_limit_window"
                      type="number"
                      value={editRateLimitWindowHours}
                      onChange={(e) => setEditRateLimitWindowHours(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate_limit_auth">Authenticated Users</Label>
                    <Input
                      id="rate_limit_auth"
                      type="number"
                      value={editRateLimitAuthenticated}
                      onChange={(e) => setEditRateLimitAuthenticated(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {mode === 'run' && (
            <Card>
              <CardHeader>
                <CardTitle>Preview App</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-6 bg-background">
                  <iframe
                    src={`/preview/${app.id}`}
                    className="w-full h-[600px] border-0"
                    title="App Preview"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* AI Code Editor Modal */}
      <AICodeEditorModal
        open={showAIEditor}
        onOpenChange={setShowAIEditor}
        currentCode={editComponentCode}
        language={app.component_language || 'tsx'}
        promptContext="prompt-app-ui"
        onCodeChange={(newCode) => setEditComponentCode(newCode)}
        title="AI Code Editor"
        allowPromptSelection={true}
      />
    </div>
  );
}

