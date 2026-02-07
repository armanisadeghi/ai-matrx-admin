# Tasks

## 1. Token Management
- [ ] When the token expires, but the system knows it's a valid user, then it needs to refresh automatically and silently.
    - Currently, the user is getting logged out and then we are getting this in the console:
    Console AuthApiError
Invalid Refresh Token: Session Expired (Revoked by Newer Login)
Call Stack
5

Hide 5 ignore-listed frame(s)
handleError
node_modules/.pnpm/@supabase+auth-js@2.93.1/node_modules/@supabase/auth-js/src/lib/fetch.ts (102:9)
async _handleRequest
node_modules/.pnpm/@supabase+auth-js@2.93.1/node_modules/@supabase/auth-js/src/lib/fetch.ts (195:5)
async _request
node_modules/.pnpm/@supabase+auth-js@2.93.1/node_modules/@supabase/auth-js/src/lib/fetch.ts (157:16)
async
node_modules/.pnpm/@supabase+auth-js@2.93.1/node_modules/@supabase/auth-js/src/GoTrueClient.ts (2497:18)
async
node_modules/.pnpm/@supabase+auth-js@2.93.1/node_modules/@supabase/auth-js/src/lib/helpers.ts (232:26)

## 2. Prompt BUilder Editor for system message having issues where it moves the ui as you type and it goes out of view.

The bug is related to the code that starts here:
- app/(authenticated)/ai/prompts/edit/[id]/page.tsx

In order to understand this bug, you must understand the way the ui works in Edit mode.

We have a left side to the page and that's the side we're focused on for this.

The left side has a scrolling container that starts at the top, above the ai model selection and then it includes settings, variables, a system prompts and then user/assistant messages. The system prompt is typically 3-6 full pages of text. Therefore, the container nearly always has to scroll to show the bottom of the system prompt.

We have worked very hard and resolved 95% of the auto-scrolling issues. The only remaining issue is that when the user is typing in the system prompt, the ui moves as they type and it goes out of view. This is very frustrating for the user. This is especially true when the user is trying to edit the last few lines of the system prompt.

The most important thing is that we cannot allow the browser to automatically scroll as the user types because instead of scrolling to where the user is actually typing, it's scrolling to put the top of the system prompt in view, but this is 3-4 pages of scrolling above from where the user is typing. This makes it impossible to type because every few characters causes the ui to scroll up 3-4 pages. It could have something to do with saving behavior, refreshes or something else.

## 3. User "Submit Feedback" - method to get and fix things 

- components/layout/FeedbackButton.tsx
