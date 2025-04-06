import AppLayout from "../library/components/app-layout";
import { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const appUrl = process.env.NEXT_PUBLIC_URL;

if (!appUrl) {
  throw new Error("NEXT_PUBLIC_URL is not set");
}
const frame = {
  version: "next",
  imageUrl: `${appUrl}/images/frame-image.png`,
  button: {
    title: "Ember Island",
    action: {
      type: "launch_frame",
      name: "Dance with Fire",
      url: `${appUrl}`,
      splashImageUrl: `${appUrl}/images/frame-image.png`,
      splashBackgroundColor: "#27213C",
    },
  },
};

export const metadata: Metadata = {
  title: "Stoke Fire",
  description: "Grow your village onchain and stoke the fire.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stoke Fire",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [
      { url: "/images/icon.png", sizes: "180x180", type: "image/png" },
      { url: "/images/icon.png", sizes: "152x152", type: "image/png" },
      { url: "/images/icon.png", sizes: "120x120", type: "image/png" },
      { url: "/images/icon.png", sizes: "76x76", type: "image/png" },
      { url: "/images/icon.png", sizes: "60x60", type: "image/png" },
    ],
  },
  other: {
    "fc:frame": JSON.stringify(frame),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppLayout>{children}</AppLayout>;
}
