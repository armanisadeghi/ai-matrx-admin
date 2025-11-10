'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Code, Settings, Sparkles, Plus, X, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';

interface CreatePromptAppFormProps {
  prompts: Array<{
    id: string;
    name: string;
    description?: string;
    variable_defaults?: Array<{ name: string; defaultValue: string }>;
    settings?: Record<string, any>;
  }>;
  categories: Array<{
    id: string;
    name: string;
    description?: string;
    icon?: string;
  }>;
  /** Pre-select a specific prompt */
  preselectedPromptId?: string;
  /** Callback when app is successfully created */
  onSuccess?: () => void;
}

const DEFAULT_ALLOWED_IMPORTS = [
  'react',
  'lucide-react',
  '@/components/ui/button',
  '@/components/ui/input',
  '@/components/ui/textarea',
  '@/components/ui/card',
  '@/components/ui/label',
  '@/components/ui/select',
  '@/components/ui/slider',
];

export function CreatePromptAppForm({ prompts, categories, preselectedPromptId, onSuccess }: CreatePromptAppFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Form state
  const [promptId, setPromptId] = useState(preselectedPromptId || '');
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [componentCode, setComponentCode] = useState('');
  const [variableSchema, setVariableSchema] = useState<string>('[]');
  const [allowedImports, setAllowedImports] = useState<string[]>(DEFAULT_ALLOWED_IMPORTS);
  const [rateLimitPerIp, setRateLimitPerIp] = useState(5);
  const [rateLimitWindowHours, setRateLimitWindowHours] = useState(24);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Selected prompt details
  const selectedPrompt = prompts.find(p => p.id === promptId);

  // Auto-populate from preselected prompt
  useEffect(() => {
    if (preselectedPromptId && prompts.length > 0) {
      handlePromptSelect(preselectedPromptId);
    }
  }, [preselectedPromptId, prompts]);
  
  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug) {
      const autoSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
      setSlug(autoSlug);
    }
  };
  
  // Add tag
  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };
  
  // Remove tag
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  // Add import
  const handleAddImport = (importPath: string) => {
    if (importPath && !allowedImports.includes(importPath)) {
      setAllowedImports([...allowedImports, importPath]);
    }
  };
  
  // Remove import
  const handleRemoveImport = (importPath: string) => {
    setAllowedImports(allowedImports.filter(i => i !== importPath));
  };
  
  // Auto-populate variable schema from selected prompt
  const handlePromptSelect = (id: string) => {
    setPromptId(id);
    const prompt = prompts.find(p => p.id === id);
    if (prompt?.variable_defaults) {
      const schema = prompt.variable_defaults.map(v => ({
        name: v.name,
        type: 'string',
        required: true,
        default: v.defaultValue
      }));
      setVariableSchema(JSON.stringify(schema, null, 2));
    }
  };
  
  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    // Validation
    if (!promptId) {
      setError('Please select a prompt');
      return;
    }
    if (!slug.match(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/) || slug.length < 3) {
      setError('Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only');
      return;
    }
    if (!componentCode.trim()) {
      setError('Component code is required');
      return;
    }
    
    // Parse variable schema
    let parsedSchema;
    try {
      parsedSchema = JSON.parse(variableSchema);
      if (!Array.isArray(parsedSchema)) {
        throw new Error('Variable schema must be an array');
      }
    } catch (err) {
      setError('Invalid variable schema JSON: ' + (err instanceof Error ? err.message : 'Unknown error'));
      return;
    }
    
    startTransition(async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('You must be logged in to create an app');
        }

        const { data, error: insertError } = await supabase
          .from('prompt_apps')
          .insert({
            user_id: user.id, // REQUIRED for RLS policy
            prompt_id: promptId,
            slug,
            name,
            tagline: tagline || null,
            description: description || null,
            category: category || null,
            tags,
            component_code: componentCode,
            component_language: 'tsx', // TypeScript + JSX for React components
            variable_schema: parsedSchema,
            allowed_imports: allowedImports,
            rate_limit_per_ip: rateLimitPerIp,
            rate_limit_window_hours: rateLimitWindowHours,
            status: 'draft', // Start as draft
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Supabase insert error:', insertError);
          throw new Error(insertError.message || insertError.hint || 'Database insert failed');
        }
        
        if (!data) {
          throw new Error('No data returned from database');
        }
        
        setSuccess(true);
        
        // Call onSuccess callback if provided, otherwise redirect
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        } else {
          // Redirect after brief delay
          setTimeout(() => {
            router.push(`/prompt-apps/${data.id}`);
          }, 1500);
        }
        
      } catch (err) {
        console.error('Error creating app:', err);
        const errorMessage = err instanceof Error ? err.message : 
                            (typeof err === 'object' && err !== null && 'message' in err) ? 
                            String(err.message) : 
                            'Failed to create app';
        setError(errorMessage);
      }
    });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success Message */}
      {success && (
        <Card className="border-success bg-success/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-success">
              <CheckCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold">App Created Successfully!</p>
                <p className="text-sm">Redirecting to app editor...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Error Message */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive font-semibold">{error}</p>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">
            <Settings className="w-4 h-4 mr-2" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="code">
            <Code className="w-4 h-4 mr-2" />
            Component Code
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Sparkles className="w-4 h-4 mr-2" />
            Advanced
          </TabsTrigger>
        </TabsList>
        
        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>App Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prompt Selection */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Select Prompt *</Label>
                <Select value={promptId} onValueChange={handlePromptSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a prompt..." />
                  </SelectTrigger>
                  <SelectContent>
                    {prompts.map(prompt => (
                      <SelectItem key={prompt.id} value={prompt.id}>
                        {prompt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPrompt && (
                  <p className="text-sm text-muted-foreground">
                    {selectedPrompt.description || 'No description'}
                  </p>
                )}
              </div>
              
              <Separator />
              
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">App Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Story Generator"
                  required
                />
              </div>
              
              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">aimatrx.com/p/</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    placeholder="story-generator"
                    minLength={3}
                    maxLength={50}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  3-50 characters, lowercase, numbers, and hyphens only
                </p>
              </div>
              
              {/* Tagline */}
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Short description (1-2 sentences)"
                  maxLength={150}
                />
              </div>
              
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (supports markdown)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Full description of your app..."
                  rows={4}
                />
              </div>
              
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add tag and press Enter"
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Component Code Tab */}
        <TabsContent value="code" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>React Component Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="component">Component Code (JSX/TSX) *</Label>
                <Textarea
                  id="component"
                  value={componentCode}
                  onChange={(e) => setComponentCode(e.target.value)}
                  placeholder="export default function MyApp({ onExecute, response, ... }) { ... }"
                  rows={20}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Paste your complete React component code here. Must export default function.
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="variables">Variable Schema (JSON) *</Label>
                <Textarea
                  id="variables"
                  value={variableSchema}
                  onChange={(e) => setVariableSchema(e.target.value)}
                  placeholder='[{"name": "topic", "type": "string", "required": true}]'
                  rows={8}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  JSON array defining variables your UI will provide to the prompt
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Allowed Imports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {allowedImports.map(imp => (
                  <Badge key={imp} variant="outline">
                    <Code className="w-3 h-3 mr-1" />
                    {imp}
                    <button
                      type="button"
                      onClick={() => handleRemoveImport(imp)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                These imports are allowed in your component for security
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rateLimit">Executions per IP</Label>
                  <Input
                    id="rateLimit"
                    type="number"
                    value={rateLimitPerIp}
                    onChange={(e) => setRateLimitPerIp(parseInt(e.target.value))}
                    min={1}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Free uses for anonymous users
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="window">Window (hours)</Label>
                  <Input
                    id="window"
                    type="number"
                    value={rateLimitWindowHours}
                    onChange={(e) => setRateLimitWindowHours(parseInt(e.target.value))}
                    min={1}
                    max={168}
                  />
                  <p className="text-xs text-muted-foreground">
                    Reset period in hours
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Submit Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || success}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {success ? 'Created!' : 'Create App (Draft)'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

