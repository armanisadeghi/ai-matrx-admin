import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RootState } from '@/lib/redux/store';
import { setPreference } from '@/lib/redux/slices/userPreferencesSlice';

const EmailPreferences = () => {
    const dispatch = useDispatch();
    const emailPreferences = useSelector((state: RootState) => state.userPreferences.email);

    const handleSwitchChange = (preference: string) => (checked: boolean) => {
        dispatch(setPreference({ module: 'email', preference, value: checked }));
    };

    const handleInputChange = (preference: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setPreference({ module: 'email', preference, value: e.target.value }));
    };

    const handleTextareaChange = (preference: string) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        dispatch(setPreference({ module: 'email', preference, value: e.target.value }));
    };

    const handleSelectChange = (preference: string) => (value: string) => {
        dispatch(setPreference({ module: 'email', preference, value }));
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="primaryEmail">Primary Email</Label>
                <Input
                    id="primaryEmail"
                    type="email"
                    value={emailPreferences.primaryEmail}
                    onChange={handleInputChange('primaryEmail')}
                    placeholder="your.email@example.com"
                />
                <p className="text-sm text-muted-foreground">
                    Your primary email address for notifications and communications
                </p>
            </div>

            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Label htmlFor="notificationsEnabled">Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive email notifications</p>
                </div>
                <Switch
                    id="notificationsEnabled"
                    checked={emailPreferences.notificationsEnabled}
                    onCheckedChange={handleSwitchChange('notificationsEnabled')}
                />
            </div>

            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Label htmlFor="autoReply">Auto Reply</Label>
                    <p className="text-sm text-muted-foreground">Send automatic responses to emails</p>
                </div>
                <Switch
                    id="autoReply"
                    checked={emailPreferences.autoReply}
                    onCheckedChange={handleSwitchChange('autoReply')}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="signature">Email Signature</Label>
                <Textarea
                    id="signature"
                    value={emailPreferences.signature}
                    onChange={handleTextareaChange('signature')}
                    placeholder="Your email signature..."
                    rows={4}
                    className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                    Signature to append to your outgoing emails
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="preferredEmailClient">Preferred Email Client</Label>
                <Select 
                    value={emailPreferences.preferredEmailClient} 
                    onValueChange={handleSelectChange('preferredEmailClient')}
                >
                    <SelectTrigger id="preferredEmailClient">
                        <SelectValue placeholder="Select email client" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="gmail">Gmail</SelectItem>
                        <SelectItem value="outlook">Outlook</SelectItem>
                        <SelectItem value="apple">Apple Mail</SelectItem>
                        <SelectItem value="thunderbird">Thunderbird</SelectItem>
                        <SelectItem value="webmail">Webmail</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Default email client for mailto links
                </p>
            </div>

            <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    Configure your email preferences for managing communications within the application.
                </p>
            </div>
        </div>
    );
};

export default EmailPreferences;
