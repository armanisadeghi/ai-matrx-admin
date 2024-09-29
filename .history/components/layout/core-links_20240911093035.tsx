import {FlaskConical, Home, Settings, SquareFunction, Users} from "lucide-react";
import React from "react";

export const coreAppLinks = [
    {
        label: 'Home',
        href: '/dashboard',
        icon: (
            <Home className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Users', href: '/dashboard/users', icon: (
            <Users className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Settings', href: '/dashboard/settings', icon: (
            <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Manage Admin Functions', href: '/admin/registered-functions', icon: (
            <SquareFunction className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'Developer Tests', href: '/tests', icon: (
            <FlaskConical className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
    {
        label: 'AI Playground', href: '/playground', icon: (
            <SquareFunction className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
        ),
    },
];
