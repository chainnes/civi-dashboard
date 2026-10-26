import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Civi — Community Intelligence Hub",
  description: "What's happening near you, across the Philippines, in one place. Internal preview — the public site is the static landing page.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="grid-veil font-sans text-canopy-50 antialiased">{children}</body>
    </html>
  );
}
