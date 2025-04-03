// app/(authenticated)/tests/google-apis/simple/layout.tsx
"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

export default function RootLayout({ children }) {
    return (
        <GoogleOAuthProvider clientId="34576215171-sf7s11b5v9i9djdlb6unqllrbe6lahk8.apps.googleusercontent.com">
            {children}
        </GoogleOAuthProvider>
    );
}
