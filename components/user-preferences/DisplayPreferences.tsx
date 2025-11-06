import React from 'react';
import { useSelector } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RootState, useAppDispatch } from '@/lib/redux';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

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
        <div className="space-y-6">
            <div className="grid gap-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="darkMode">Dark Mode</Label>
                        <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
                    </div>
                    <Switch
                        id="darkMode"
                        checked={display.darkMode}
                        onCheckedChange={handleSwitchChange('darkMode')}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select value={display.theme} onValueChange={handleSelectChange('theme')}>
                        <SelectTrigger id="theme">
                            <SelectValue placeholder="Select a theme" />
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

                <div className="space-y-2">
                    <Label htmlFor="dashboardLayout">Dashboard Layout</Label>
                    <Select value={display.dashboardLayout} onValueChange={handleSelectChange('dashboardLayout')}>
                        <SelectTrigger id="dashboardLayout">
                            <SelectValue placeholder="Select dashboard layout" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="compact">Compact</SelectItem>
                            <SelectItem value="spacious">Spacious</SelectItem>
                            <SelectItem value="grid">Grid</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sidebarLayout">Sidebar Layout</Label>
                    <Select value={display.sidebarLayout} onValueChange={handleSelectChange('sidebarLayout')}>
                        <SelectTrigger id="sidebarLayout">
                            <SelectValue placeholder="Select sidebar layout" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="collapsed">Auto-Collapse</SelectItem>
                            <SelectItem value="expanded">Always Expanded</SelectItem>
                            <SelectItem value="floating">Floating</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="headerLayout">Header Layout</Label>
                    <Select value={display.headerLayout} onValueChange={handleSelectChange('headerLayout')}>
                        <SelectTrigger id="headerLayout">
                            <SelectValue placeholder="Select header layout" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="compact">Compact</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                            <SelectItem value="expanded">Expanded</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="windowMode">Window Mode</Label>
                    <Select value={display.windowMode} onValueChange={handleSelectChange('windowMode')}>
                        <SelectTrigger id="windowMode">
                            <SelectValue placeholder="Select window mode" />
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
        </div>
    );
};

export default DisplayPreferences;
