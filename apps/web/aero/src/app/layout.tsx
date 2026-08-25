import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import BackgroundArt from "./components/BackgroundArt";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#080b12",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://aerodeploy.app"),
  title: {
    default: "Aero — Turn Any Machine Into Your Own Cloud | Self-Hosted PaaS",
    template: "%s | Aero Self-Hosted PaaS",
  },
  description:
    "Deploy containers on any machine with zero cloud bills. Aero is a high-performance, self-hosted PaaS transforming local workstations, servers, and homelabs into private cloud infrastructure.",
  keywords: [
    "Self-Hosted PaaS",
    "PaaS Alternative",
    "Docker Deployment",
    "Private Cloud",
    "Homelab Server",
    "Traefik Reverse Proxy",
    "Zero Cloud Bills",
    "DevOps Automation",
    "Container Mesh",
    "Let's Encrypt Auto-SSL",
    "Bare Metal Cloud",
    "Heroku Alternative",
    "Render Alternative",
    "Railway Alternative",
  ],
  authors: [{ name: "Miskovy", url: "https://github.com/Miskovy" }],
  creator: "Miskovy",
  publisher: "Aero PaaS",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://aerodeploy.app",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aerodeploy.app",
    siteName: "Aero PaaS",
    title: "Aero — Your Hardware. Your Cloud.",
    description:
      "Deploy containers on any machine. Zero cloud bills. Full control over your infrastructure with private PaaS simplicity.",
    images: [
      {
        url: "/og-preview.svg",
        width: 1200,
        height: 630,
        alt: "Aero — Self-Hosted PaaS Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aero — Turn Any Machine Into Your Own Cloud",
    description:
      "High-performance self-hosted PaaS. Zero cloud bills, Docker native, auto-SSL, real-time logs.",
    creator: "@Miskovy",
    images: ["/og-preview.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  category: "technology",
};

// JSON-LD Schema.org Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "Aero PaaS",
      "operatingSystem": "Windows, macOS, Linux, Ubuntu, Docker",
      "applicationCategory": "DeveloperApplication",
      "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "USD",
      },
      "description":
        "High-performance self-hosted PaaS transforming any machine into private cloud infrastructure with one-click container deployments.",
      "url": "https://aerodeploy.app",
      "author": {
        "@type": "Person",
        "name": "Miskovy",
        "url": "https://github.com/Miskovy",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://aerodeploy.app/#website",
      "url": "https://aerodeploy.app",
      "name": "Aero PaaS",
      "description": "Turn any hardware or machine into a self-hosted cloud.",
      "publisher": {
        "@type": "Organization",
        "name": "Aero",
        "logo": {
          "@type": "ImageObject",
          "url": "https://aerodeploy.app/logo.svg",
        },
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} antialiased`}
    >
      <head>
        {/* JSON-LD Structured Metadata */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
