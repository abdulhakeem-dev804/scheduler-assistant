import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scheduler Assistant",
  description: "A modern scheduling and productivity app with calendar, events, and Pomodoro timer",
  keywords: ["scheduler", "calendar", "productivity", "pomodoro", "events"],
  authors: [{ name: "Scheduler Team" }],
};

// Next.js 15+ requires viewport to be a separate export
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased dark`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
