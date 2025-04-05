import { NextRequest, NextResponse } from 'next/server';

// Provider-specific configuration types
interface ProviderConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
  tokenUrl: string;
  redirectUri: string;
  bodyFormat: 'json' | 'form';
  headers?: Record<string, string>;
  processResponseData?: (data: any) => any;
}

// Provider configurations
const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  slack: {
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    redirectUri: `${process.env.SLACK_REDIRECT_URL}/app_callback/slack`,
    bodyFormat: 'form',
    processResponseData: (data) => {
      if (!data.ok) {
        throw new Error(data.error || 'Slack API error');
      }
      return data;
    }
  },
  // You can add other providers here like notion, github, etc.
};

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider.toLowerCase();
    const body = await request.json();
    const { code } = body;

    // Validate request
    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Check if provider is supported
    if (!PROVIDER_CONFIGS[provider]) {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}` },
        { status: 400 }
      );
    }

    const config = PROVIDER_CONFIGS[provider];
    const { clientId, clientSecret, tokenUrl, redirectUri, bodyFormat, headers, processResponseData } = config;

    // Validate provider configuration
    if (!clientId || !clientSecret) {
      throw new Error(`${provider} client credentials are not configured`);
    }

    // Prepare request headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': bodyFormat === 'json' 
        ? 'application/json' 
        : 'application/x-www-form-urlencoded',
      ...(headers || {})
    };

    // Prepare request body
    let requestBody;
    if (bodyFormat === 'json') {
      requestBody = JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });
    } else {
      requestBody = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });
    }

    // Exchange the code for a token
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: requestBody
    });

    // Handle response errors
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error_description || errorData.error || `Failed to exchange code: ${response.status}`;
      } catch {
        errorMessage = `Failed to exchange code: ${response.status} ${errorText}`;
      }
      
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    // Parse and process response data
    let responseData = await response.json();
    
    // Apply provider-specific response processing if needed
    if (processResponseData) {
      try {
        responseData = processResponseData(responseData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error processing response';
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }
    }

    // Return the successful response
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider.toLowerCase();
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    // Redirect to the home page with the error
    return NextResponse.redirect(
      new URL(`/?provider=${provider}&error=${error}`, request.url)
    );
  }

  if (!code) {
    // Redirect to the home page with an error for missing code
    return NextResponse.redirect(
      new URL(`/?provider=${provider}&error=missing_code`, request.url)
    );
  }

  // Redirect to the home page with the code
  return NextResponse.redirect(
    new URL(`/?provider=${provider}&code=${code}`, request.url)
  );
}