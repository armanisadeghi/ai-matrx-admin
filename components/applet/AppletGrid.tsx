// components/applets/AppletGrid.tsx
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import Link from "next/link";
import {AppletDefinition} from "@/config/applets/applet-definitions";
import {AppletCategory} from "@/types/applets/types";

interface AppletGridProps {
    applets: AppletDefinition[];
    category?: AppletCategory;
}

export function AppletGrid({ applets, category }: AppletGridProps) {
    const filteredApplets = category
                            ? applets.filter(applet => applet.category === category)
                            : applets;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredApplets.map((applet) => (
                <Link
                    key={applet.key}
                    href={applet.link}
                    className="group transition-transform hover:scale-102"
                >
                    <Card className="h-full border border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 rounded-md bg-primary/10 text-primary">
                                    {applet.icon}
                                </div>
                                {applet.beta && (
                                    <Badge variant="secondary" className="ml-auto">
                                        Beta
                                    </Badge>
                                )}
                                {applet.comingSoon && (
                                    <Badge variant="outline" className="ml-auto">
                                        Coming Soon
                                    </Badge>
                                )}
                            </div>
                            <CardTitle className="text-lg font-semibold">
                                {applet.title}
                            </CardTitle>
                            <CardDescription>{applet.description}</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
