import React from 'react';
import {Database, Lock, Zap, HardDrive, Clock, Box, LucideIcon} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from "@/components/ui/card";
import {ModeToggle} from "@/components/layout/mode-toggle";

interface TopMenuProps {
    // Add any props you might need
}

const TopMenu: React.FC<TopMenuProps> = () => {
    return (
        <header
            className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
                <div className="flex items-center space-x-4">
                    <span className="text-primary text-2xl font-bold">YourLogo</span>
                    <nav className="hidden md:flex space-x-4">
                        <a href="#" className="text-foreground/60 hover:text-foreground">Product</a>
                        <a href="#" className="text-foreground/60 hover:text-foreground">Developers</a>
                        <a href="#" className="text-foreground/60 hover:text-foreground">Pricing</a>
                        <a href="#" className="text-foreground/60 hover:text-foreground">Docs</a>
                        <a href="#" className="text-foreground/60 hover:text-foreground">Blog</a>
                    </nav>
                </div>
                <div className="flex items-center space-x-2">
                    <ModeToggle/>
                    <Button>Start your project</Button>
                </div>
            </div>
        </header>
    );
};

interface FeatureCardProps {
    Icon: LucideIcon;
    title: string;
    description: string;
    features?: string[];
}

const FeatureCard: React.FC<FeatureCardProps> = ({Icon, title, description, features}) => (
    <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1">
        <CardHeader>
            <Icon className="text-primary w-8 h-8 mb-4"/>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        {features && (
            <CardContent>
                <ul className="space-y-2">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                            <span className="text-primary mr-2">✓</span> {feature}
                        </li>
                    ))}
                </ul>
            </CardContent>
        )}
    </Card>
);

const HomePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <TopMenu/>
            <main className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-5xl font-bold mb-4">No-Code AI</h1>
                <h1 className="text-5xl font-bold mb-4">Business Automation</h1>
                <h1 className="text-5xl font-bold mb-4">Framework</h1>

                <p className="text-xl mb-8 max-w-2xl mx-auto">
                    AI Matrix is an innovative solution for enterprise-level companies.
                    Start your project with advanced AI capabilities, seamless integration, and scalable infrastructure.
                </p>
                <div className="flex justify-center gap-4">
                    <Button size="lg">Get Started</Button>
                    <Button size="lg" variant="outline">Documentation</Button>
                    <Button size="lg" variant="outline">Talk To Us</Button>
                </div>

                <div className="flex justify-center flex-wrap gap-8 my-16">
                    {['Company1', 'Company2', 'Company3', 'Company4', 'Company5', 'Company6'].map((company, index) => (
                        <div key={index} className="text-muted-foreground">{company}</div>
                    ))}
                </div>

                <div className="grid md:grid-cols-3 gap-8 text-left">
                    <FeatureCard
                        Icon={Database}
                        title="AI Processing"
                        description="Advanced AI capabilities for complex data processing and analysis."
                        features={['Feature 1', 'Feature 2', 'Feature 3']}
                    />
                    <FeatureCard
                        Icon={Lock}
                        title="Secure Integration"
                        description="Seamlessly integrate AI into your existing workflows with top-tier security."
                    />
                    <FeatureCard
                        Icon={Zap}
                        title="Rapid Deployment"
                        description="Quickly implement AI solutions without extensive infrastructure changes."
                    />
                    <FeatureCard
                        Icon={HardDrive}
                        title="Data Management"
                        description="Efficiently handle and process large volumes of business data."
                    />
                    <FeatureCard
                        Icon={Clock}
                        title="Real-time Analytics"
                        description="Get instant insights with real-time data analysis and reporting."
                    />
                    <FeatureCard
                        Icon={Box}
                        title="Scalable Solution"
                        description="Grow your AI capabilities alongside your business needs."
                    />
                </div>
            </main>
        </div>
    );
};

export default HomePage;
