import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DaVinci AI - Voice Agent Dashboard",
  description: "Monitor your AI voice agents in real-time. Track performance, analyze sentiment, and optimize conversations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased bg-[#0a0a0a] text-white">
        {children}
      </body>
    </html>
  );
}
