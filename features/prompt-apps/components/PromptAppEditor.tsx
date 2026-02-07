'use client';

import { useState, useEffect, lazy, Suspense, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ExternalLink, Eye, Trash2, ArrowLeft, Save, Play, Code2, Sparkles, Loader2, TrendingUp, Users, Activity, Clock, BarChart3, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client';
import { toast } from '@/lib/toast-service';
import { AICodeEditorModal } from '@/features/code-editor/components/AICodeEditorModal';
import type { PromptApp } from '../types';
import { cn } from '@/lib/utils';

// Lazy-load CodeBlock to avoid circular dependency with Providers
const CodeBlock = lazy(() => import('@/features/code-editor/components/code-block/CodeBlock'));

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
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [promptName, setPromptName] = useState<string | null>(null);

  // Fetch the prompt name for display
  useEffect(() => {
    if (!app.prompt_id) return;
    
    const fetchPromptName = async () => {
      const { data, error } = await supabase
        .from('prompts')
        .select('name')
        .eq('id', app.prompt_id)
        .single();
      
      if (!error && data) {
        setPromptName(data.name);
      }
    };
    
    fetchPromptName();
  }, [app.prompt_id]);

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
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
              <Link href="/prompt-apps">
                <Button variant="ghost" size="icon" className="shrink-0 hover:bg-primary/10 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">{app.name}</h1>
                  <Badge 
                    variant={app.status === 'published' ? 'default' : 'secondary'}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                      app.status === 'published' && "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                    )}
                  >
                    {app.status === 'published' ? '● Published' : '○ Draft'}
                  </Badge>
                </div>
                {app.tagline && (
                  <p className="text-sm md:text-base text-muted-foreground mt-1 line-clamp-2">{app.tagline}</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
              {mode === 'edit' ? (
                <>
                  <Button onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-initial">
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  {app.status === 'published' && (
                    <Link href={`/p/${app.slug}`} target="_blank" className="flex-1 sm:flex-initial">
                      <Button variant="outline" className="w-full">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">View Public</span>
                        <span className="sm:hidden">Public</span>
                      </Button>
                    </Link>
                  )}
                  {app.status === 'published' ? (
                    <Button variant="outline" onClick={handleUnpublish} className="flex-1 sm:flex-initial">
                      Unpublish
                    </Button>
                  ) : (
                    <Button onClick={handlePublish} className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 text-white">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Publish
                    </Button>
                  )}
                  <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} size="icon" className="shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="inline-flex p-1 rounded-lg bg-muted/50 border border-border/50 gap-1">
            <Button
              variant={mode === 'view' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('view')}
              className={cn(
                "transition-all",
                mode === 'view' && "shadow-sm"
              )}
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
            <Button
              variant={mode === 'edit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('edit')}
              disabled={isSaving}
              className={cn(
                "transition-all",
                mode === 'edit' && "shadow-sm"
              )}
            >
              <Code2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant={mode === 'run' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setMode('run');
                setIsIframeLoading(true);
              }}
              className={cn(
                "transition-all",
                mode === 'run' && "shadow-sm"
              )}
            >
              <Play className="w-4 h-4 mr-2" />
              Run
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Runs */}
            <div className="group relative overflow-hidden rounded-lg border bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20 dark:to-background transition-all hover:shadow-md hover:scale-[1.02]">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150" />
              <div className="relative p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-blue-200 dark:border-blue-800">
                    Total
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-foreground mb-0.5">
                  {app.total_executions.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground font-medium">Total Runs</p>
              </div>
            </div>

            {/* Unique Users */}
            <div className="group relative overflow-hidden rounded-lg border bg-gradient-to-br from-purple-50/50 to-background dark:from-purple-950/20 dark:to-background transition-all hover:shadow-md hover:scale-[1.02]">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150" />
              <div className="relative p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-purple-200 dark:border-purple-800">
                    Unique
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-foreground mb-0.5">
                  {app.unique_users_count.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground font-medium">Unique Users</p>
              </div>
            </div>

            {/* Success Rate */}
            <div className="group relative overflow-hidden rounded-lg border bg-gradient-to-br from-green-50/50 to-background dark:from-green-950/20 dark:to-background transition-all hover:shadow-md hover:scale-[1.02]">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150" />
              <div className="relative p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-green-200 dark:border-green-800">
                    Rate
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-foreground mb-0.5">
                  {app.total_executions === 0 ? '—' : `${Math.round((app.success_rate || 0) * 100)}%`}
                </div>
                <p className="text-xs text-muted-foreground font-medium">Success Rate</p>
              </div>
            </div>

            {/* Avg Time */}
            <div className="group relative overflow-hidden rounded-lg border bg-gradient-to-br from-orange-50/50 to-background dark:from-orange-950/20 dark:to-background transition-all hover:shadow-md hover:scale-[1.02]">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150" />
              <div className="relative p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-orange-200 dark:border-orange-800">
                    Avg
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-foreground mb-0.5">
                  {app.avg_execution_time_ms ? `${Math.round(app.avg_execution_time_ms)}ms` : '—'}
                </div>
                <p className="text-xs text-muted-foreground font-medium">Avg Time</p>
              </div>
            </div>
          </div>

          {/* Mode Content */}
          {mode === 'view' && (
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="bg-muted/50 p-1 h-auto">
                <TabsTrigger value="details" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Basic Information
                </TabsTrigger>
                <TabsTrigger value="code" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Component Code
                </TabsTrigger>
                <TabsTrigger value="variables" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Variables
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Additional Configuration
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 animate-in fade-in-50 duration-300">
                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</label>
                        <p className="text-foreground font-medium">{app.name}</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slug</label>
                        <a 
                          href={`https://aimatrx.com/p/${app.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary font-mono text-sm underline decoration-muted-foreground/50 hover:decoration-primary transition-colors block"
                        >
                          aimatrx.com/p/{app.slug}
                        </a>
                      </div>
                    </div>
                    {/* Prompt Info */}
                    {app.prompt_id && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Powered by Prompt</label>
                        <div className="flex items-center gap-2">
                          <Wand2 className="w-4 h-4 text-primary shrink-0" />
                          <Link
                            href={`/ai/prompts/edit-redux/${app.prompt_id}`}
                            className="text-sm font-medium text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary transition-colors"
                          >
                            {promptName || 'Loading prompt...'}
                          </Link>
                          <Link
                            href={`/ai/prompts/edit-redux/${app.prompt_id}`}
                            className="shrink-0"
                          >
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 cursor-pointer hover:bg-primary/10 transition-colors">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Open in Prompt Builder
                            </Badge>
                          </Link>
                        </div>
                      </div>
                    )}
                    {app.description && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                        <p className="text-foreground text-sm whitespace-pre-wrap leading-relaxed">{app.description}</p>
                      </div>
                    )}
                    {app.tags && app.tags.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</label>
                        <div className="flex flex-wrap gap-2">
                          {app.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="rounded-full px-3 py-1">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="code" className="animate-in fade-in-50 duration-300">
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="pb-3 bg-muted/30">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Code2 className="w-5 h-5 text-primary" />
                      Component Code
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
                      <CodeBlock
                        code={app.component_code}
                        language={app.component_language || 'tsx'}
                        showLineNumbers={true}
                        allowEdit={false}
                      />
                    </Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="variables" className="animate-in fade-in-50 duration-300">
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="pb-3 bg-muted/30">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Variable Schema
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
                      <CodeBlock
                        code={JSON.stringify(app.variable_schema, null, 2)}
                        language="json"
                        showLineNumbers={true}
                        allowEdit={false}
                      />
                    </Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 animate-in fade-in-50 duration-300">
                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Rate Limiting</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Executions per IP</label>
                        <p className="text-xl font-bold text-foreground">{app.rate_limit_per_ip}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Window (hours)</label>
                        <p className="text-xl font-bold text-foreground">{app.rate_limit_window_hours}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Authenticated users</label>
                        <p className="text-xl font-bold text-foreground">{app.rate_limit_authenticated}</p>
                        <p className="text-[10px] text-muted-foreground">per window</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Allowed Imports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(app.allowed_imports as string[] || []).map((imp: string) => (
                        <Badge key={imp} variant="outline" className="font-mono text-xs rounded-md px-2.5 py-1">
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
            <div className="space-y-4 animate-in fade-in-50 duration-300">
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="My Awesome App"
                        className="transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Slug <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">aimatrx.com/p/</span>
                        <Input
                          id="slug"
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                          placeholder="my-awesome-app"
                          className="flex-1 font-mono text-sm transition-all focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tagline" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Tagline
                    </Label>
                    <Input
                      id="tagline"
                      value={editTagline}
                      onChange={(e) => setEditTagline(e.target.value)}
                      placeholder="Short description of your app"
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Detailed description of what your app does"
                      rows={4}
                      className="resize-none transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Tags (comma-separated)
                    </Label>
                    <Input
                      id="tags"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="ai, productivity, writing"
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-r from-primary/5 to-transparent">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-primary" />
                    Component Code
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAIEditor(true)}
                    className="ml-auto hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Edit
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
                    <CodeBlock
                      code={editComponentCode}
                      language={app.component_language || 'tsx'}
                      showLineNumbers={true}
                      onCodeChange={(newCode) => setEditComponentCode(newCode)}
                      customBuiltinKeys={['prompt-app-ui-editor']}
                    />
                  </Suspense>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Rate Limiting</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rate_limit_ip" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Executions per IP
                    </Label>
                    <Input
                      id="rate_limit_ip"
                      type="number"
                      value={editRateLimitPerIp}
                      onChange={(e) => setEditRateLimitPerIp(e.target.value)}
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate_limit_window" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Window (hours)
                    </Label>
                    <Input
                      id="rate_limit_window"
                      type="number"
                      value={editRateLimitWindowHours}
                      onChange={(e) => setEditRateLimitWindowHours(e.target.value)}
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate_limit_auth" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Authenticated Users
                    </Label>
                    <Input
                      id="rate_limit_auth"
                      type="number"
                      value={editRateLimitAuthenticated}
                      onChange={(e) => setEditRateLimitAuthenticated(e.target.value)}
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {mode === 'run' && (
            <Card className="border-border/50 shadow-sm animate-in fade-in-50 duration-300">
              <CardHeader className="pb-3 bg-gradient-to-r from-green-500/5 to-transparent">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Play className="w-5 h-5 text-green-600 dark:text-green-400" />
                  Preview App
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="border rounded-lg overflow-hidden bg-background shadow-inner relative">
                  {isIframeLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground font-medium">Loading preview...</p>
                      </div>
                    </div>
                  )}
                  <iframe
                    src={`/preview/${app.id}`}
                    className="w-full h-[600px] border-0"
                    title="App Preview"
                    onLoad={() => setIsIframeLoading(false)}
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
        promptKey="prompt-app-ui-editor"
        onCodeChange={(newCode) => setEditComponentCode(newCode)}
        title="AI Code Editor"
        allowPromptSelection={true}
      />
    </div>
  );
}

