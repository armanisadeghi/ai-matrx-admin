'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, AlertCircle, CheckCircle, Sparkles, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { 
    getAllCategories, 
    getCategoryById, 
    validatePromptVariables,
    getCategoryVariableDescription,
    type SystemPromptCategory 
} from '@/types/system-prompt-categories';

interface ConvertToSystemPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    promptId: string;
    promptName: string;
    promptDescription?: string;
}

interface PromptDiff {
    hasChanges: boolean;
    oldVersion?: any;
    newVersion?: any;
    differences?: string[];
}

export function ConvertToSystemPromptModal({
    isOpen,
    onClose,
    promptId,
    promptName,
    promptDescription = '',
}: ConvertToSystemPromptModalProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingExisting, setIsCheckingExisting] = useState(false);
    const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
    const [existingSystemPrompt, setExistingSystemPrompt] = useState<any>(null);
    const [diff, setDiff] = useState<PromptDiff | null>(null);
    
    // Prompt data
    const [promptVariables, setPromptVariables] = useState<string[]>([]);
    
    // Form state
    const [name, setName] = useState(promptName);
    const [description, setDescription] = useState(promptDescription);
    const [categoryId, setCategoryId] = useState<string>('content-expander');
    const [systemPromptId, setSystemPromptId] = useState('');
    
    const categories = getAllCategories();
    const selectedCategory = getCategoryById(categoryId);
    const validation = selectedCategory ? validatePromptVariables(promptVariables, selectedCategory) : null;

    // Generate kebab-case ID from name
    const generateSystemPromptId = (inputName: string): string => {
        return inputName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    // Update system_prompt_id when name changes
    useEffect(() => {
        if (name) {
            setSystemPromptId(generateSystemPromptId(name));
        }
    }, [name]);

    // Load prompt data and check for existing when modal opens
    useEffect(() => {
        if (isOpen) {
            loadPromptData();
            checkForExistingSystemPrompt();
        }
    }, [isOpen, promptId]);
    
    const loadPromptData = async () => {
        setIsLoadingPrompt(true);
        try {
            const { data: prompt, error } = await supabase
                .from('prompts')
                .select('messages')
                .eq('id', promptId)
                .single();
            
            if (error || !prompt) {
                toast.error('Failed to load prompt details');
                return;
            }
            
            // Extract variables from messages
            const variableRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
            const variables = new Set<string>();
            
            prompt.messages?.forEach((msg: any) => {
                if (msg.content) {
                    let match;
                    while ((match = variableRegex.exec(msg.content)) !== null) {
                        variables.add(match[1]);
                    }
                }
            });
            
            setPromptVariables(Array.from(variables));
        } catch (error) {
            console.error('Error loading prompt:', error);
            toast.error('Error loading prompt details');
        } finally {
            setIsLoadingPrompt(false);
        }
    };

    const checkForExistingSystemPrompt = async () => {
        setIsCheckingExisting(true);
        try {
            const generatedId = generateSystemPromptId(promptName);
            const response = await fetch(`/api/system-prompts?system_prompt_id=${generatedId}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.system_prompts && data.system_prompts.length > 0) {
                    const existing = data.system_prompts[0];
                    setExistingSystemPrompt(existing);
                    
                    // Fetch the current prompt to compare
                    const promptResponse = await fetch(`/api/prompts/${promptId}`);
                    if (promptResponse.ok) {
                        const currentPrompt = await promptResponse.json();
                        setDiff({
                            hasChanges: true,
                            oldVersion: existing.prompt_snapshot,
                            newVersion: currentPrompt,
                            differences: calculateDifferences(existing.prompt_snapshot, currentPrompt)
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error checking for existing system prompt:', error);
        } finally {
            setIsCheckingExisting(false);
        }
    };

    const calculateDifferences = (oldPrompt: any, newPrompt: any): string[] => {
        const differences: string[] = [];
        
        // Compare messages
        if (JSON.stringify(oldPrompt?.messages) !== JSON.stringify(newPrompt?.messages)) {
            differences.push('Messages content has changed');
        }
        
        // Compare settings
        if (JSON.stringify(oldPrompt?.settings) !== JSON.stringify(newPrompt?.settings)) {
            differences.push('Settings have changed');
        }
        
        // Compare variables
        if (JSON.stringify(oldPrompt?.variables) !== JSON.stringify(newPrompt?.variables)) {
            differences.push('Variables have changed');
        }
        
        return differences;
    };

    const handleConvert = async () => {
        if (!name.trim()) {
            toast.error('Please enter a name for the system prompt');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`/api/prompts/${promptId}/convert-to-system-prompt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    system_prompt_id: systemPromptId,
                    category: categoryId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                const errorMessage = errorData.details
                    ? `${errorData.error}: ${errorData.details}`
                    : errorData.error || `Failed to convert (${response.status})`;
                throw new Error(errorMessage);
            }

            const data = await response.json();
            toast.success(`Successfully converted "${name}" to a system prompt!`);
            
            // Close modal and redirect to admin page
            onClose();
            router.push(`/administration/system-prompts?highlight=${data.system_prompt.id}`);
        } catch (error) {
            console.error('Error converting prompt:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to convert prompt to system prompt. Please try again.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!existingSystemPrompt) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/system-prompts/${existingSystemPrompt.id}/publish-update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt_id: promptId,
                    update_notes: 'Updated from source prompt',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to update system prompt');
            }

            toast.success('Successfully updated system prompt!');
            onClose();
            router.refresh();
        } catch (error) {
            console.error('Error updating system prompt:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update system prompt';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const renderNewPromptForm = () => (
        <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                    This will create a new global system prompt that can be used throughout the application.
                </AlertDescription>
            </Alert>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">System Prompt Name</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter a descriptive name"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="system-prompt-id">System Prompt ID (Auto-generated)</Label>
                    <Input
                        id="system-prompt-id"
                        value={systemPromptId}
                        onChange={(e) => setSystemPromptId(e.target.value)}
                        placeholder="kebab-case-id"
                    />
                    <p className="text-xs text-muted-foreground">
                        This ID will be used to reference the prompt programmatically
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what this prompt does"
                        rows={3}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="category">Prompt Category</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger id="category">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedCategory && (
                        <p className="text-xs text-muted-foreground">
                            {selectedCategory.description}
                        </p>
                    )}
                </div>

                {/* Variable Validation */}
                {selectedCategory && validation && (
                    <Card className={cn(
                        "p-4",
                        validation.valid ? "bg-green-50 border-green-200 dark:bg-green-950/30" : "bg-orange-50 border-orange-200 dark:bg-orange-950/30"
                    )}>
                        <div className="space-y-3">
                            <div className="flex items-start gap-2">
                                {validation.valid ? (
                                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                    <div className="font-semibold text-sm mb-1">
                                        {validation.valid ? 'Variables Match!' : 'Variable Mismatch'}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {getCategoryVariableDescription(selectedCategory)}
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2 text-xs">
                                <div>
                                    <div className="font-semibold mb-1">Prompt Variables:</div>
                                    <div className="flex flex-wrap gap-1">
                                        {promptVariables.length > 0 ? (
                                            promptVariables.map(v => (
                                                <Badge key={v} variant="secondary" className="text-xs">
                                                    {'{{'}{v}{'}}'}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-muted-foreground">None</span>
                                        )}
                                    </div>
                                </div>

                                {validation.missing.length > 0 && (
                                    <div>
                                        <div className="font-semibold text-orange-600 mb-1">Missing Required:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {validation.missing.map(v => (
                                                <Badge key={v} variant="destructive" className="text-xs">
                                                    {'{{'}{v}{'}}'}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {validation.extra.length > 0 && (
                                    <div>
                                        <div className="font-semibold text-orange-600 mb-1">Unexpected Variables:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {validation.extra.map(v => (
                                                <Badge key={v} variant="outline" className="text-xs border-orange-400">
                                                    {'{{'}{v}{'}}'}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!validation.valid && selectedCategory.id !== 'custom' && (
                                <Alert className="border-orange-300 bg-orange-100 dark:bg-orange-950/50">
                                    <Info className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                        This prompt's variables don't match the category requirements. 
                                        Either modify your prompt or select the "Custom" category.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );

    const renderExistingPromptDiff = () => (
        <div className="space-y-4">
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/30">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-900 dark:text-orange-100">
                    <strong>Warning:</strong> A system prompt with this ID already exists. 
                    Updating it will immediately affect all places where it's used.
                </AlertDescription>
            </Alert>

            <Card className="p-4 bg-muted/50">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-semibold">{existingSystemPrompt?.name}</div>
                            <div className="text-sm text-muted-foreground">
                                Version {existingSystemPrompt?.version}
                            </div>
                        </div>
                        <Badge variant={existingSystemPrompt?.is_active ? 'default' : 'secondary'}>
                            {existingSystemPrompt?.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                    
                    <Separator />
                    
                    {diff && diff.differences && diff.differences.length > 0 ? (
                        <div>
                            <div className="text-sm font-semibold mb-2">Detected Changes:</div>
                            <ul className="space-y-1">
                                {diff.differences.map((change, index) => (
                                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                        <span className="text-orange-500">•</span>
                                        <span>{change}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            No significant changes detected
                        </div>
                    )}
                </div>
            </Card>

            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
                <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                    After updating, you'll be redirected to the admin interface where you can configure 
                    placement, display settings, and other options.
                </AlertDescription>
            </Alert>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle>
                                {existingSystemPrompt ? 'Update System Prompt' : 'Convert to System Prompt'}
                            </DialogTitle>
                            <DialogDescription>
                                {existingSystemPrompt 
                                    ? 'Review changes and update the existing system prompt'
                                    : 'Configure and create a new global system prompt'
                                }
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

        {isCheckingExisting || isLoadingPrompt ? (
            <div className="flex items-center justify-center py-8">
                <div className="text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                        {isLoadingPrompt ? 'Loading prompt details...' : 'Checking for existing system prompt...'}
                    </p>
                </div>
            </div>
        ) : (
            <>
                {existingSystemPrompt ? renderExistingPromptDiff() : renderNewPromptForm()}
            </>
        )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    {existingSystemPrompt ? (
                        <Button 
                            onClick={handleUpdate} 
                            disabled={isLoading || isCheckingExisting}
                            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update System Prompt
                        </Button>
                    ) : (
                    <Button 
                        onClick={handleConvert} 
                        disabled={isLoading || isCheckingExisting || !name.trim() || (validation && !validation.valid)}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create System Prompt
                    </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

