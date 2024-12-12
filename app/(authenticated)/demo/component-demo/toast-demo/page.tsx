// app/test/toast/page.tsx
'use client';

import { useToastManager } from "@/hooks/useToastManager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEffect } from "react";

export default function ToastTestPage() {
    const toast = useToastManager();
    const userProfileToast = useToastManager('userProfile');
    const customToast = useToastManager();
    useEffect(() => {
        userProfileToast.register?.('userProfile', {
            success: "Profile updated successfully",
            error: "Failed to update profile settings",
            info: "Profile information",
            warning: "Profile requires attention",
            loading: "Updating profile...",
            notify: "Profile notification"
        });
        return () => userProfileToast.removeDefaults?.('userProfile');
    }, []);

    const testLoadingToast = async () => {
        await toast.loading(
            async () => {
                await new Promise(resolve => setTimeout(resolve, 2000));
                return "Operation completed";
            },
            {
                loading: "Processing request...",
                success: "Operation completed successfully",
                error: "Operation failed"
            }
        );
    };

    return (
        <div className="w-full h-full flex items-center justify-center">
            <Card className="p-6 space-y-6 w-full max-w-4xl">
                <h1 className="text-2xl font-bold">Toast Test Page</h1>

                {/* Minimal Usage Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Minimal Usage (Default Messages)</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                            onClick={() => toast.success()}
                            variant="default"
                        >
                            Default Success
                        </Button>

                        <Button
                            onClick={() => toast.error()}
                            variant="destructive"
                        >
                            Default Error
                        </Button>

                        <Button
                            onClick={() => toast.info()}
                            variant="secondary"
                        >
                            Default Info
                        </Button>

                        <Button
                            onClick={() => toast.warning()}
                            variant="ghost"
                        >
                            Default Warning
                        </Button>
                    </div>
                </div>

                {/* Module-Level Usage Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Module-Level Usage (Profile Defaults)</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                            onClick={() => userProfileToast.success()}
                            variant="default"
                        >
                            Profile Success
                        </Button>

                        <Button
                            onClick={() => userProfileToast.error()}
                            variant="destructive"
                        >
                            Profile Error
                        </Button>

                        <Button
                            onClick={() => userProfileToast.info()}
                            variant="secondary"
                        >
                            Profile Info
                        </Button>

                        <Button
                            onClick={() => userProfileToast.warning()}
                            variant="ghost"
                        >
                            Profile Warning
                        </Button>
                    </div>
                </div>

                {/* Custom Usage Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Custom Usage</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                            onClick={() => customToast.success("Custom success message")}
                            variant="default"
                        >
                            Custom Success
                        </Button>

                        <Button
                            onClick={() => customToast.error("Custom error message")}
                            variant="destructive"
                        >
                            Custom Error
                        </Button>

                        <Button
                            onClick={testLoadingToast}
                            variant="default"
                            className="bg-primary"
                        >
                            Loading Toast
                        </Button>

                        <Button
                            onClick={() => customToast.show(
                                "Custom Toast",
                                "This is a custom toast message",
                                "primary",
                                {
                                    duration: 5000,
                                    action: {
                                        label: "Undo",
                                        onClick: () => console.log("Undo clicked"),
                                    }
                                }
                            )}
                            variant="secondary"
                        >
                            Custom with Action
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
