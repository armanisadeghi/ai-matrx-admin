// components/record/RecordView.tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EntityKeys } from "@/types/entityTypes";

interface RecordViewProps {
    recordId: string;
    entity: EntityKeys;
}

export function RecordView({ recordId, entity }: RecordViewProps) {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header with Quick Actions */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Claude 3.5 Sonnet</h1>
                    <p className="text-muted-foreground">AI Model • Last updated 2 hours ago</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Edit</Button>
                    <Button>Configure</Button>
                </div>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="related">Related Data</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">
                                    Performance Score
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">98%</div>
                            </CardContent>
                        </Card>
                        {/* More stats... */}
                    </div>

                    {/* Key Fields */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Key Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid grid-cols-3 items-center">
                                <span className="font-medium">Model Type</span>
                                <span className="col-span-2">Large Language Model</span>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <span className="font-medium">Version</span>
                                <span className="col-span-2">3.5</span>
                            </div>
                            {/* More fields... */}
                        </CardContent>
                    </Card>

                    {/* Visual Elements */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Usage Trends</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Chart component here */}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Performance Metrics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Metrics visualization */}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="details">
                    {/* Full field list with rich interactions */}
                </TabsContent>

                <TabsContent value="related">
                    {/* Related records and data */}
                </TabsContent>

                <TabsContent value="history">
                    {/* Activity timeline */}
                </TabsContent>
            </Tabs>
        </div>
    );
}
