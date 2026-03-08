import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const row = "flex items-center justify-between px-4 py-3.5 border-b border-border/40 last:border-b-0";
const rowLabel = "text-sm font-medium";

const ImageGenerationPreferences = () => {
    const dispatch = useDispatch();
    const prefs = useSelector((state: RootState) => state.userPreferences.imageGeneration);
    const handleSwitch = (preference: string) => (checked: boolean) => dispatch(setPreference({ module: 'imageGeneration', preference, value: checked }));
    const handleSelect = (preference: string) => (value: string) => dispatch(setPreference({ module: 'imageGeneration', preference, value }));

    return (
        <div>
            <div className={row}>
                <Label htmlFor="defaultModel" className={rowLabel}>Model</Label>
                <Select value={prefs.defaultModel} onValueChange={handleSelect('defaultModel')}>
                    <SelectTrigger id="defaultModel" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                        <SelectItem value="stable-diffusion">Stable Diffusion</SelectItem>
                        <SelectItem value="midjourney">Midjourney</SelectItem>
                        <SelectItem value="flux">Flux</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="resolution" className={rowLabel}>Resolution</Label>
                <Select value={prefs.resolution} onValueChange={handleSelect('resolution')}>
                    <SelectTrigger id="resolution" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="4k">4K</SelectItem>
                        <SelectItem value="1080p">1080p</SelectItem>
                        <SelectItem value="720p">720p</SelectItem>
                        <SelectItem value="512">512×512</SelectItem>
                        <SelectItem value="1024">1024×1024</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="style" className={rowLabel}>Style</Label>
                <Select value={prefs.style} onValueChange={handleSelect('style')}>
                    <SelectTrigger id="style" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
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
            </div>
            <div className={row}>
                <Label htmlFor="colorPalette" className={rowLabel}>Color Palette</Label>
                <Select value={prefs.colorPalette} onValueChange={handleSelect('colorPalette')}>
                    <SelectTrigger id="colorPalette" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
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
            </div>
            <div className={row}>
                <Label htmlFor="useAiEnhancements" className={rowLabel}>AI Enhancements</Label>
                <Switch id="useAiEnhancements" checked={prefs.useAiEnhancements} onCheckedChange={handleSwitch('useAiEnhancements')} />
            </div>
        </div>
    );
};

export default ImageGenerationPreferences;
