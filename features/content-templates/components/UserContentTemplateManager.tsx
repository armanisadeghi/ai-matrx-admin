'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
    Plus,
    Trash2,
    Edit,
    FileText,
    Search,
    Save,
    X,
    Tag,
    Globe,
    Lock,
    Copy,
    Eye
} from 'lucide-react';
import {
    ContentTemplateDB,
    CreateContentTemplateInput,
    UpdateContentTemplateInput,
    MessageRole
} from '@/features/content-templates/types/content-templates-db';
import {
    fetchContentTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getAllTags,
    clearTemplateCache
} from '@/features/content-templates/services/content-templates-service';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import MatrxMiniLoader from '@/components/loaders/MatrxMiniLoader';
import { createClient } from '@/utils/supabase/client';

interface UserContentTemplateManagerProps {
    className?: string;
}

const MESSAGE_ROLES: { value: MessageRole; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'user', label: 'User' },
    { value: 'assistant', label: 'Assistant' },
    { value: 'tool', label: 'Tool' }
];

export function UserContentTemplateManager({ className }: UserContentTemplateManagerProps) {
    // State
    const [templates, setTemplates] = useState<ContentTemplateDB[]>([]);
    const [myTemplates, setMyTemplates] = useState<ContentTemplateDB[]>([]);
    const [publicTemplates, setPublicTemplates] = useState<ContentTemplateDB[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplateDB | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
    const [editData, setEditData] = useState<Partial<ContentTemplateDB>>({});
    const [createData, setCreateData] = useState<Partial<CreateContentTemplateInput>>({
        role: 'user',
        is_public: false,
        tags: []
    });
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');

    const { toast } = useToast();

    // Get current user
    useEffect(() => {
        const getCurrentUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
            }
        };
        getCurrentUser();
    }, []);

    // Load data from Supabase
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [templatesData, tagsData] = await Promise.all([
                fetchContentTemplates(),
                getAllTags()
            ]);
            
            setTemplates(templatesData);
            setAllTags(tagsData);

            // Split into my templates and public templates
            const my = templatesData.filter(t => t.user_id === currentUserId);
            const pub = templatesData.filter(t => t.is_public && t.user_id !== currentUserId);
            
            setMyTemplates(my);
            setPublicTemplates(pub);
        } catch (error) {
            console.error('Error loading data:', error);
            toast({
                title: "Error",
                description: "Failed to load templates",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [toast, currentUserId]);

    useEffect(() => {
        if (currentUserId) {
            loadData();
        }
    }, [loadData, currentUserId]);

    // Get current template list based on active tab
    const getCurrentTemplates = () => {
        return activeTab === 'my' ? myTemplates : publicTemplates;
    };

    // Filtered and searched templates
    const filteredTemplates = getCurrentTemplates().filter(template => {
        const matchesRole = selectedRole === 'all' || template.role === selectedRole;
        const matchesSearch = searchTerm === '' || 
            template.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesTags = selectedTags.length === 0 || 
            (template.tags && selectedTags.every(selectedTag => 
                template.tags?.includes(selectedTag)
            ));
        
        return matchesRole && matchesSearch && matchesTags;
    });

    const handleCreateNew = () => {
        setCreateData({
            role: 'user',
            is_public: false,
            tags: []
        });
        setIsCreateDialogOpen(true);
    };

    const handleEdit = (template: ContentTemplateDB) => {
        setEditData({
            id: template.id,
            label: template.label,
            content: template.content,
            role: template.role,
            is_public: template.is_public,
            tags: template.tags || []
        });
        setIsEditDialogOpen(true);
    };

    const handlePreview = (template: ContentTemplateDB) => {
        setSelectedTemplate(template);
        setIsPreviewDialogOpen(true);
    };

    const handleDuplicate = (template: ContentTemplateDB) => {
        setCreateData({
            label: `${template.label} (Copy)`,
            content: template.content || '',
            role: template.role || 'user',
            is_public: false,
            tags: template.tags || []
        });
        setIsCreateDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editData.id || !editData.label || !editData.content) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        try {
            await updateTemplate({
                id: editData.id,
                label: editData.label,
                content: editData.content,
                role: editData.role as MessageRole,
                is_public: editData.is_public,
                tags: editData.tags as string[]
            });

            toast({
                title: "Success",
                description: "Template updated successfully"
            });

            clearTemplateCache();
            await loadData();
            setIsEditDialogOpen(false);
        } catch (error) {
            console.error('Error updating template:', error);
            toast({
                title: "Error",
                description: "Failed to update template",
                variant: "destructive"
            });
        }
    };

    const handleCreate = async () => {
        if (!createData.label || !createData.content || !createData.role) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        try {
            await createTemplate({
                label: createData.label,
                content: createData.content,
                role: createData.role as MessageRole,
                is_public: createData.is_public || false,
                tags: createData.tags || []
            });

            toast({
                title: "Success",
                description: "Template created successfully"
            });

            clearTemplateCache();
            await loadData();
            setIsCreateDialogOpen(false);
        } catch (error) {
            console.error('Error creating template:', error);
            toast({
                title: "Error",
                description: "Failed to create template",
                variant: "destructive"
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            await deleteTemplate(id);
            toast({
                title: "Success",
                description: "Template deleted successfully"
            });

            clearTemplateCache();
            await loadData();
        } catch (error) {
            console.error('Error deleting template:', error);
            toast({
                title: "Error",
                description: "Failed to delete template",
                variant: "destructive"
            });
        }
    };

    const canEdit = (template: ContentTemplateDB) => {
        return template.user_id === currentUserId;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <MatrxMiniLoader />
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full bg-textured ${className}`}>
            {/* Header */}
            <div className="flex-shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold">Content Templates</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage your message templates for prompts
                            </p>
                        </div>
                        <Button onClick={handleCreateNew}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Template
                        </Button>
                    </div>

                    {/* Search and Filters */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search templates..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger className="w-full md:w-[140px]">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {MESSAGE_ROLES.map(role => (
                                    <SelectItem key={role.value} value={role.value}>
                                        {role.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'my' | 'public')} className="h-full flex flex-col">
                    <div className="flex-shrink-0 border-b border-border/50 px-4 md:px-6">
                        <TabsList className="w-full md:w-auto">
                            <TabsTrigger value="my" className="flex-1 md:flex-none">
                                My Templates ({myTemplates.length})
                            </TabsTrigger>
                            <TabsTrigger value="public" className="flex-1 md:flex-none">
                                Public Templates ({publicTemplates.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-4 md:p-6">
                            {filteredTemplates.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                                    <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {activeTab === 'my' 
                                            ? "Create your first template to get started"
                                            : "No public templates match your filters"
                                        }
                                    </p>
                                    {activeTab === 'my' && (
                                        <Button onClick={handleCreateNew}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create Template
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredTemplates.map(template => (
                                        <Card key={template.id} className="hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <CardTitle className="text-base truncate flex items-center gap-2">
                                                            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                                                            {template.label}
                                                        </CardTitle>
                                                        <CardDescription className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline" className="text-xs">
                                                                {template.role}
                                                            </Badge>
                                                            {template.is_public ? (
                                                                <div className="flex items-center gap-1 text-xs text-green-600">
                                                                    <Globe className="w-3 h-3" />
                                                                    Public
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                    <Lock className="w-3 h-3" />
                                                                    Private
                                                                </div>
                                                            )}
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <p className="text-sm text-muted-foreground line-clamp-3">
                                                    {template.content}
                                                </p>

                                                {template.tags && template.tags.length > 0 && (
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {template.tags.slice(0, 3).map(tag => (
                                                            <Badge key={tag} variant="secondary" className="text-xs">
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                        {template.tags.length > 3 && (
                                                            <span className="text-xs text-muted-foreground">
                                                                +{template.tags.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 pt-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => handlePreview(template)}
                                                    >
                                                        <Eye className="w-3 h-3 mr-1" />
                                                        Preview
                                                    </Button>
                                                    
                                                    {canEdit(template) ? (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleEdit(template)}
                                                            >
                                                                <Edit className="w-3 h-3" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDelete(template.id)}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDuplicate(template)}
                                                        >
                                                            <Copy className="w-3 h-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </Tabs>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Template</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="edit-label">Label *</Label>
                                <Input
                                    id="edit-label"
                                    value={editData.label || ''}
                                    onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                                    placeholder="Template name"
                                />
                            </div>

                            <div>
                                <Label htmlFor="edit-role">Message Type *</Label>
                                <Select
                                    value={editData.role || 'user'}
                                    onValueChange={(value) => setEditData({ ...editData, role: value as MessageRole })}
                                >
                                    <SelectTrigger id="edit-role">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MESSAGE_ROLES.map(role => (
                                            <SelectItem key={role.value} value={role.value}>
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="edit-content">Content *</Label>
                                <Textarea
                                    id="edit-content"
                                    value={editData.content || ''}
                                    onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                                    placeholder="Template content..."
                                    rows={8}
                                    className="font-mono text-sm"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="edit-public"
                                    checked={editData.is_public || false}
                                    onChange={(e) => setEditData({ ...editData, is_public: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <Label htmlFor="edit-public" className="cursor-pointer">
                                    Make this template public
                                </Label>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Create Template</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="create-label">Label *</Label>
                                <Input
                                    id="create-label"
                                    value={createData.label || ''}
                                    onChange={(e) => setCreateData({ ...createData, label: e.target.value })}
                                    placeholder="Template name"
                                />
                            </div>

                            <div>
                                <Label htmlFor="create-role">Message Type *</Label>
                                <Select
                                    value={createData.role || 'user'}
                                    onValueChange={(value) => setCreateData({ ...createData, role: value as MessageRole })}
                                >
                                    <SelectTrigger id="create-role">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MESSAGE_ROLES.map(role => (
                                            <SelectItem key={role.value} value={role.value}>
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="create-content">Content *</Label>
                                <Textarea
                                    id="create-content"
                                    value={createData.content || ''}
                                    onChange={(e) => setCreateData({ ...createData, content: e.target.value })}
                                    placeholder="Template content..."
                                    rows={8}
                                    className="font-mono text-sm"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="create-public"
                                    checked={createData.is_public || false}
                                    onChange={(e) => setCreateData({ ...createData, is_public: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <Label htmlFor="create-public" className="cursor-pointer">
                                    Make this template public
                                </Label>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{selectedTemplate?.label}</DialogTitle>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{selectedTemplate?.role}</Badge>
                            {selectedTemplate?.is_public ? (
                                <div className="flex items-center gap-1 text-xs text-green-600">
                                    <Globe className="w-3 h-3" />
                                    Public
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Lock className="w-3 h-3" />
                                    Private
                                </div>
                            )}
                        </div>
                    </DialogHeader>
                    <ScrollArea className="flex-1">
                        <div className="p-4">
                            <EnhancedChatMarkdown 
                                content={selectedTemplate?.content || ''} 
                            />
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                            Close
                        </Button>
                        {selectedTemplate && canEdit(selectedTemplate) && (
                            <Button onClick={() => {
                                setIsPreviewDialogOpen(false);
                                handleEdit(selectedTemplate);
                            }}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                        )}
                        {selectedTemplate && !canEdit(selectedTemplate) && (
                            <Button onClick={() => {
                                setIsPreviewDialogOpen(false);
                                handleDuplicate(selectedTemplate);
                            }}>
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

