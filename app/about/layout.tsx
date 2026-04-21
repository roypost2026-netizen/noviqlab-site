import { Metadata } from "next";

export const metadata: Metadata = {
  title: "運営理念",
  description:
    "Less, but better. NoviqLab は有志による少人数のチームで、ブラウザ内完結のプライバシー配慮型ツールを開発しています。",
  openGraph: {
    title: "運営理念 | NoviqLab",
    description:
      "Less, but better. NoviqLab は有志による少人数のチームで、ブラウザ内完結のプライバシー配慮型ツールを開発しています。",
    url: "https://www.noviqlab.com/about",
    siteName: "NoviqLab",
    type: "website",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
