'use client';

import React, { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, CheckCircle } from "lucide-react";

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

    // Load preferences on mount
    useEffect(() => {
        fetchPreferences();
    }, []);

    const fetchPreferences = async () => {
        try {
            const response = await fetch("/api/user/email-preferences");
            const data = await response.json();
            
            if (data.success && data.data) {
                setPreferences(data.data);
            }
        } catch (error) {
            console.error("Error fetching email preferences:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchChange = (key: keyof EmailPreferencesData) => (checked: boolean) => {
        setPreferences((prev) => ({
            ...prev,
            [key]: checked,
        }));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);

        try {
            const response = await fetch("/api/user/email-preferences", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(preferences),
            });

            const data = await response.json();

            if (data.success) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                console.error("Error saving preferences:", data.msg);
            }
        } catch (error) {
            console.error("Error saving email preferences:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold mb-1">Email Notification Preferences</h3>
                    <p className="text-sm text-muted-foreground">
                        Control which emails you receive from AI Matrx
                    </p>
                </div>

                {/* Collaboration Section */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Collaboration
                    </h4>
                    
                    <div className="flex items-center justify-between py-2">
                        <div className="space-y-1">
                            <Label htmlFor="sharing_notifications">Sharing Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive emails when someone shares a resource with you
                            </p>
                        </div>
                        <Switch
                            id="sharing_notifications"
                            checked={preferences.sharing_notifications}
                            onCheckedChange={handleSwitchChange('sharing_notifications')}
                        />
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div className="space-y-1">
                            <Label htmlFor="organization_invitations">Organization Invitations</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive emails when invited to join an organization
                            </p>
                        </div>
                        <Switch
                            id="organization_invitations"
                            checked={preferences.organization_invitations}
                            onCheckedChange={handleSwitchChange('organization_invitations')}
                        />
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div className="space-y-1">
                            <Label htmlFor="task_notifications">Task Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive emails for task assignments and status changes
                            </p>
                        </div>
                        <Switch
                            id="task_notifications"
                            checked={preferences.task_notifications}
                            onCheckedChange={handleSwitchChange('task_notifications')}
                        />
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div className="space-y-1">
                            <Label htmlFor="comment_notifications">Comment Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive emails when someone comments on your resources
                            </p>
                        </div>
                        <Switch
                            id="comment_notifications"
                            checked={preferences.comment_notifications}
                            onCheckedChange={handleSwitchChange('comment_notifications')}
                        />
                    </div>
                </div>

                {/* Communication Section */}
                <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Communication
                    </h4>

                    <div className="flex items-center justify-between py-2">
                        <div className="space-y-1">
                            <Label htmlFor="message_notifications">Message Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive emails for new messages when you're offline
                            </p>
                        </div>
                        <Switch
                            id="message_notifications"
                            checked={preferences.message_notifications}
                            onCheckedChange={handleSwitchChange('message_notifications')}
                        />
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div className="space-y-1">
                            <Label htmlFor="resource_updates">Resource Updates</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive updates about resources you're subscribed to
                            </p>
                        </div>
                        <Switch
                            id="resource_updates"
                            checked={preferences.resource_updates}
                            onCheckedChange={handleSwitchChange('resource_updates')}
                        />
                    </div>
                </div>

                {/* Digests Section */}
                <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Digests & Summaries
                    </h4>

                    <div className="flex items-center justify-between py-2">
                        <div className="space-y-1">
                            <Label htmlFor="weekly_digest">Weekly Digest</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive a weekly summary of your activity
                            </p>
                        </div>
                        <Switch
                            id="weekly_digest"
                            checked={preferences.weekly_digest}
                            onCheckedChange={handleSwitchChange('weekly_digest')}
                        />
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div className="space-y-1">
                            <Label htmlFor="message_digest">Message Digest</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive a daily summary of unread messages
                            </p>
                        </div>
                        <Switch
                            id="message_digest"
                            checked={preferences.message_digest}
                            onCheckedChange={handleSwitchChange('message_digest')}
                        />
                    </div>
                </div>

                {/* Marketing Section */}
                <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Marketing
                    </h4>

                    <div className="flex items-center justify-between py-2">
                        <div className="space-y-1">
                            <Label htmlFor="marketing_emails">Marketing Emails</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive updates about new features and promotions
                            </p>
                        </div>
                        <Switch
                            id="marketing_emails"
                            checked={preferences.marketing_emails}
                            onCheckedChange={handleSwitchChange('marketing_emails')}
                        />
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t flex items-center gap-2">
                <Button
                    onClick={handleSave}
                    disabled={saving || saved}
                    className="min-w-[120px]"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : saved ? (
                        <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Saved
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Preferences
                        </>
                    )}
                </Button>
                {saved && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                        Your preferences have been saved
                    </p>
                )}
            </div>
        </div>
    );
};

export default EmailPreferences;
