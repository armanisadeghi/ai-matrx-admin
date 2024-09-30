// File location: @/app/admin/page.tsx

// Claud: https://claude.ai/chat/65014a2f-15f6-498a-8617-1e1cd94882fa

import {
    IconAdjustmentsBolt,
    IconCloud,
    IconCurrencyDollar,
    IconEaseInOut, IconHeart,
    IconHelp,
    IconRouteAltLeft,
    IconFunction
} from "@tabler/icons-react";
import React from "react";
import {FeatureSectionWithGradient} from "@/components/animated/my-custom-demos/feature-section-with-gradient";
// import FeatureSectionAnimatedGradient from "@/components/animated/feature-with-dynamic-grid/dynamic-feature-section";
import FeatureSectionAnimatedGradient from "@/components/animated/my-custom-demos/feature-section-animated-gradient";

export default function AdminPage() {
    const features = [
        {
            title: "Registered Function CRUD",
            description:
                "All CRUD Operations for Registered Functions.",
            icon: <IconFunction/>,
            link: "/admin/registered-functions",
        },
        {
            title: "Ease of use",
            description:
                "It's as easy as using an Apple, and as expensive as buying one.",
            icon: <IconEaseInOut/>,
        },
        {
            title: "Pricing like no other",
            description:
                "Our prices are best in the market. No cap, no lock, no credit card required.",
            icon: <IconCurrencyDollar/>,
        },
        {
            title: "100% Uptime guarantee",
            description: "We just cannot be taken down by anyone.",
            icon: <IconCloud/>,
        },
        {
            title: "Multi-tenant Architecture",
            description: "You can simply share passwords instead of buying new seats",
            icon: <IconRouteAltLeft/>,
        },
        {
            title: "24/7 Customer Support",
            description:
                "We are available a 100% of the time. Atleast our AI Agents are.",
            icon: <IconHelp/>,
        },
        {
            title: "Money back guarantee",
            description:
                "If you donot like EveryAI, we will convince you to like us.",
            icon: <IconAdjustmentsBolt/>,
        },
        {
            title: "And everything else",
            description: "I just ran out of copy ideas. Accept my sincere apologies",
            icon: <IconHeart/>,
        },
    ];
    return (
        <div className="py-20 lg:py-40 bg-neutral-100 dark:bg-neutral-900">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 max-w-7xl mx-auto">
                {features.map((feature, index) => (
                    <FeatureSectionAnimatedGradient
                        key={feature.title}
                        {...feature}
                        index={index}
                        link={feature.link}
                    />
                ))}
            </div>
        </div>
    );
}

