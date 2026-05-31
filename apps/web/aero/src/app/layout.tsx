import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

import BackgroundArt from "./components/BackgroundArt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Aero — Turn Any Machine Into Your Own Cloud",
  description:
    "Deploy anything, anywhere, with zero cloud bills. Aero is a high-performance self-hosted PaaS that transforms any machine into your private cloud.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
    >
      <head>
        {/* Force reload on back/forward navigation. Must run before
            React hydrates since the JS environment can be broken
            during back-navigation restoration. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                window.addEventListener('pageshow', function(e) {
                  if (e.persisted) {
                    window.location.reload();
                    return;
                  }
                  try {
                    var entries = performance.getEntriesByType('navigation');
                    if (entries.length > 0 && entries[0].type === 'back_forward') {
                      window.location.reload();
                    }
                  } catch(ex) {}
                });
              })();
            `,
          }}
        />
      </head>
      <body>
        <BackgroundArt />
        {children}
      </body>
    </html>
  );
}
