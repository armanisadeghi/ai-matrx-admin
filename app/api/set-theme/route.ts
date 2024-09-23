// File: @/app/api/set-theme/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    const { theme } = await request.json();

    // Set the theme cookie
    cookies().set('theme', theme, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
    });

    return NextResponse.json({ success: true });
}
