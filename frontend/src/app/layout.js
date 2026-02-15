// filepath: c:\Projects\Life log\lifelog\src\app\layout.js

import "./globals.css";

export const metadata = {
  title: "Bruh LifeLog | AI Life Tracker",
  description: "Reflect, track, and grow with Bruh.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved or system theme before hydration to prevent flicker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  const t = localStorage.getItem('lifelog:theme');
                  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
