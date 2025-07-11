import { cn } from '@/lib/utils';
import { AppletTheme } from '@/components/applet/reusable-sections/applet-themes';

interface HeroSectionProps {
    title?: string;
    description?: string;
    appletTheme: AppletTheme;
    className?: string;
}

export const BasicHeroSection = ({
    title = "Let's Get Started",
    description = 'Please provide the following information to get started.',
    appletTheme,
    className
}: HeroSectionProps) => {
    return (
        <div 
            className={cn(
                'w-full rounded-lg',
                appletTheme.containerBg,
                appletTheme.containerBorder,
                className
            )}
        >
            <div className="pl-4 py-2">
                <h1 
                    className={cn(
                        appletTheme.titleBasics,
                        appletTheme.titleText,
                        appletTheme.titleSize
                    )}
                >
                    {title}
                </h1>
                <p 
                    className={cn(
                        appletTheme.descriptionBasics,
                        appletTheme.descriptionText,
                        appletTheme.descriptionSize
                    )}
                >
                    {description}
                </p>
            </div>
        </div>
    );
};


export const AppletHeroSections = {
    BASIC: BasicHeroSection,
}

export type AppletHeroSectionType = keyof typeof AppletHeroSections;
