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
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
