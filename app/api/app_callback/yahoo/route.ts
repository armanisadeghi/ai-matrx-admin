import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`
        ).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_YAHOO_REDIRECT_URL}/app_callback/yahoo`,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.error_description || 'Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();

    // After getting the token, fetch user profile data
    const userResponse = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch user data');
      // Continue with just the token data
    } else {
      const userData = await userResponse.json();
      // Add user data to token response
      tokenData.user = {
        guid: userData.sub || tokenData.xoauth_yahoo_guid,
        familyName: userData.family_name,
        givenName: userData.given_name,
        displayName: userData.name,
        nickname: userData.nickname,
        emails: userData.email ? [
          { 
            handle: userData.email, 
            primary: true 
          }
        ] : []
      };
    }

    return res.status(200).json(tokenData);
  } catch (error) {
    console.error('Error exchanging Yahoo code for token:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}