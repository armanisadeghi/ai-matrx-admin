import React from "react";
import {ExternalLink} from "lucide-react";

const LinkWrapper = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isExternal = href.startsWith('http');
    return (
        <a
            href={href}
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
