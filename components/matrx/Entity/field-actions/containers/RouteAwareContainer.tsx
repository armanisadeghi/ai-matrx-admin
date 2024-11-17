// containers/RouteAwareContainer.tsx
import {useRouter, usePathname, useSearchParams} from 'next/navigation';
import {ActionContainerManager} from "@/components/matrx/Entity/field-actions/containers/BaseContainer";
import {RouteConfig} from "@/components/matrx/Entity/field-actions/types";

interface RouteAwareContainerProps extends React.ComponentProps<typeof ActionContainerManager> {
    routeConfig?: RouteConfig;
}

export const RouteAwareContainer: React.FC<RouteAwareContainerProps> = (
    {
        routeConfig,
        children,
        ...props
    }) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Handle route-based visibility
    const isVisible = routeConfig ? pathname === routeConfig.path : true;

    const handleClose = () => {
        if (routeConfig) {
            router.back();
        }
        props.onClose?.();
    };

    if (!isVisible) {
        return null;
    }

    return (
        <ActionContainerManager
            {...props}
            onClose={handleClose}
        >
            {children}
        </ActionContainerManager>
    );
};

