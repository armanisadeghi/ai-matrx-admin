// components/ActionLink.tsx
import Link from 'next/link';
import {RouteConfig} from "@/components/matrx/Entity/field-actions/types";
import {useActionRouting} from "@/components/matrx/Entity/field-actions/hooks/useActionRouting";


interface ActionLinkProps {
    config: RouteConfig;
    children: React.ReactNode;
    className?: string;
}

export const ActionLink: React.FC<ActionLinkProps> = (
    {
        config,
        children,
        className
    }) => {
    const {getActionUrl} = useActionRouting();

    return (
        <Link
            href={getActionUrl(config)}
            className={className}
            prefetch={config.prefetch}
        >
            {children}
        </Link>
    );
};
