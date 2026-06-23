import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// The printed-resume serif. Drives the HTML preview surface; the PDF registers the
// matching static TTFs (lib/render/pdf-fonts.ts) under the same family name.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const APP_NAME = "Resume Reformatter";
const APP_DESCRIPTION = "Tailor your resume to any job, privately.";

// The colocated app/icon, app/apple-icon, app/opengraph-image and app/twitter-image files wire
// up the favicon, app icon and social-preview image automatically. `metadataBase` lets Next
// resolve those into absolute URLs for OG/Twitter cards.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
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
      className={`${inter.variable} ${jetBrainsMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-body font-sans">
        {children}
      </body>
    </html>
  );
}
