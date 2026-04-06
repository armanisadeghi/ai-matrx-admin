// ThemeScript.tsx — Server component that injects an inline script
// Reads theme from localStorage/cookies before first paint to prevent FOUC
// Maintains static cacheability (the script runs client-side but the HTML is static)

export default function ThemeScript() {
  // This script runs before React hydration, reading the stored preference
  const themeScript = `
    (function() {
      try {
        var stored = localStorage.getItem('theme');
        if (!stored) {
          var cookies = document.cookie.split(';');
          for (var i = 0; i < cookies.length; i++) {
            var c = cookies[i].trim();
            if (c.startsWith('theme=')) {
              stored = c.substring(6);
              break;
            }
          }
        }
        if (stored === 'light') {
          document.documentElement.classList.remove('dark');
        } else if (stored === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          // System preference default
          if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            document.documentElement.classList.remove('dark');
          }
        }
      } catch(e) {}
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
      suppressHydrationWarning
    />
  );
}
