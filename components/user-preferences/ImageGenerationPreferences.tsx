import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const ImageGenerationPreferences = () => {
    const dispatch = useDispatch();
    const imageGenerationPreferences = useSelector((state: RootState) => state.userPreferences.imageGeneration);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'imageGeneration', preference, value: checked }));
    };

    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'imageGeneration', preference, value }));
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="defaultModel">Default Model</Label>
                <Select value={imageGenerationPreferences.defaultModel} onValueChange={handleSelectChange('defaultModel')}>
                    <SelectTrigger id="defaultModel">
                        <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                        <SelectItem value="stable-diffusion">Stable Diffusion</SelectItem>
                        <SelectItem value="midjourney">Midjourney</SelectItem>
                        <SelectItem value="flux">Flux</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    AI model for image generation
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="resolution">Resolution</Label>
                <Select value={imageGenerationPreferences.resolution} onValueChange={handleSelectChange('resolution')}>
                    <SelectTrigger id="resolution">
                        <SelectValue placeholder="Select resolution" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="4k">4K (3840×2160)</SelectItem>
                        <SelectItem value="1080p">1080p (1920×1080)</SelectItem>
                        <SelectItem value="720p">720p (1280×720)</SelectItem>
                        <SelectItem value="512">512×512</SelectItem>
                        <SelectItem value="1024">1024×1024</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default output resolution
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="style">Style</Label>
                <Select value={imageGenerationPreferences.style} onValueChange={handleSelectChange('style')}>
                    <SelectTrigger id="style">
                        <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="realistic">Realistic</SelectItem>
                        <SelectItem value="artistic">Artistic</SelectItem>
                        <SelectItem value="anime">Anime</SelectItem>
                        <SelectItem value="cartoon">Cartoon</SelectItem>
                        <SelectItem value="3d-render">3D Render</SelectItem>
                        <SelectItem value="digital-art">Digital Art</SelectItem>
                        <SelectItem value="oil-painting">Oil Painting</SelectItem>
                        <SelectItem value="watercolor">Watercolor</SelectItem>
                        <SelectItem value="sketch">Sketch</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default artistic style
                </p>
            </div>

            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Label htmlFor="useAiEnhancements">Use AI Enhancements</Label>
                    <p className="text-sm text-muted-foreground">Apply automatic AI enhancements</p>
                </div>
                <Switch
                    id="useAiEnhancements"
                    checked={imageGenerationPreferences.useAiEnhancements}
                    onCheckedChange={handleSwitchChange('useAiEnhancements')}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="colorPalette">Color Palette</Label>
                <Select value={imageGenerationPreferences.colorPalette} onValueChange={handleSelectChange('colorPalette')}>
                    <SelectTrigger id="colorPalette">
                        <SelectValue placeholder="Select color palette" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="vibrant">Vibrant</SelectItem>
                        <SelectItem value="muted">Muted</SelectItem>
                        <SelectItem value="pastel">Pastel</SelectItem>
                        <SelectItem value="monochrome">Monochrome</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="cool">Cool</SelectItem>
                        <SelectItem value="natural">Natural</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Preferred color scheme
                </p>
            </div>

            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    Configure settings for AI-powered image generation and creation.
                </p>
            </div>
        </div>
    );
};

export default ImageGenerationPreferences;
