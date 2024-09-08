import React from "react";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import Link from "next/link";

export function Matrix3DFeatureCard({ Icon, title, description, features }) {
    return (
        <CardContainer className="inter-var">
            <CardBody className="bg-gray-50 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-full h-full rounded-xl p-6 border">
                <CardItem translateZ="50" className="text-xl font-bold text-neutral-600 dark:text-white flex items-center gap-2">
                    <Icon className="w-6 h-6" />
                    {title}
                </CardItem>
                <CardItem
                    as="p"
                    translateZ="60"
                    className="text-neutral-500 text-sm mt-2 dark:text-neutral-300"
                >
                    {description}
                </CardItem>
                <CardItem translateZ="100" className="w-full mt-4">
                    <ul className="list-disc list-inside text-sm text-neutral-600 dark:text-neutral-200">
                        {features.map((feature, index) => (
                            <li key={index}>{feature}</li>
                        ))}
                    </ul>
                </CardItem>
                <div className="mt-8">
                    <CardItem
                        translateZ={20}
                        as={Link}
                        href="#"
                        className="px-4 py-2 rounded-xl bg-black dark:bg-white dark:text-black text-white text-xs font-bold inline-block"
                    >
                        Learn More →
                    </CardItem>
                </div>
            </CardBody>
        </CardContainer>
    );
}