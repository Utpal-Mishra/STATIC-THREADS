import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./style-studio.css";
import "./decision-lab.css";

export const metadata: Metadata = {
  title: "Static Threads",
  description: "Understand your wardrobe, build outfits and make smarter clothing purchases."
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#080b0d"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
