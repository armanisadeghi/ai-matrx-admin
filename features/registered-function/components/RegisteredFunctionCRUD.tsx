// File location: @/features/registered-function/components/RegisteredFunctionCRUD.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRegisteredFunctionCRUD } from '../hooks/useRegisteredFunctionCRUD';
import { RegisteredFunctionType } from '@/types/registeredFunctionTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const RegisteredFunctionCRUD: React.FC = () => {
    const { registeredFunctions, loading, error, fetchAll, create, update, remove } = useRegisteredFunctionCRUD();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<RegisteredFunctionType>>({});

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            update({ ...formData, id: editingId } as RegisteredFunctionType);
        } else {
            create(formData as Omit<RegisteredFunctionType, 'id'>);
        }
        setFormData({});
        setEditingId(null);
    };

    const handleEdit = (rf: RegisteredFunctionType) => {
        setEditingId(rf.id);
        setFormData(rf);
    };

    const handleDelete = (id: string) => {
        remove(id);
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <h2>Registered Functions</h2>
            <form onSubmit={handleSubmit}>
                <Input
                    name="name"
                    value={formData.name || ''}
                    onChange={handleInputChange}
                    placeholder="Name"
                />
                <Input
                    name="modulePath"
                    value={formData.modulePath || ''}
                    onChange={handleInputChange}
                    placeholder="Module Path"
                />
                {/* Add more inputs for other fields */}
                <Button type="submit">{editingId ? 'Update' : 'Create'}</Button>
            </form>
            <ul>
                {registeredFunctions.map((rf) => (
                    <li key={rf.id}>
                        {rf.name} - {rf.modulePath}
                        <Button onClick={() => handleEdit(rf)}>Edit</Button>
                        <Button onClick={() => handleDelete(rf.id)}>Delete</Button>
                    </li>
                ))}
            </ul>
        </div>
    );
};
