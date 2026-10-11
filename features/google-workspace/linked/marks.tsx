/** Google Sheets / Docs file marks — the shapes people recognise on sight. */

export function GoogleSheetsMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#0F9D58" />
      <path d="M14 2v6h6z" fill="#87CEAC" />
      <path d="M7.5 11h9v7h-9zm1.2 1.2v1.7h2.7v-1.7zm3.9 0v1.7h2.7v-1.7zm-3.9 2.9v1.7h2.7v-1.7zm3.9 0v1.7h2.7v-1.7z" fill="#fff" />
    </svg>
  );
}

export function GoogleDocsMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#4285F4" />
      <path d="M14 2v6h6z" fill="#A1C2FA" />
      <path d="M8 11.5h8v1.2H8zm0 2.6h8v1.2H8zm0 2.6h5.5v1.2H8z" fill="#fff" />
    </svg>
  );
}
