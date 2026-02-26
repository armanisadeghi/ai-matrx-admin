import React from 'react';
import { useSelector } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RootState, useAppDispatch } from '@/lib/redux';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const row = "flex items-center justify-between px-4 py-3.5 border-b border-border/40 last:border-b-0";
const rowLabel = "text-sm font-medium";

const DisplayPreferences = () => {
    const dispatch = useAppDispatch();
    const display = useSelector((state: RootState) => state.userPreferences.display);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'display', preference, value: checked }));
    };
    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'display', preference, value }));
    };

    return (
        <div>
            <div className={row}>
                <Label htmlFor="darkMode" className={rowLabel}>Dark Mode</Label>
                <Switch id="darkMode" checked={display.darkMode} onCheckedChange={handleSwitchChange('darkMode')} />
            </div>

            <div className={row}>
                <Label htmlFor="theme" className={rowLabel}>Theme</Label>
                <Select value={display.theme} onValueChange={handleSelectChange('theme')}>
                    <SelectTrigger id="theme" className="w-36 h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                        <SelectItem value="forest">Forest</SelectItem>
                        <SelectItem value="ocean">Ocean</SelectItem>
                        <SelectItem value="sunset">Sunset</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className={row}>
                <Label htmlFor="dashboardLayout" className={rowLabel}>Dashboard Layout</Label>
                <Select value={display.dashboardLayout} onValueChange={handleSelectChange('dashboardLayout')}>
                    <SelectTrigger id="dashboardLayout" className="w-36 h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="spacious">Spacious</SelectItem>
                        <SelectItem value="grid">Grid</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className={row}>
                <Label htmlFor="sidebarLayout" className={rowLabel}>Sidebar Layout</Label>
                <Select value={display.sidebarLayout} onValueChange={handleSelectChange('sidebarLayout')}>
                    <SelectTrigger id="sidebarLayout" className="w-36 h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="collapsed">Auto-Collapse</SelectItem>
                        <SelectItem value="expanded">Always Expanded</SelectItem>
                        <SelectItem value="floating">Floating</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className={row}>
                <Label htmlFor="headerLayout" className={rowLabel}>Header Layout</Label>
                <Select value={display.headerLayout} onValueChange={handleSelectChange('headerLayout')}>
                    <SelectTrigger id="headerLayout" className="w-36 h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="expanded">Expanded</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className={row}>
                <Label htmlFor="windowMode" className={rowLabel}>Window Mode</Label>
                <Select value={display.windowMode} onValueChange={handleSelectChange('windowMode')}>
                    <SelectTrigger id="windowMode" className="w-36 h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="fullscreen">Fullscreen</SelectItem>
                        <SelectItem value="windowed">Windowed</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

export default DisplayPreferences;
