import React from 'react';
import {
    LucideIcon,
    Infinity,
    Code,
    Wand2,
    ArrowUpCircle,
    Brain,
    Workflow,
    Rocket,
    Zap,
    Shield,
    ChartBar
} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from "@/components/ui/card";
import {ModeToggle} from "@/components/layout/mode-toggle";
import Link from 'next/link';

interface TopMenuProps {
    // Add any props you might need
}

const TopMenu: React.FC<TopMenuProps> = () => {
    return (
        <header
            className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
                <div className="flex items-center space-x-4">
                    <span className="text-primary text-2xl font-bold flex items-center">
                        <Infinity className="w-8 h-8 mr-2"/>
                        AI Matrix
                    </span>
                    <nav className="hidden md:flex space-x-4">
                        <a href="#" className="text-foreground/60 hover:text-foreground">Solution</a>
                        <a href="#" className="text-foreground/60 hover:text-foreground">Developers</a>
                        <a href="#" className="text-foreground/60 hover:text-foreground">Pricing</a>
                        <a href="#" className="text-foreground/60 hover:text-foreground">Docs</a>
                        <a href="#" className="text-foreground/60 hover:text-foreground">Blog</a>
                    </nav>
                </div>

                <div className="flex items-center space-x-3">
                    <ModeToggle/>
                    <Link href="/dashboard" className="flex items-center">
                        <Button variant="outline">Dashboard</Button>
                    </Link>
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
            <TopMenu />
            <main className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-6xl font-bold mb-4">AI Matrx</h1>
                <h2 className="text-4xl font-semibold mb-6">Redefining Enterprise AI Integration</h2>
                <p className="text-xl mb-10 max-w-3xl mx-auto">
                    Empower your business with a no-code AI platform that orchestrates, automates, and elevates your processes. Bridge the gap between AI potential and real-world business needs.
                </p>
                <div className="flex justify-center gap-4 mb-16">
                    <Button size="lg">Start Free Trial</Button>
                    <Button size="lg" variant="outline">Request Demo</Button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-left mb-16">
                    <FeatureCard
                        Icon={Wand2}
                        title="AI Orchestration"
                        description="Seamlessly integrate multiple AI models for superior outcomes."
                        features={['Multi-model Integration', 'Customizable Solutions']}
                    />
                    <FeatureCard
                        Icon={ArrowUpCircle}
                        title="Enterprise Scalability"
                        description="Handle intense demands with a system that grows with your business."
                        features={['High Performance', 'Flexible Scaling']}
                    />
                    <FeatureCard
                        Icon={Brain}
                        title="Self-Improving AI"
                        description="Our AI continuously learns, refining models for increased accuracy."
                        features={['Continuous Learning', 'Adaptive Intelligence']}
                    />
                    <FeatureCard
                        Icon={Workflow}
                        title="Workflow Integration"
                        description="Streamline operations with over 1,000 API integrations."
                        features={['1000+ API Integrations', 'Enhanced Productivity']}
                    />
                </div>

                <div className="text-left max-w-3xl mx-auto">
                    <h3 className="text-2xl font-semibold mb-4">Why Enterprise Leaders Choose AI Matrx</h3>
                    <ul className="space-y-2">
                        <li className="flex items-start">
                            <span className="text-primary mr-2 mt-1">✓</span>
                            <span><strong>Rapid ROI:</strong> Deploy AI solutions in hours, not months, accelerating time-to-value.</span>
                        </li>
                        <li className="flex items-start">
                            <span className="text-primary mr-2 mt-1">✓</span>
                            <span><strong>No-Code Simplicity:</strong> Empower your team to build sophisticated AI applications without extensive technical knowledge.</span>
                        </li>
                        <li className="flex items-start">
                            <span className="text-primary mr-2 mt-1">✓</span>
                            <span><strong>Enterprise-Grade Security:</strong> Ensure data protection and compliance with robust security measures.</span>
                        </li>
                        <li className="flex items-start">
                            <span className="text-primary mr-2 mt-1">✓</span>
                            <span><strong>Scalable Performance:</strong> Seamlessly handle growing demands as your AI initiatives expand.</span>
                        </li>
                    </ul>
                </div>
            </main>
        </div>
    );
};

export default HomePage;
