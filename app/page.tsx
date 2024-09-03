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
                        <Button variant="secondary">Dashboard</Button>
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
                <h2 className="text-4xl font-semibold mb-4">Revolutionizing Business AI Integration</h2>
                <p className="text-xl mb-8 max-w-3xl mx-auto">
                    Bridge the gap between AI capabilities and real-world business needs. Orchestrate, automate, and elevate your AI-driven processes without coding.
                </p>
                <div className="flex justify-center gap-4 mb-12">
                    <Button size="lg">Get Started</Button>
                    <Button size="lg" variant="outline">Schedule Demo</Button>
                </div>

                <div className="flex justify-center flex-wrap gap-8 my-16">
                    <p className="font-semibold">Transforming Businesses With:</p>
                    {[
                        'AI Orchestration',
                        'No-Code Development',
                        'Enterprise Scalability',
                        'Workflow Automation'
                    ].map((feature, index) => (
                        <div key={index} className="text-muted-foreground font-medium">{feature}</div>
                    ))}
                </div>

                <div className="grid md:grid-cols-3 gap-8 text-left">
                    <FeatureCard
                        Icon={Wand2}
                        title="Unmatched AI Orchestration"
                        description="Combine and customize outputs from multiple AI models for superior quality and relevance."
                        features={['Multi-model Integration', 'Customizable Solutions', 'Elevated AI Outputs']}
                    />
                    <FeatureCard
                        Icon={Code}
                        title="No-Code AI Development"
                        description="Build sophisticated AI applications effortlessly with our user-friendly, no-code platform."
                        features={['Intuitive Interface', 'Advanced Functionality', 'Rapid Deployment']}
                    />
                    <FeatureCard
                        Icon={ArrowUpCircle}
                        title="Enterprise-Grade Scalability"
                        description="Handle intense demands and scale seamlessly to foster business growth across your organization."
                        features={['High Performance', 'Flexible Scaling', 'Enterprise-Ready']}
                    />
                    <FeatureCard
                        Icon={Brain}
                        title="Self-Improving AI System"
                        description="Our AI continuously learns from each task, refining models and improving accuracy over time."
                        features={['Continuous Learning', 'Increased Efficiency', 'Adaptive Intelligence']}
                    />
                    <FeatureCard
                        Icon={Workflow}
                        title="Seamless Workflow Integration"
                        description="Connect with over 1,000 APIs for streamlined operations and enhanced productivity."
                        features={['1000+ API Integrations', 'Streamlined Processes', 'Enhanced Productivity']}
                    />
                    <FeatureCard
                        Icon={Rocket}
                        title="Rapid Application Development"
                        description="Create powerful AI applications in hours, not months, with full database integration and state management."
                        features={['Accelerated Development', 'Full Database Integration', 'Complete Control']}
                    />
                    <FeatureCard
                        Icon={Zap}
                        title="AI-Powered Task Handling"
                        description="Streamline communication and employ cutting-edge AI for effective task management across your business."
                        features={['Smart Task Allocation', 'Efficient Processing', 'Automated Workflows']}
                    />
                    <FeatureCard
                        Icon={Shield}
                        title="Robust Security & Compliance"
                        description="Ensure data protection and maintain compliance with enterprise-grade security measures."
                        features={['Data Encryption', 'Compliance Ready', 'Secure Integrations']}
                    />
                    <FeatureCard
                        Icon={ChartBar}
                        title="Real-Time Analytics & Insights"
                        description="Gain valuable insights with instant analytics and ML-driven trend forecasting for strategic decision-making."
                        features={['Instant Analytics', 'Trend Forecasting', 'Data-Driven Decisions']}
                    />
                </div>
            </main>
        </div>
    );
};

export default HomePage;
