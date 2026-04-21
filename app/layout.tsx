import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CloudflareAnalytics from "@/components/CloudflareAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.noviqlab.com"),
  title: {
    default: "NoviqLab — AI × DX × システム開発",
    template: "%s | NoviqLab",
  },
  description:
    "NoviqLab（ノヴィックラボ）は、AI技術の活用・DX支援・システム開発を手がける有志チーム。Less, but better. ブラウザ内で完結するプライバシー配慮型ツールを公開中。",
  keywords: [
    "AI",
    "DX",
    "システム開発",
    "画像変換",
    "画像リサイズ",
    "プライバシー",
    "Web制作",
    "NoviqLab",
  ],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://www.noviqlab.com",
    title: "NoviqLab — AI × DX × システム開発",
    description:
      "Less, but better. ブラウザ内で完結するプライバシー配慮型ツールを公開中。",
    siteName: "NoviqLab",
  },
  twitter: {
    card: "summary_large_image",
    title: "NoviqLab — AI × DX × システム開発",
    description:
      "Less, but better. ブラウザ内で完結するプライバシー配慮型ツールを公開中。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0b1120] text-slate-200">
        {children}
        <CloudflareAnalytics />
      </body>
    </html>
  );
}
