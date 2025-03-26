"use client";

import React from "react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownSection, DropdownItem, Button } from "@heroui/react";
import { Icon } from "@iconify/react";

export default function ModelDropdown() {
    return (
        <Dropdown className="bg-content1">
            <DropdownTrigger>
                <Button
                    className="min-w-[120px] text-default-400"
                    endContent={<Icon className="text-default-400" height={20} icon="solar:alt-arrow-down-linear" width={20} />}
                    variant="light"
                >
                    MATRX v4
                </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Dropdown menu with icons" className="px-0 py-[16px]" variant="faded">
                <DropdownSection
                    classNames={{
                        heading: "text-tiny px-[10px]",
                    }}
                    title="Model"
                >
                    <DropdownItem
                        key="matrx-v4"
                        className="text-default-500 data-[hover=true]:text-default-500"
                        classNames={{
                            description: "text-default-500 text-tiny",
                        }}
                        description="Newest and most advanced model"
                        endContent={
                            <Icon className="text-default-foreground" height={24} icon="solar:check-circle-bold" width={24} />
                        }
                        startContent={
                            <Icon className="text-default-400" height={24} icon="solar:star-rings-linear" width={24} />
                        }
                    >
                        MATRX v4
                    </DropdownItem>

                    <DropdownItem
                        key="matrx-v3.5"
                        className="text-default-500 data-[hover=true]:text-default-500"
                        classNames={{
                            description: "text-default-500 text-tiny",
                        }}
                        description="Advanced model for complex tasks"
                        startContent={
                            <Icon className="text-default-400" height={24} icon="solar:star-shine-outline" width={24} />
                        }
                    >
                        MATRX v3.5
                    </DropdownItem>

                    <DropdownItem
                        key="matrx-v3"
                        className="text-default-500 data-[hover=true]:text-default-500"
                        classNames={{
                            description: "text-default-500 text-tiny",
                        }}
                        description="Great for everyday tasks"
                        startContent={<Icon className="text-default-400" height={24} icon="solar:star-linear" width={24} />}
                    >
                        MATRX v3
                    </DropdownItem>
                </DropdownSection>
            </DropdownMenu>
        </Dropdown>
    );
}