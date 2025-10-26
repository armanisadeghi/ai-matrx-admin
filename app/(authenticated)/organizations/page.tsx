import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Users, Settings } from "lucide-react";
import Link from "next/link";

export default function OrganizationsPage() {
    return (
        <Card className="h-full w-full bg-textured border-none shadow-lg">
            <div className="p-8 md:p-12">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                            Organizations
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Manage your organizations and team collaboration
                        </p>
                    </div>
                    <Button className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        New Organization
                    </Button>
                </div>

                {/* Coming Soon Notice */}
                <Card className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="p-4 bg-blue-100 dark:bg-blue-800 rounded-full">
                                <Building2 className="h-12 w-12 text-blue-600 dark:text-blue-300" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                Organization Management Coming Soon
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                                The organization management interface is currently being built. This page will allow you to:
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-6">
                            <Card className="p-4">
                                <Building2 className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                                <h3 className="font-semibold mb-1">Create & Manage</h3>
                                <p className="text-sm text-muted-foreground">
                                    Create organizations and manage settings
                                </p>
                            </Card>
                            <Card className="p-4">
                                <Users className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                                <h3 className="font-semibold mb-1">Team Members</h3>
                                <p className="text-sm text-muted-foreground">
                                    Invite members and assign roles
                                </p>
                            </Card>
                            <Card className="p-4">
                                <Settings className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                                <h3 className="font-semibold mb-1">Permissions</h3>
                                <p className="text-sm text-muted-foreground">
                                    Control access to shared resources
                                </p>
                            </Card>
                        </div>
                        
                        <div className="mt-6 p-4 bg-amber-100 dark:bg-amber-900/30 rounded-lg border border-amber-300 dark:border-amber-700">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                <strong>Note:</strong> Organization sharing is ready to use! You can share prompts with organizations once they're created. The management UI is the next phase of development.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* For now, show a link back */}
                <div className="mt-6 text-center">
                    <Link href="/ai/prompts">
                        <Button variant="outline">
                            Back to Prompts
                        </Button>
                    </Link>
                </div>
            </div>
        </Card>
    );
}

