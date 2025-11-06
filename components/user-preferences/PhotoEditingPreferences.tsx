import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const PhotoEditingPreferences = () => {
    const dispatch = useDispatch();
    const photoEditingPreferences = useSelector((state: RootState) => state.userPreferences.photoEditing);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'photoEditing', preference, value: checked }));
    };

    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'photoEditing', preference, value }));
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="defaultFilter">Default Filter</Label>
                <Select value={photoEditingPreferences.defaultFilter} onValueChange={handleSelectChange('defaultFilter')}>
                    <SelectTrigger id="defaultFilter">
                        <SelectValue placeholder="Select a filter" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="vivid">Vivid</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="cool">Cool</SelectItem>
                        <SelectItem value="black-white">Black & White</SelectItem>
                        <SelectItem value="sepia">Sepia</SelectItem>
                        <SelectItem value="vintage">Vintage</SelectItem>
                        <SelectItem value="dramatic">Dramatic</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default filter applied to new edits
                </p>
            </div>

            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Label htmlFor="autoEnhance">Auto Enhance</Label>
                    <p className="text-sm text-muted-foreground">Automatically enhance photos when opening</p>
                </div>
                <Switch
                    id="autoEnhance"
                    checked={photoEditingPreferences.autoEnhance}
                    onCheckedChange={handleSwitchChange('autoEnhance')}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="resolution">Default Resolution</Label>
                <Select value={photoEditingPreferences.resolution} onValueChange={handleSelectChange('resolution')}>
                    <SelectTrigger id="resolution">
                        <SelectValue placeholder="Select resolution" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="original">Original</SelectItem>
                        <SelectItem value="4k">4K (3840×2160)</SelectItem>
                        <SelectItem value="1080p">1080p (1920×1080)</SelectItem>
                        <SelectItem value="720p">720p (1280×720)</SelectItem>
                        <SelectItem value="480p">480p (854×480)</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default export resolution
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="defaultAspectRatio">Default Aspect Ratio</Label>
                <Select value={photoEditingPreferences.defaultAspectRatio} onValueChange={handleSelectChange('defaultAspectRatio')}>
                    <SelectTrigger id="defaultAspectRatio">
                        <SelectValue placeholder="Select aspect ratio" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="original">Original</SelectItem>
                        <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                        <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                        <SelectItem value="3:2">3:2 (Classic)</SelectItem>
                        <SelectItem value="21:9">21:9 (Ultrawide)</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default crop aspect ratio
                </p>
            </div>

            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Label htmlFor="watermarkEnabled">Enable Watermark</Label>
                    <p className="text-sm text-muted-foreground">Add watermark to exported images</p>
                </div>
                <Switch
                    id="watermarkEnabled"
                    checked={photoEditingPreferences.watermarkEnabled}
                    onCheckedChange={handleSwitchChange('watermarkEnabled')}
                />
            </div>

            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    Configure default settings for photo editing and image processing.
                </p>
            </div>
        </div>
    );
};

export default PhotoEditingPreferences;
