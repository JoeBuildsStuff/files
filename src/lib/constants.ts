import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Files",
  description:
    "Useing supabase to Manager your files",
  keywords: [
    "supabase",
    "files",
    "storage",
    "management",
    "storage",
  ],
  authors: [{ name: "Files Team" }],
  openGraph: {
    title: "Files: Your File Management Solution",
    description:
      "Experience seamless audio transcription with AI. Get accurate text from your audio files in no time.",
    url: "https://files.com",
    siteName: "Files",
    images: [
      {
        url: "https://files.com/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Files Service Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Files: Your File Management Solution",
    description:
      "Convert your audio files to text with our advanced AI transcription service.",
    creator: "@files",
    images: ["https://files.com/twitter-image.jpg"],
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
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    // apple: '/apple-touch-icon.png',
  },
  other: {
    "application-name": "Files",
  },
};
