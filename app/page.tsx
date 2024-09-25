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
import {CardBody, CardContainer, CardItem} from "@/components/ui/3d-card";
import Link from 'next/link';
import {Cover} from "@/components/ui/cover";
import {BackgroundBeamsWithCollision} from "@/components/ui/background-beams-with-collision";
import {StandaloneThemeSwitcher} from "@/components/StandaloneThemeSwitcher";
import {SimplePricingWithFourTiers, SimplePricingWithThreeTiers} from "@/components/packs/PricingSection";
import { LogoHorizontal } from '@/public/MatrixLogo';

interface TopMenuProps {
}

const TopMenu: React.FC<TopMenuProps> = () => {
    return (
        <header
            className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
                <div className="flex items-center space-x-4">
                    <LogoHorizontal size="lg" />
                    <nav className="hidden md:flex space-x-4">
                        <a href="#" className="text-foreground/60 hover:text-foreground">Solution</a>
                        <a href="#" className="text-foreground/60 hover:text-foreground">Developers</a>
                        <a href="#" className="text-foreground/60 hover:text-foreground">Pricing</a>
                        <a href="#" className="text-foreground/60 hover:text-foreground">Docs</a>
                        <a href="#" className="text-foreground/60 hover:text-foreground">Blog</a>
                    </nav>
                </div>

                <div className="flex items-center space-x-3">
                    <StandaloneThemeSwitcher initialTheme={'dark'}/>
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
    <CardContainer className="inter-var">
        <CardBody
            className="bg-background relative group/card dark:hover:shadow-2xl dark:hover:shadow-primary/[0.1] border-border w-full h-full rounded-xl p-6 border">
            <CardItem translateZ="50" className="text-primary w-12 h-12 mb-4">
                <Icon className="w-full h-full"/>
            </CardItem>
            <CardItem
                translateZ="60"
                className="text-xl font-bold text-foreground"
            >
                {title}
            </CardItem>
            <CardItem
                as="p"
                translateZ="70"
                className="text-muted-foreground text-sm mt-2"
            >
                {description}
            </CardItem>
            {features && (
                <CardItem translateZ="80" className="mt-4">
                    <ul className="space-y-2">
                        {features.map((feature, index) => (
                            <li key={index} className="flex items-center">
                                <span className="text-primary mr-2">✓</span> {feature}
                            </li>
                        ))}
                    </ul>
                </CardItem>
            )}
        </CardBody>
    </CardContainer>
);

const HomePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <TopMenu/>
            <main className="container mx-auto px-4 py-16 text-center">
                {/*<h1 className="text-6xl font-bold mb-4">AI Matrx</h1>*/}
                <div>
                    <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-semibold max-w-7xl mx-auto text-center mt-6 relative z-20 py-6 bg-clip-text text-transparent bg-gradient-to-b from-neutral-800 via-neutral-700 to-neutral-700 dark:from-neutral-800 dark:via-white dark:to-white">
                        Redefining Enterprise AI
                        <span className="block mb-4"></span>
                        with <Cover>NO CODE</Cover>
                    </h1>
                </div>

                {/*<h2 className="text-4xl font-semibold mb-6">Redefining Enterprise AI Integration</h2>*/}
                <p className="text-xl mb-10 max-w-3xl mx-auto">
                    Empower your business with a no-code AI platform that orchestrates, automates, and elevates your
                    processes. Bridge the gap between AI potential and real-world business needs.
                </p>
                <div className="flex justify-center gap-4 mb-16">
                    <button className="p-[3px] relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg"/>
                        <div
                            className="px-8 py-2 bg-black rounded-[6px]  relative group transition duration-200 text-white hover:bg-transparent">
                            Start Free Trial
                        </div>
                    </button>
                    <button
                        className="shadow-[0_0_0_3px_#000000_inset] px-6 py-2 bg-transparent border border-black dark:border-white dark:text-white text-black rounded-lg font-bold transform hover:-translate-y-1 transition duration-400">
                        Request Demo
                    </button>

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
                <BackgroundBeamsWithCollision>
                    <div className="w-full py-20 relative z-20">
                        <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold text-center text-black dark:text-white font-sans tracking-tight mb-12">
                            Why Enterprise Leaders Choose{" "}
                            <div
                                className="relative mx-auto inline-block w-max [filter:drop-shadow(0px_1px_3px_rgba(27,_37,_80,_0.14))]">
                                <div
                                    className="absolute left-0 top-[1px] bg-clip-text bg-no-repeat text-transparent bg-gradient-to-r py-4 from-purple-500 via-violet-500 to-pink-500 [text-shadow:0_0_rgba(0,0,0,0.1)]">
                                    <span className="">AI Matrx</span>
                                </div>
                                <div
                                    className="relative bg-clip-text text-transparent bg-no-repeat bg-gradient-to-r from-purple-500 via-violet-500 to-pink-500 py-4">
                                    <span className="">AI Matrx</span>
                                </div>
                            </div>
                        </h2>
                        <ul className="space-y-6 max-w-4xl mx-auto text-left px-4">
                            <li className="flex items-start">
                                <span className="text-primary text-2xl mr-4 mt-1">✓</span>
                                <span className="text-xl"><strong className="font-semibold">Rapid ROI:</strong> Deploy AI solutions in hours, not months, accelerating time-to-value.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary text-2xl mr-4 mt-1">✓</span>
                                <span className="text-xl"><strong className="font-semibold">No-Code Simplicity:</strong> Empower your team to build sophisticated AI applications without extensive technical knowledge.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary text-2xl mr-4 mt-1">✓</span>
                                <span className="text-xl"><strong
                                    className="font-semibold">Enterprise-Grade Security:</strong> Ensure data protection and compliance with robust security measures.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary text-2xl mr-4 mt-1">✓</span>
                                <span className="text-xl"><strong
                                    className="font-semibold">Scalable Performance:</strong> Seamlessly handle growing demands as your AI initiatives expand.</span>
                            </li>
                        </ul>
                    </div>
                </BackgroundBeamsWithCollision>

                <SimplePricingWithFourTiers/>

            </main>
        </div>
    );
};

export default HomePage;
