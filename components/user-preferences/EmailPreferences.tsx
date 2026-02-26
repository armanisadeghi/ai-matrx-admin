'use client';

import React, { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmailPreferencesData {
    sharing_notifications: boolean;
    organization_invitations: boolean;
    resource_updates: boolean;
    marketing_emails: boolean;
    weekly_digest: boolean;
    task_notifications: boolean;
    comment_notifications: boolean;
    message_notifications: boolean;
    message_digest: boolean;
}

const row = "flex items-center justify-between px-4 py-3.5 border-b border-border/40 last:border-b-0";
const sectionHeader = "px-4 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider";

const EmailPreferences = () => {
    const [preferences, setPreferences] = useState<EmailPreferencesData>({
        sharing_notifications: true,
        organization_invitations: true,
        resource_updates: true,
        marketing_emails: false,
        weekly_digest: true,
        task_notifications: true,
        comment_notifications: true,
        message_notifications: true,
        message_digest: false,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => { fetchPreferences(); }, []);

    const fetchPreferences = async () => {
        try {
            const response = await fetch("/api/user/email-preferences");
            const data = await response.json();
            if (data.success && data.data) setPreferences(data.data);
        } catch (e) { console.error("Error fetching email preferences:", e); }
        finally { setLoading(false); }
    };

    const handleSwitchChange = (key: keyof EmailPreferencesData) => (checked: boolean) => {
        setPreferences(prev => ({ ...prev, [key]: checked }));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch("/api/user/email-preferences", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(preferences),
            });
            const data = await response.json();
            if (data.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
        } catch (e) { console.error("Error saving email preferences:", e); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

    return (
        <div>
            <div className={sectionHeader}>Collaboration</div>
            <div className={row}>
                <Label htmlFor="sharing_notifications" className="text-sm font-medium">Sharing Notifications</Label>
                <Switch id="sharing_notifications" checked={preferences.sharing_notifications} onCheckedChange={handleSwitchChange('sharing_notifications')} />
            </div>
            <div className={row}>
                <Label htmlFor="organization_invitations" className="text-sm font-medium">Org Invitations</Label>
                <Switch id="organization_invitations" checked={preferences.organization_invitations} onCheckedChange={handleSwitchChange('organization_invitations')} />
            </div>
            <div className={row}>
                <Label htmlFor="task_notifications" className="text-sm font-medium">Task Notifications</Label>
                <Switch id="task_notifications" checked={preferences.task_notifications} onCheckedChange={handleSwitchChange('task_notifications')} />
            </div>
            <div className={row}>
                <Label htmlFor="comment_notifications" className="text-sm font-medium">Comment Notifications</Label>
                <Switch id="comment_notifications" checked={preferences.comment_notifications} onCheckedChange={handleSwitchChange('comment_notifications')} />
            </div>

            <div className={sectionHeader}>Communication</div>
            <div className={row}>
                <Label htmlFor="message_notifications" className="text-sm font-medium">Message Notifications</Label>
                <Switch id="message_notifications" checked={preferences.message_notifications} onCheckedChange={handleSwitchChange('message_notifications')} />
            </div>
            <div className={row}>
                <Label htmlFor="resource_updates" className="text-sm font-medium">Resource Updates</Label>
                <Switch id="resource_updates" checked={preferences.resource_updates} onCheckedChange={handleSwitchChange('resource_updates')} />
            </div>

            <div className={sectionHeader}>Digests</div>
            <div className={row}>
                <Label htmlFor="weekly_digest" className="text-sm font-medium">Weekly Digest</Label>
                <Switch id="weekly_digest" checked={preferences.weekly_digest} onCheckedChange={handleSwitchChange('weekly_digest')} />
            </div>
            <div className={row}>
                <Label htmlFor="message_digest" className="text-sm font-medium">Message Digest</Label>
                <Switch id="message_digest" checked={preferences.message_digest} onCheckedChange={handleSwitchChange('message_digest')} />
            </div>

            <div className={sectionHeader}>Marketing</div>
            <div className={row}>
                <Label htmlFor="marketing_emails" className="text-sm font-medium">Marketing Emails</Label>
                <Switch id="marketing_emails" checked={preferences.marketing_emails} onCheckedChange={handleSwitchChange('marketing_emails')} />
            </div>

            <div className="px-4 py-4">
                <Button onClick={handleSave} disabled={saving || saved} size="sm" className="w-full gap-1.5">
                    {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving...</>
                     : saved ? <><CheckCircle className="h-3.5 w-3.5" />Saved</>
                     : <><Save className="h-3.5 w-3.5" />Save Email Preferences</>}
                </Button>
            </div>
        </div>
    );
};

export default EmailPreferences;
