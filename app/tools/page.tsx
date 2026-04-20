import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/tools/Breadcrumb";
import ToolCard from "@/components/tools/ToolCard";

export const metadata: Metadata = {
  title: "Tools | NoviqLab",
  description: "ブラウザ内で完結する開発者向けユーティリティツール集。",
};

const TOOLS = [
  {
    slug: "image-resizer",
    name: "Image Converter",
    icon: "🖼",
    description: "画像のリサイズ・形式変換。Web制作バッチ・容量自動調整対応。",
    tags: ["PNG", "JPEG", "WebP", "AVIF"],
  },
];

export default function ToolsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 w-full">
      <Breadcrumb
        items={[
          { label: "NoviqLab", href: "/" },
          { label: "Tools" },
        ]}
      />

      <h1 className="text-3xl font-bold text-white mt-6 mb-3">Tools</h1>
      <p className="text-white/60 text-base mb-10">
        ブラウザ内で完結する開発者向けユーティリティツール集。全て無料・サーバー送信なし。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.slug} {...tool} />
        ))}
      </div>

      <Link href="/" className="text-sm text-white/40 hover:text-white/70 transition-colors">
        ← NoviqLab トップへ戻る
      </Link>
    </main>
  );
}
