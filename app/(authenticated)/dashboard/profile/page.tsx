// File: app/(authenticated)/dashboard/profile/hold-hold-page.tsx

'use client';

import React, { useState } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectUser } from '@/lib/redux/selectors/userSelectors';
import { User, Mail, Phone, Check, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import UnderConstructionBanner from '@/components/ui/UnderConstructionBanner';
import { FaGoogle, FaGithub } from 'react-icons/fa';

// Map of provider names to their icons, colors, and background colors
const providerStyles: Record<string, { icon: React.ReactNode, color: string, bgLight: string, bgDark: string }> = {
  google: {
    icon: <FaGoogle size={14} />,
    color: 'text-red-600 dark:text-red-400', 
    bgLight: 'bg-red-50',
    bgDark: 'dark:bg-red-900/20',
  },
  github: {
    icon: <FaGithub size={14} />,
    color: 'text-gray-800 dark:text-gray-200',
    bgLight: 'bg-gray-100',
    bgDark: 'dark:bg-gray-800',
  },
};

// Default provider style for unknown providers
const defaultProviderStyle = {
  icon: <User size={14} />,
  color: 'text-blue-600 dark:text-blue-400',
  bgLight: 'bg-blue-50',
  bgDark: 'dark:bg-blue-900/20',
};

export default function ProfilePage() {
    const user = useAppSelector(selectUser);
    
    // Helper function to get provider style
    const getProviderStyle = (provider: string) => {
        return providerStyles[provider.toLowerCase()] || defaultProviderStyle;
    };
    
    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <Link href="/dashboard" className="flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mb-6">
                <ArrowLeft size={16} className="mr-2" />
                <span>Back to Dashboard</span>
            </Link>

            <UnderConstructionBanner title="Profile Preview" message="The user profile management system is currently in development. Some features may be limited or non-functional at this time. You can blame Arman." /> 

            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-md dark:shadow-zinc-800/20 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-zinc-700">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Profile</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your personal information</p>
                </div>
                
                <div className="p-6">
                    <div className="flex items-center mb-8">
                        <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                            {user.userMetadata.picture ? (
                                <img 
                                    src={user.userMetadata.picture} 
                                    alt="Profile" 
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <User size={40} className="text-gray-400 dark:text-gray-500" />
                            )}
                        </div>
                        <div className="ml-6">
                            <h2 className="text-xl font-semibold">
                                {user.userMetadata.fullName || user.userMetadata.name || 'User'}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                            <button className="mt-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium">
                                Change Photo
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Full Name
                            </label>
                            <input 
                                type="text" 
                                value={user.userMetadata.fullName || ''} 
                                readOnly
                                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-gray-50 dark:bg-zinc-700 text-gray-800 dark:text-gray-200"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Preferred Username
                            </label>
                            <input 
                                type="text" 
                                value={user.userMetadata.preferredUsername || ''} 
                                readOnly
                                className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-gray-50 dark:bg-zinc-700 text-gray-800 dark:text-gray-200"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email Address
                            </label>
                            <div className="flex items-center">
                                <input 
                                    type="email" 
                                    value={user.email || ''} 
                                    readOnly
                                    className="w-full p-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-gray-50 dark:bg-zinc-700 text-gray-800 dark:text-gray-200"
                                />
                                {user.emailConfirmedAt && (
                                    <span className="ml-2 flex items-center text-green-600 dark:text-green-400 text-sm">
                                        <Check size={14} className="mr-1" /> Verified
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-zinc-750 rounded-lg p-4 mb-6">
                        <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Account Information</h3>
                        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                            <div className="flex items-start">
                                <div className="w-40 flex-shrink-0">User ID:</div>
                                <div className="flex-1 font-mono text-xs">{user.id}</div>
                            </div>
                            <div className="flex items-center">
                                <div className="w-40 flex-shrink-0">Last Sign In:</div>
                                <div className="flex items-center">
                                    <Clock size={14} className="mr-1" />
                                    <span>{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : 'Never'}</span>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <div className="w-40 flex-shrink-0">Auth Providers:</div>
                                <div>
                                    {user.appMetadata.providers?.map((provider, index) => (
                                        <span key={index} className="inline-block px-2 py-1 mr-2 bg-gray-200 dark:bg-zinc-700 rounded-md text-xs capitalize">
                                            {provider}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 rounded-lg font-medium">
                            Edit Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
