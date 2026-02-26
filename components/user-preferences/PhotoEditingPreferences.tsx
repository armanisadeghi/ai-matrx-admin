import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const row = "flex items-center justify-between px-4 py-3.5 border-b border-border/40 last:border-b-0";
const rowLabel = "text-sm font-medium";

const PhotoEditingPreferences = () => {
    const dispatch = useDispatch();
    const prefs = useSelector((state: RootState) => state.userPreferences.photoEditing);
    const handleSwitch = (preference: string) => (checked: boolean) => dispatch(setPreference({ module: 'photoEditing', preference, value: checked }));
    const handleSelect = (preference: string) => (value: string) => dispatch(setPreference({ module: 'photoEditing', preference, value }));

    return (
        <div>
            <div className={row}>
                <Label htmlFor="defaultFilter" className={rowLabel}>Default Filter</Label>
                <Select value={prefs.defaultFilter} onValueChange={handleSelect('defaultFilter')}>
                    <SelectTrigger id="defaultFilter" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="vivid">Vivid</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="cool">Cool</SelectItem>
                        <SelectItem value="black-white">B&W</SelectItem>
                        <SelectItem value="sepia">Sepia</SelectItem>
                        <SelectItem value="vintage">Vintage</SelectItem>
                        <SelectItem value="dramatic">Dramatic</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="resolution" className={rowLabel}>Export Resolution</Label>
                <Select value={prefs.resolution} onValueChange={handleSelect('resolution')}>
                    <SelectTrigger id="resolution" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="original">Original</SelectItem>
                        <SelectItem value="4k">4K</SelectItem>
                        <SelectItem value="1080p">1080p</SelectItem>
                        <SelectItem value="720p">720p</SelectItem>
                        <SelectItem value="480p">480p</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="defaultAspectRatio" className={rowLabel}>Aspect Ratio</Label>
                <Select value={prefs.defaultAspectRatio} onValueChange={handleSelect('defaultAspectRatio')}>
                    <SelectTrigger id="defaultAspectRatio" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="original">Original</SelectItem>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="4:3">4:3</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                        <SelectItem value="9:16">9:16</SelectItem>
                        <SelectItem value="3:2">3:2</SelectItem>
                        <SelectItem value="21:9">21:9</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className={row}>
                <Label htmlFor="autoEnhance" className={rowLabel}>Auto Enhance</Label>
                <Switch id="autoEnhance" checked={prefs.autoEnhance} onCheckedChange={handleSwitch('autoEnhance')} />
            </div>
            <div className={row}>
                <Label htmlFor="watermarkEnabled" className={rowLabel}>Watermark</Label>
                <Switch id="watermarkEnabled" checked={prefs.watermarkEnabled} onCheckedChange={handleSwitch('watermarkEnabled')} />
            </div>
        </div>
    );
};

export default PhotoEditingPreferences;
