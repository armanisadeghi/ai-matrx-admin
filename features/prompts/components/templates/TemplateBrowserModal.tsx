"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MobileOverlayWrapper } from "@/components/official/MobileOverlayWrapper";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText, Globe, Lock, Tag } from "lucide-react";
import { MessageRole, ContentTemplateDB } from "@/types/content-templates-db";
import { fetchContentTemplates } from "@/lib/services/content-templates-service";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import EnhancedChatMarkdown from "@/components/mardown-display/chat-markdown/EnhancedChatMarkdown";

interface TemplateBrowserModalProps {
    isOpen: boolean;
    onClose: () => void;
    role?: MessageRole;
    onSelectTemplate: (content: string) => void;
}

export function TemplateBrowserModal({
    isOpen,
    onClose,
    role,
    onSelectTemplate
}: TemplateBrowserModalProps) {
    const [templates, setTemplates] = useState<ContentTemplateDB[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplateDB | null>(null);
    const { toast } = useToast();
    const isMobile = useIsMobile();

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen, role]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await fetchContentTemplates({ 
                role: role,
                order_by: 'updated_at',
                order_direction: 'desc'
            });
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
            toast({
                title: "Error",
                description: "Failed to load templates",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredTemplates = useMemo(() => {
        return templates.filter(template => {
            const matchesSearch = searchTerm === '' || 
                template.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                template.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                template.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
            
            return matchesSearch;
        });
    }, [templates, searchTerm]);

    const handleSelect = () => {
        if (selectedTemplate && selectedTemplate.content) {
            onSelectTemplate(selectedTemplate.content);
            onClose();
            setSelectedTemplate(null);
            setSearchTerm("");
        }
    };

    const handleClose = () => {
        setSelectedTemplate(null);
        setSearchTerm("");
        onClose();
    };

    const content = (
        <div className="flex flex-col h-full">
            {/* Search */}
            <div className="p-4 border-b border-border/50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search templates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Template List & Preview */}
            <div className="flex-1 overflow-hidden">
                {selectedTemplate ? (
                    // Preview Mode
                    <div className="h-full flex flex-col">
                        <div className="p-4 border-b border-border/50">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-lg truncate">{selectedTemplate.label}</h3>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <Badge variant="secondary" className="text-xs">
                                            {selectedTemplate.role}
                                        </Badge>
                                        {selectedTemplate.is_public ? (
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
                                    {selectedTemplate.tags && selectedTemplate.tags.length > 0 && (
                                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                                            {selectedTemplate.tags.map(tag => (
                                                <Badge key={tag} variant="outline" className="text-xs">
                                                    <Tag className="w-3 h-3 mr-1" />
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => setSelectedTemplate(null)}
                                    variant="outline"
                                >
                                    Back
                                </Button>
                            </div>
                        </div>
                        <ScrollArea className="flex-1 p-4">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <EnhancedChatMarkdown 
                                    content={selectedTemplate.content || ''} 
                                    useV2Parser={true}
                                />
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t border-border/50">
                            <Button 
                                onClick={handleSelect}
                                className="w-full"
                            >
                                Use This Template
                            </Button>
                        </div>
                    </div>
                ) : (
                    // List Mode
                    <ScrollArea className="h-full">
                        {loading ? (
                            <div className="p-8 text-center text-muted-foreground">
                                Loading templates...
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No templates found</p>
                                {searchTerm && (
                                    <p className="text-sm mt-2">Try a different search term</p>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 space-y-2">
                                {filteredTemplates.map(template => (
                                    <div
                                        key={template.id}
                                        onClick={() => setSelectedTemplate(template)}
                                        className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                                                    <h4 className="font-medium text-sm truncate">{template.label}</h4>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                    {template.content}
                                                </p>
                                                {template.tags && template.tags.length > 0 && (
                                                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                                                        {template.tags.slice(0, 3).map(tag => (
                                                            <Badge key={tag} variant="secondary" className="text-xs">
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                        {template.tags.length > 3 && (
                                                            <span className="text-xs text-muted-foreground">
                                                                +{template.tags.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {template.is_public ? (
                                                <Globe className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            ) : (
                                                <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                )}
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <MobileOverlayWrapper
                isOpen={isOpen}
                onClose={handleClose}
                title="Browse Templates"
                description={role ? `${role.charAt(0).toUpperCase() + role.slice(1)} message templates` : "Select a template"}
                maxHeight="xl"
            >
                {content}
            </MobileOverlayWrapper>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="px-6 py-4 border-b border-border/50">
                    <DialogTitle>Browse Templates</DialogTitle>
                    {role && (
                        <p className="text-sm text-muted-foreground">
                            {role.charAt(0).toUpperCase() + role.slice(1)} message templates
                        </p>
                    )}
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                    {content}
                </div>
            </DialogContent>
        </Dialog>
    );
}

