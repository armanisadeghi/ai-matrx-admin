import {LucideIcon} from "lucide-react";
import React from "react";
import {CardBody, CardContainer, CardItem} from "@/components/ui/3d-card";

interface FeatureCardProps {
    Icon: LucideIcon;
    title: string;
    description: string;
    features?: string[];
}

const FeatureCard: React.FC<FeatureCardProps> = ({ Icon, title, description, features }) => (
    <CardContainer className="inter-var">
        <CardBody className="bg-background relative group/card dark:hover:shadow-2xl dark:hover:shadow-primary/[0.1] border-border w-full h-full rounded-xl p-6 border">
            <CardItem translateZ="50" className="text-primary w-12 h-12 mb-4">
                <Icon className="w-full h-full" />
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

export default FeatureCard;
