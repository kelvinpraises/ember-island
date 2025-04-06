"use client";

import FramesSDK from "@farcaster/frame-sdk";
import localFont from "next/font/local";
import React, { useLayoutEffect } from "react";

import "@/styles/globals.css";

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
  useLayoutEffect(() => {
    const load = async () => {
      FramesSDK.actions.ready({
        disableNativeGestures: true,
      });
    };
    load();
  }, []);

  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={`antialiased ${disposabledroid.variable} flex justify-center`}
    >
      <body>{children}</body>
    </html>
  );
}
