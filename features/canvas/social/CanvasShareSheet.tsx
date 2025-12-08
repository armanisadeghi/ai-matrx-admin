'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Copy, 
    Check, 
    Share2, 
    Twitter, 
    Facebook, 
    Linkedin, 
    Link2,
    Eye,
    EyeOff,
    Globe,
    Lock,
    Settings
} from 'lucide-react';
import { useCanvasShare } from '@/hooks/canvas/useCanvasShare';
import { useToast } from '@/components/ui/use-toast';
import type { CanvasType, CanvasVisibility } from '@/types/canvas-social';
import { cn } from '@/lib/utils';

interface CanvasShareSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    canvasData: any;
    canvasType: CanvasType;
    defaultTitle?: string;
    defaultDescription?: string;
    hasScoring?: boolean;
}

export function CanvasShareSheet({
    open,
    onOpenChange,
    canvasData,
    canvasType,
    defaultTitle = '',
    defaultDescription = '',
    hasScoring = false
}: CanvasShareSheetProps) {
    const [title, setTitle] = useState(defaultTitle);
    const [description, setDescription] = useState(defaultDescription);
    const [visibility, setVisibility] = useState<CanvasVisibility>('public');
    const [allowRemixes, setAllowRemixes] = useState(true);
    const [requireAttribution, setRequireAttribution] = useState(true);
    const [tags, setTags] = useState<string>('');
    const [copied, setCopied] = useState(false);
    
    const { share, shareUrl, error, copyToClipboard, isSharing, reset } = useCanvasShare();
    const { toast } = useToast();

    useEffect(() => {
        if (!open) {
            // Reset after close animation
            setTimeout(reset, 300);
            setCopied(false);
        }
    }, [open, reset]);

    // Show success toast when share URL is generated
    useEffect(() => {
        if (shareUrl) {
            toast({
                title: 'Share link created!',
                description: 'Your canvas is now shareable',
            });
        }
    }, [shareUrl, toast]);

    // Show error toast if there's an error
    useEffect(() => {
        if (error) {
            toast({
                title: 'Failed to create share',
                description: error,
                variant: 'destructive'
            });
        }
    }, [error, toast]);

    const handleShare = () => {
        if (!title.trim()) {
            toast({
                title: 'Title required',
                description: 'Please enter a title for your canvas',
                variant: 'destructive'
            });
            return;
        }

        share({
            canvas_data: canvasData,
            title: title.trim(),
            description: description.trim() || undefined,
            canvas_type: canvasType,
            visibility,
            allow_remixes: allowRemixes,
            require_attribution: requireAttribution,
            has_scoring: hasScoring,
            tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            categories: []
        });
    };

    const handleCopy = async () => {
        if (!shareUrl) return;
        
        const success = await copyToClipboard(shareUrl);
        if (success) {
            setCopied(true);
            toast({
                title: 'Copied!',
                description: 'Share link copied to clipboard'
            });
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareToSocial = (platform: 'twitter' | 'facebook' | 'linkedin') => {
        if (!shareUrl) return;

        const text = encodeURIComponent(title);
        const url = encodeURIComponent(shareUrl);

        const urls = {
            twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
        };

        window.open(urls[platform], '_blank', 'width=600,height=400');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="w-5 h-5" />
                        Share Canvas
                    </DialogTitle>
                    <DialogDescription>
                        {shareUrl ? 'Your canvas is now shareable!' : 'Create a shareable link for your canvas'}
                    </DialogDescription>
                </DialogHeader>

                {!shareUrl ? (
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="settings">Settings</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Give your canvas a title..."
                                    maxLength={100}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe what your canvas is about..."
                                    rows={3}
                                    maxLength={500}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tags">Tags (comma separated)</Label>
                                <Input
                                    id="tags"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="quiz, education, fun..."
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize">
                                    {canvasType.replace('-', ' ')}
                                </Badge>
                                {hasScoring && (
                                    <Badge variant="secondary">
                                        🏆 Scored
                                    </Badge>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="settings" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="visibility">Visibility</Label>
                                <Select value={visibility} onValueChange={(v: CanvasVisibility) => setVisibility(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="public">
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-4 h-4" />
                                                <div>
                                                    <div className="font-medium">Public</div>
                                                    <div className="text-xs text-gray-500">Anyone can find and view</div>
                                                </div>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="unlisted">
                                            <div className="flex items-center gap-2">
                                                <Link2 className="w-4 h-4" />
                                                <div>
                                                    <div className="font-medium">Unlisted</div>
                                                    <div className="text-xs text-gray-500">Only people with link can view</div>
                                                </div>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="private">
                                            <div className="flex items-center gap-2">
                                                <Lock className="w-4 h-4" />
                                                <div>
                                                    <div className="font-medium">Private</div>
                                                    <div className="text-xs text-gray-500">Only you can view</div>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg border-border">
                                <div className="space-y-0.5">
                                    <Label>Allow Remixes</Label>
                                    <p className="text-sm text-gray-500">Let others fork and modify your canvas</p>
                                </div>
                                <Switch
                                    checked={allowRemixes}
                                    onCheckedChange={setAllowRemixes}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg border-border">
                                <div className="space-y-0.5">
                                    <Label>Require Attribution</Label>
                                    <p className="text-sm text-gray-500">Remixes must credit you as original creator</p>
                                </div>
                                <Switch
                                    checked={requireAttribution}
                                    onCheckedChange={setRequireAttribution}
                                    disabled={!allowRemixes}
                                />
                            </div>
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="space-y-6">
                        {/* Share URL */}
                        <div className="space-y-2">
                            <Label>Share Link</Label>
                            <div className="flex gap-2 w-full">
                                <Input
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1 font-mono text-sm min-w-0"
                                />
                                <Button
                                    onClick={handleCopy}
                                    variant="outline"
                                    className="flex-shrink-0 whitespace-nowrap"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4 mr-2" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Social Share Buttons */}
                        <div className="space-y-2">
                            <Label>Share to Social Media</Label>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => shareToSocial('twitter')}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <Twitter className="w-4 h-4 mr-2" />
                                    Twitter
                                </Button>
                                <Button
                                    onClick={() => shareToSocial('facebook')}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <Facebook className="w-4 h-4 mr-2" />
                                    Facebook
                                </Button>
                                <Button
                                    onClick={() => shareToSocial('linkedin')}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <Linkedin className="w-4 h-4 mr-2" />
                                    LinkedIn
                                </Button>
                            </div>
                        </div>

                        {/* Settings Summary */}
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Visibility</span>
                                <Badge variant="outline" className="capitalize">
                                    {visibility === 'public' && <Globe className="w-3 h-3 mr-1" />}
                                    {visibility === 'unlisted' && <Link2 className="w-3 h-3 mr-1" />}
                                    {visibility === 'private' && <Lock className="w-3 h-3 mr-1" />}
                                    {visibility}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Allow Remixes</span>
                                <span className="font-medium">{allowRemixes ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Require Attribution</span>
                                <span className="font-medium">{requireAttribution ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {shareUrl ? 'Done' : 'Cancel'}
                    </Button>
                    {!shareUrl && (
                        <Button
                            onClick={handleShare}
                            disabled={isSharing || !title.trim()}
                        >
                            {isSharing ? 'Creating...' : 'Create Share Link'}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

