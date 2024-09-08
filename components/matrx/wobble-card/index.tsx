import React from "react";
import Image from "next/image";
import Link from "next/link";
import { WobbleCard } from "@/components/ui/wobble-card";

const colorSchemes = [
    "contrast-red",
    "contrast-blue",
    "contrast-green",
    "contrast-violet",
    "contrast-yellow"
];

const CardContent = ({ title, description, imageSrc }) => (
    <>
        <div className="max-w-xs">
            <h2 className="text-left text-balance text-base md:text-xl lg:text-3xl font-semibold tracking-[-0.015em] text-white">
                {title}
            </h2>
            <p className="mt-4 text-left text-base/6 text-neutral-200">
                {description}
            </p>
        </div>
        {imageSrc && (
            <Image
                src={imageSrc}
                width={500}
                height={500}
                alt={`${title} image`}
                className="absolute -right-4 lg:-right-[40%] grayscale filter -bottom-10 object-contain rounded-2xl"
            />
        )}
    </>
);

export function MatrxWobbleCard({ cards }) {
    const getCardSpan = (index) => {
        const rowPosition = index % 6;
        if (rowPosition === 0 || rowPosition === 1) return "col-span-1 lg:col-span-2";
        if (rowPosition === 2) return "col-span-1";
        return "col-span-1 lg:col-span-1";
    };

    const getCardHeight = (index) => {
        const rowPosition = index % 6;
        if (rowPosition === 0 || rowPosition === 1) return "min-h-[500px] lg:min-h-[300px]";
        if (rowPosition === 2) return "min-h-[300px]";
        return "min-h-[200px] lg:min-h-[250px]";
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl mx-auto w-full">
            {cards.map((card, index) => {
                const colorScheme = colorSchemes[index % colorSchemes.length];
                return (
                    <Link href={card.href} key={index} className="no-underline">
                        <WobbleCard
                            containerClassName={`${getCardSpan(index)} ${getCardHeight(index)} ${colorScheme} h-full`}
                            className=""
                        >
                            <CardContent
                                title={card.title}
                                description={card.description}
                                imageSrc={card.imageSrc}
                            />
                        </WobbleCard>
                    </Link>
                );
            })}
        </div>
    );
}