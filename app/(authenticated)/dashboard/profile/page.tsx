// File: app/(authenticated)/dashboard/profile/hold-hold-page.tsx

'use client';

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/redux/store';
import { setUser } from '@/lib/redux/slices/userSlice';
import { Card, CardHeader, CardBody, CardFooter, Divider, Avatar, Button, Input } from "@nextui-org/react";
import { FaGoogle, FaGithub, FaPhone } from 'react-icons/fa';
import { MdEmail, MdEdit } from 'react-icons/md';

export default function ProfilePage() {
    const user = useSelector((state: RootState) => state.user);
    const dispatch = useDispatch();
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState(user);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        dispatch(setUser(editedUser));
        setIsEditing(false);
        // Here you would typically also send an API request to update the user data on the server
    };

    const handleCancel = () => {
        setEditedUser(user);
        setIsEditing(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedUser(prev => ({
            ...prev,
            userMetadata: {
                ...prev.userMetadata,
                [name]: value
            }
        }));
    };

    return (
        <div className="container mx-auto p-4">
            <Card className="max-w-[800px] mx-auto">
                <CardHeader className="flex gap-3">
                    <Avatar src={user.userMetadata.avatarUrl || user.userMetadata.picture || undefined} size="lg" />
                    <div className="flex flex-col">
                        <p className="text-md">{user.userMetadata.fullName || user.userMetadata.name || 'User'}</p>
                        <p className="text-small text-default-500">{user.email}</p>
                    </div>
                </CardHeader>
                <Divider/>
                <CardBody>
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
                            {isEditing ? (
                                <>
                                    <Input
                                        label="Full Name"
                                        name="fullName"
                                        value={editedUser.userMetadata.fullName || ''}
                                        onChange={handleChange}
                                        className="mb-2"
                                    />
                                    <Input
                                        label="Preferred Username"
                                        name="preferredUsername"
                                        value={editedUser.userMetadata.preferredUsername || ''}
                                        onChange={handleChange}
                                        className="mb-2"
                                    />
                                </>
                            ) : (
                                <>
                                    <p><strong>Full Name:</strong> {user.userMetadata.fullName || 'Not set'}</p>
                                    <p><strong>Preferred Username:</strong> {user.userMetadata.preferredUsername || 'Not set'}</p>
                                </>
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
                            <p><MdEmail className="inline mr-2" />{user.email}</p>
                            <p><FaPhone className="inline mr-2" />{user.phone || 'Not provided'}</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Account Information</h3>
                            <p><strong>User ID:</strong> {user.id}</p>
                            <p><strong>Email Confirmed:</strong> {user.emailConfirmedAt ? 'Yes' : 'No'}</p>
                            <p><strong>Last Sign In:</strong> {new Date(user.lastSignInAt || '').toLocaleString()}</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Linked Accounts</h3>
                            {user.appMetadata.providers.map((provider, index) => (
                                <div key={index} className="flex items-center mb-2">
                                    {provider === 'google' ? <FaGoogle className="mr-2" /> : <FaGithub className="mr-2" />}
                                    <span className="capitalize">{provider}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardBody>
                <Divider/>
                <CardFooter>
                    {isEditing ? (
                        <>
                            <Button color="primary" onPress={handleSave}>Save</Button>
                            <Button color="secondary" onPress={handleCancel} className="ml-2">Cancel</Button>
                        </>
                    ) : (
                        <Button color="primary" onPress={handleEdit} startContent={<MdEdit />}>Edit Profile</Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
