'use client';

import React, { useEffect, useState } from 'react';
import NextWindowManager from "@/components/matrx/next-windows";

export default function TesterTwo() {
    const [testPages, setTestPages] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/test-pages')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                setTestPages(data);
            })
            .catch(error => {
                console.error('Error fetching test pages:', error);
                setError(error.message);
            });
    }, []);

    if (error) {
        return (
            <div className="container mx-auto py-8">
                <h1 className="text-3xl font-bold mb-6">Error</h1>
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Test Pages</h1>
            {testPages.length > 0 ? (
                <NextWindowManager windows={testPages} />
            ) : (
                <p>No test pages found.</p>
            )}
        </div>
    );
}
