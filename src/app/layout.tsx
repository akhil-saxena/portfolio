import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Akhil Saxena — Interfaces & Imagery",
  description: "Building for the web. Photographing everything else. Portfolio of Akhil Saxena.",
  metadataBase: new URL("https://akhilsaxena.pages.dev"),
  openGraph: {
    title: "Akhil Saxena — Interfaces & Imagery",
    description: "Building for the web. Photographing everything else.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Akhil Saxena — Interfaces & Imagery",
    description: "Building for the web. Photographing everything else.",
  },
  alternates: {
    canonical: "https://akhilsaxena.pages.dev",
  },
};

const themeScript = `
  (function() {
    const saved = localStorage.getItem('theme');
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', saved || preferred);
  })();
`;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Akhil Saxena",
  jobTitle: "Senior Software Engineer",
  url: "https://akhilsaxena.pages.dev",
  sameAs: [
    "https://github.com/akhil-saxena",
    "https://www.linkedin.com/in/akhil-saxena",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preload" as="font" href="/fonts/dm-sans-400.woff2" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev" />
        <meta name="theme-color" content="#f5f0e8" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#141414" media="(prefers-color-scheme: dark)" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
