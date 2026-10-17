// The review surfaces' addresses. They live in the main app's workflow tree
// (/workflows/…); notifications link to the one-issue record page.

export const REVIEW_INBOX_HREF = "/workflows/review";

export function workflowReviewHref(definitionId: string): string {
  return `/workflows/${definitionId}/review`;
}

export function reviewIssueHref(definitionId: string, issueId: string): string {
  return `/workflows/${definitionId}/review/${issueId}`;
}
