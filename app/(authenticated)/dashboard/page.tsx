// app/dashboard/page.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MatrixFloatingMenu } from "@/components/layout/floating-dock";

const DashboardPage = () => {
    return (
        <>
            <div className="sticky top-0 z-50 ">
                <MatrixFloatingMenu />
            </div>
            <div className="container mx-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Users</CardTitle>
                            <CardDescription>Total registered users</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">1,234</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue</CardTitle>
                            <CardDescription>Total revenue this month</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">$56,789</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Projects</CardTitle>
                            <CardDescription>Current active projects</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">42</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default DashboardPage;