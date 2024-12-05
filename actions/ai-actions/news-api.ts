'use server'

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

export async function fetchNews(category: string = 'general', country: string = 'us') {
    try {
        const apiUrl = `https://newsapi.org/v2/top-headlines?category=${category}&country=${country}&apiKey=${process.env.NEWS_API_KEY}`;
        const res = await fetch(apiUrl);

        if (!res.ok) {
            console.error(`Failed to fetch news: ${res.statusText}`);
            return { error: 'Failed to fetch news', status: res.status };
        }

        const data = await res.json();
        return { data, status: 200 };
    } catch (error) {
        console.error('Error fetching news:', error);
        return { error: 'Internal server error', status: 500 };
    }
}

export async function handleFetchNews(formData: FormData) {
    const category = (formData.get('category') as string) || 'general';
    const country = (formData.get('country') as string) || 'us';

    const result = await fetchNews(category, country);

    if (result.error) {
        // Optionally redirect to an error page or return an error
        redirect('/error');
    }

    // Example: Revalidate a specific path if needed
    revalidatePath('/news');
    return NextResponse.json(result.data);
}
