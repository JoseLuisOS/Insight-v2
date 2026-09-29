import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Intersel Insight",
  description:
    "Plataforma multi-tenant para crear, visualizar y publicar dashboards.",
  // Icons come from the src/app/favicon.ico + icon.png file convention
  // (Next.js auto-generates the <link> tags for both) — no manual
  // metadata.icons here, that produced a duplicate/conflicting <link>
  // alongside the convention-based one.
};

// Runs before first paint: applies the stored theme (or the OS preference) so
// there is no light/dark flash. Keep the key in sync with theme-toggle.tsx.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("insight-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.classList.add(t)}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-MX"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
