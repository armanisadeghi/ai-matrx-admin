import React from "react";
import {ExternalLink} from "lucide-react";
import { addUtmSource } from "@/utils/url-utm";

const LinkWrapper = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isExternal = href.startsWith('http');
    const finalHref = isExternal ? addUtmSource(href) : href;
    return (
        <a
            href={finalHref}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="text-primary hover:underline inline-flex items-center gap-1"
        >
            {children}
            {isExternal && <ExternalLink className="h-3 w-3" />}
        </a>
    );
};

export default LinkWrapper;
