'use client';

import { getCurrentParsedPathName } from "@/utils/client-nav-utils";
import { Breadcrumbs, BreadcrumbItem } from "@heroui/react";
import { Component, ChevronRight } from "lucide-react";
import Link from "next/link";
import React from "react";

const AutoBreadcrumbs = () => {
    const pathParts = getCurrentParsedPathName();

    return (
        <Breadcrumbs
            className="gap-1"
            classNames={{
                list: "gap-1",
            }}
            separator={<ChevronRight className="w-4 h-4 text-default-400" />}
            itemClasses={{
                item: [
                    "px-2 py-0.5 border-small border-default-400 rounded-small",
                    "data-[current=true]:bg-default-200 data-[current=true]:text-default-foreground",
                    "data-[disabled=true]:border-default-400 data-[disabled=true]:bg-default-100",
                ],
            }}
            size="sm"
        >
            {pathParts.map((part, index) => (
                <BreadcrumbItem
                    key={part.id}
                    startContent={index === 0 ? <Component className="w-4 h-4" /> : undefined}
                    isCurrent={part.isLast}
                >
                    {part.isLast ? (
                        <span>{part.name}</span>
                    ) : (
                        <Link href={part.href}>
                            {part.name}
                        </Link>
                    )}
                </BreadcrumbItem>
            ))}
        </Breadcrumbs>
    );
};

export default AutoBreadcrumbs;