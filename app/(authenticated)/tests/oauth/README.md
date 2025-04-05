# Generic OAuth Integration System

A flexible, extensible OAuth integration system for Next.js applications that allows easy connection to multiple OAuth providers like Slack, GitHub, Notion, and more. The system is built with reusability in mind, allowing you to add new OAuth providers with minimal code changes.

## Features

- 🔌 Generic OAuth implementation that works across providers
- 🔄 Unified authentication flow for all OAuth services
- 📦 Modular component architecture for easy extension
- 🔒 Secure token handling with server-side exchange
- 📱 Responsive UI with Tailwind CSS
- 🚀 Type-safe with full TypeScript support

## Directory Structure

```
app/
├── api/
│   └── app_callback/
│       └── [provider]/
│           └── route.ts      # Generic OAuth callback handler
├── (authenticated)
├──── tests
├────── oauth
├────── components/
│   └──── OAuthProvider.tsx     # Reusable OAuth UI component
├────── providers/
│   └──── providers.tsx         # Provider configurations
├────── types/
│   └──── oauth.ts              # Type definitions
├────── utils/
│   └──── oauth.ts              # OAuth utility functions
└────── page.tsx                  # Main page with all providers
```

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up the environment variables in `.env.local` (see Configuration section)
4. Run the development server:
   ```
   npm run dev
   ```

## Configuration

### Environment Variables

Create a `.env.local` file with your OAuth credentials:

```
# Slack OAuth Credentials
NEXT_PUBLIC_SLACK_CLIENT_ID=your_slack_client_id
NEXT_PUBLIC_SLACK_REDIRECT_URL=your_app_url
SLACK_REDIRECT_URL=your_app_url
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret

# Add other providers as needed
# GitHub Example:
# NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
# GITHUB_CLIENT_ID=your_github_client_id
# GITHUB_CLIENT_SECRET=your_github_client_secret
```

## Setting Up a Slack App

Follow these steps to create and configure a Slack app for integration:

1. **Create a Slack App**
   - Go to [https://api.slack.com/apps](https://api.slack.com/apps)
   - Click "Create New App"
   - Choose "From scratch"
   - Enter a name for your app and select the workspace where you'll develop your app
   - Click "Create App"

2. **Configure OAuth & Permissions**
   - In the sidebar, click "OAuth & Permissions"
   - Under "Redirect URLs", add your callback URL:
     ```
     https://your-domain.com/app_callback/slack
     ```
     (For local development, you might use ngrok, tunnelmole, or similar tools to get a public URL)
   - Scroll down to "Bot Token Scopes" and add the following scopes:
     - `chat:write` (Send messages as the app)
     - `channels:read` (View channels in a workspace)
     - `team:read` (View information about a workspace)
     - `users:read` (View users in a workspace)
   - Click "Save Changes"

3. **Install App to Workspace**
   - Scroll back to the top of the OAuth & Permissions page
   - Click "Install to Workspace"
   - Review the permissions and click "Allow"

4. **Get Credentials**
   - After installation, you'll be redirected to the OAuth & Permissions page
   - Copy the "Bot User OAuth Token" (not needed for our implementation)
   - Go to "Basic Information" in the sidebar
   - Under "App Credentials", note your "Client ID" and "Client Secret"
   - Add these credentials to your `.env.local` file

5. **Important Notes for Development**
   - During development, your app can only be installed to the workspace where it was created
   - If you encounter the `invalid_team_for_non_distributed_app` error, make sure you're trying to install on the same workspace where the app was created
   - For production, you'll need to distribute your app (see Troubleshooting section)

## Usage

### Connecting to OAuth Providers

1. Navigate to the main page of your application
2. Click on the "Connect to [Provider]" button for the desired service
3. Authorize the application on the provider's OAuth page
4. You'll be redirected back to your application with the connection established

### Viewing Connection Details

- After connecting, you'll see provider-specific information displayed
- Toggle token visibility with the "Show/Hide Token" button
- The token is also logged to the browser console for easy access during development

### Disconnecting

- Click the "Disconnect" button to remove the connection
- This only affects the client-side state; no server-side revocation is performed

## Adding New OAuth Providers

To add a new OAuth provider (e.g., GitHub, Notion):

1. **Add provider config** in `app/config/providers.tsx`:
   ```typescript
   github: {
     name: 'GitHub',
     clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
     authUrl: 'https://github.com/login/oauth/authorize',
     redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/app_callback/github`,
     scopes: ['repo', 'user'],
     scopeDelimiter: ' ',
     color: 'gray-800',
     textColor: 'white',
     iconSvg: (/* SVG icon */)
   }
   ```

2. **Add provider config** in the route handler:
   ```typescript
   // In app/(public)/app_callback/[provider]/route.ts
   github: {
     clientId: process.env.GITHUB_CLIENT_ID,
     clientSecret: process.env.GITHUB_CLIENT_SECRET,
     tokenUrl: 'https://github.com/login/oauth/access_token',
     redirectUri: `${process.env.APP_URL}/app_callback/github`,
     bodyFormat: 'json',
     headers: {
       'Accept': 'application/json'
     },
     // Optional custom handler for additional API calls
     processResponseData: async (tokenData) => {
       // Fetch user data with the token
       const userResponse = await fetch('https://api.github.com/user', {
         headers: {
           'Authorization': `token ${tokenData.access_token}`,
           'Accept': 'application/vnd.github.v3+json'
         }
       });
       
       if (!userResponse.ok) {
         throw new Error('Failed to fetch user data');
       }
       
       const userData = await userResponse.json();
       return { ...tokenData, user: userData };
     }
   }
   ```

3. **Add provider types** in `app/types/oauth.ts`:
   ```typescript
   export interface GitHubUser {
     id: number;
     login: string;
     name: string;
     // other fields...
   }

   export interface GitHubTokenResponse extends OAuthBaseResponse {
     user?: GitHubUser;
   }
   ```

4. **Add provider-specific rendering** in `OAuthProvider.tsx`:
   ```typescript
   function renderGitHubData(data: any) {
     return (
       <div className="mb-4">
         <h3 className="text-lg font-semibold mb-2">User Information</h3>
         {/* Render GitHub-specific data */}
       </div>
     );
   }

   // Then in the renderProviderData function:
   case 'github':
     return renderGitHubData(data);
   ```

## Troubleshooting

### `invalid_team_for_non_distributed_app` Error

This error occurs when trying to install your Slack app on a workspace different from where it was created.

**Solutions:**
1. **For development:** Make sure you're testing with the workspace where you created the app
2. **For production:** Distribute your app
   - Go to your app's settings page
   - Click "Manage Distribution" in the sidebar
   - Fill out the required information (app name, description, etc.)
   - Submit for review

### Common OAuth Issues

1. **Redirect URI Mismatch**
   - Ensure the redirect URI in your provider settings exactly matches what's in your code
   - Check for trailing slashes, http vs https, etc.

2. **Missing Scopes**
   - If you're getting unauthorized errors, check that you've requested all needed scopes
   - Some APIs require specific combinations of scopes

3. **Rate Limiting**
   - Many OAuth providers have rate limits for token exchanges
   - Add error handling and consider implementing retry logic for production

## Changelog

### v1.0.0 - Initial Release
- Generic OAuth implementation with support for multiple providers
- Complete Slack integration
- Reusable components and type definitions
- Comprehensive documentation

## License

MIT