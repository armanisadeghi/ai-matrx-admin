"use client"

import {IconClock, IconStar} from "@tabler/icons-react";
import {ComponentProps} from "react";
import {IWorkspace} from "@/app/kelvin/code-editor/version-1/types";
import { useRouter } from "next/navigation";

interface Props extends ComponentProps<"div">, Partial<IWorkspace> {}

export const WorkspaceCard = ({
                                  workspaceId,
                                  title,
                                  description,
                                  icon: Icon,
                                  lastUpdated,
                                  stars,
                                  template,
                                  ...others
                              }: Props) => {
    const router = useRouter();

    const handleClick = () => {
        if (template) {
            // Handle template selection differently if needed
            console.log("Template selected:", workspaceId);
            return;
        }
        router.push(`/kelvin/code-editor/version-1/workspace/${workspaceId}`);
    };

    return <div
        className="p-4 border border-neutral-700 rounded-lg hover:border-neutral-500 transition-colors cursor-pointer"
        onClick={handleClick}
        {...others}
    >
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-neutral-800 rounded-lg">
                <Icon size={24} />
            </div>
            <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-neutral-400">{description}</p>
            </div>
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm text-neutral-400">
            <div className="flex items-center gap-1">
                <IconClock size={16} />
                {lastUpdated}
            </div>
            {stars && (
                <div className="flex items-center gap-1">
                    <IconStar size={16} />
                    {stars}
                </div>
            )}
        </div>
    </div>
}