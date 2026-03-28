import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Akhil Saxena — Engineer · Photographer",
  description: "Personal portfolio of Akhil Saxena — Senior Software Engineer at Brevo, photographer capturing the world.",
  metadataBase: new URL("https://akhil-portfolio.pages.dev"),
  openGraph: {
    title: "Akhil Saxena — Engineer · Photographer",
    description: "Personal portfolio — Photography, Development, Resume.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Akhil Saxena — Engineer · Photographer",
    description: "Personal portfolio — Photography, Development, Resume.",
  },
};

const themeScript = `
  (function() {
    const saved = localStorage.getItem('theme');
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', saved || preferred);
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400&family=DM+Sans:wght@400;500;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
