import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PolyMind — Multi-LLM Validation Platform",
  description:
    "Send one prompt to multiple AI models simultaneously. See where they agree, where they disagree, and get a synthesized Chef answer with confidence scores.",
  openGraph: {
    title: "PolyMind",
    description: "Multi-LLM validation and intelligence platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
