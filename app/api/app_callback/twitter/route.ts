import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  
  // Mocks
  const userData = {
    id: '123456789',
    name: 'Jane Smith',
    username: 'janesmith',
    profile_image_url: 'https://example.com/profile.jpg',
    verified: true
  };
  
  return NextResponse.json({
    access_token: 'AAAA...MOCK_TWITTER_TOKEN',
    token_type: 'bearer',
    expires_in: 7200,
    refresh_token: 'RRRR...MOCK_REFRESH_TOKEN',
    scope: 'tweet.read users.read offline.access',
    user: userData
  });
}