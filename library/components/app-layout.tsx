"use client";

import "@/styles/globals.css";
import localFont from "next/font/local";

const disposabledroid = localFont({
  src: [
    {
      path: "../../public/fonts/disposabledroid-bb.regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/disposabledroid-bb.bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-disposabledroid",
});

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={`antialiased ${disposabledroid.variable} flex justify-center`}
    >
      <body>
        {children}
      </body>
    </html>
  );
}
