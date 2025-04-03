// app/(authenticated)/tests/google-apis/simple/page.tsx
"use client";

import { useGoogleLogin } from "@react-oauth/google";

export default function GoogleAccessPage() {
  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/drive",
    onSuccess: (tokenResponse) => {
      console.log("Token Response:", tokenResponse);
    },
    onError: () => {
      console.log("Login Failed");
    },
  });

  return (
    <button onClick={() => login()}>Sign in with Google 🚀</button>
  );
}

// https://accounts.google.com/signin/oauth/consent?authuser=0&part=AJi8hAPfTJ_wZPFa1d_S7qevP7_KJUjxCKtOVFSHhqPkhBo0o8ox1kzemjKqWKAxTD8Qh6ajXMnlr72a4SEMRGQ2TrNHmmf9V6gSUUWjf-GONkckzUKjQAnqUpmGj9dibScsV1Vlm2pZObqzBNfkqWkPeGFaekYmo8zl3zNs08QiiI-UtAQMXC5ZFeVW3gHDelXKJ9mj_7n7MmYbO17X_4rVr6xWLSCCqYECIwWutE73FRzrv41tw1ZmyJHBc2SZ3NxDh3gAHVk9eAlYH8-BsFH87uIZEo-RskFcfbIKUjTQROasiVT-Ir6AovXNJ4vezz6cdTk7-ldR1d4nQUT4Trswx2BrSQHQTQo96h3mlRX22QRCagfGmkD_FMpNwDlx6kWq0UIuglqiuRqseyOLTjQ1QKPp7Bnn5NWZMGcZ5bRZq6f9JP5V7YbKRNooJmtU-0mUF857itMw0WKv1ONO5UmEKrRvBchYEA&flowName=GeneralOAuthFlow&as=S690936107%3A1743649345750908&client_id=34576215171-sf7s11b5v9i9djdlb6unqllrbe6lahk8.apps.googleusercontent.com&pli=1&rapt=AEjHL4MTyoMq4AdAZLfB8AlpiDjJEj64Hy2QxGeZXW381QgjC62zcsotsLKjJ2WwEdToaXccXaZm467nS82AYqY3WtBZIp1l2w#