import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { SkipLink } from "@/components/ui/skip-link";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Spectra Gardens",
    template: "%s | Spectra Gardens",
  },
  description: "Explore villa layouts and floor plans at Spectra Gardens.",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbfaf7",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
