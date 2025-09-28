# Static Site Deployment Setup

This guide helps you set up the static site deployment functionality that allows you to deploy HTML pages directly from the HTML Preview Modal to your mymatrx.com static site.

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Your custom API key for deploying to the static site
NEXT_PUBLIC_DEPLOY_API_KEY=fd010a122c7ea2e704b08ef353c741bba5fe9ffab17ee20a7a8082e696634b13

# Your deployed static site URL (optional - defaults to https://mymatrx.com)
NEXT_PUBLIC_STATIC_SITE_URL=https://mymatrx.com
```

## How to Use

1. **Open HTML Preview Modal**: Use any HTML generation feature that opens the HTML preview modal
2. **Navigate to Deploy Tab**: Click on the "Deploy" tab in the modal
3. **Test Connection**: Click "Test Connection" to verify your static site is accessible
4. **Fill Form**: 
   - Enter a page title (required)
   - Add a description (optional)
5. **Deploy**: Click "Deploy Page" to upload your HTML to the static site
6. **View Results**: 
   - Get a direct link to your deployed page
   - View the live page in an embedded iframe
   - Pages are deployed to `https://mymatrx.com/pages/{unique-id}`

## Features

- ✅ **Complete HTML Deployment**: Deploys fully self-contained HTML with embedded CSS
- ✅ **Live Preview**: View deployed pages in an iframe immediately after deployment
- ✅ **Error Handling**: Clear error messages for connection and deployment issues
- ✅ **Connection Testing**: Test your static site connection before deploying
- ✅ **Modern UI**: Beautiful, responsive interface with dark mode support
- ✅ **Direct Links**: Get shareable links to your deployed pages

## API Endpoints Required

Your static site needs these endpoints:

- `GET /api/test` - Connection test endpoint
- `POST /api/deploy-page` - Page deployment endpoint

## Security Notes

- The API key is stored in environment variables and not committed to git
- All deployments are authenticated with your custom API key
- Pages are deployed to a unique UUID-based path for security
- Consider adding rate limiting on your static site API endpoints

## Troubleshooting

1. **Connection Failed**: Check that your static site is deployed and accessible
2. **Deployment Failed**: Verify your API key is correct and matches the server configuration
3. **Environment Variables**: Make sure `.env.local` exists and contains the required variables
4. **CORS Issues**: Ensure your static site allows requests from your development domain

## File Structure

```
utils/
├── staticSiteAPI.js     # API client for static site communication
└── useStaticSite.js     # React hook for deployment state management

components/matrx/buttons/
└── HtmlPreviewModal.tsx # Modal with integrated deployment functionality
```
