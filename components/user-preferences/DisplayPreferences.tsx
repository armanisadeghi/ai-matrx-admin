import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { RootState, useAppDispatch } from '@/lib/redux';
import { setPreference, saveModulePreferencesToDatabase, clearError, UserPreferencesState } from '@/lib/redux/slices/userPreferencesSlice';

const DisplayPreferences = () => {
    const dispatch = useAppDispatch();
    const preferences = useSelector((state: RootState) => state.userPreferences as UserPreferencesState);
    const { display, _meta } = preferences;

    // Safety check for _meta
    const meta = _meta || {
        isLoading: false,
        error: null,
        lastSaved: null,
        hasUnsavedChanges: false,
    };

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'display', preference, value: checked }));
    };

    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'display', preference, value }));
    };

    const handleSave = () => {
        dispatch(saveModulePreferencesToDatabase({ module: 'display', preferences: display }));
    };

    const handleClearError = () => {
        dispatch(clearError());
    };

    // Auto-save after 2 seconds of no changes
    useEffect(() => {
        if (meta.hasUnsavedChanges && !meta.isLoading) {
            const timeout = setTimeout(() => {
                handleSave();
            }, 2000);

            return () => clearTimeout(timeout);
        }
    }, [display, meta.hasUnsavedChanges, meta.isLoading]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Display Settings</h3>
                <div className="flex items-center gap-2">
                    {meta.isLoading && (
                        <div className="flex items-center text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            Saving...
                        </div>
                    )}
                    {meta.lastSaved && !meta.hasUnsavedChanges && !meta.isLoading && (
                        <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                            <Check className="h-4 w-4 mr-1" />
                            Saved
                        </div>
                    )}
                    {meta.hasUnsavedChanges && !meta.isLoading && (
                        <Button 
                            onClick={handleSave} 
                            size="sm" 
                            variant="outline"
                            className="text-xs"
                        >
                            Save Now
                        </Button>
                    )}
                </div>
            </div>

            {meta.error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex justify-between items-center">
                        <span>Error saving preferences: {meta.error}</span>
                        <Button 
                            onClick={handleClearError} 
                            size="sm" 
                            variant="ghost"
                            className="text-xs"
                        >
                            Dismiss
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="darkMode">Dark Mode</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Toggle between light and dark themes</p>
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